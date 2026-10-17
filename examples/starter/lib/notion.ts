import "server-only"

import {
  Client,
  collectPaginatedAPI,
  isFullPage,
  type PageObjectResponse,
} from "@notionhq/client"
import { normalizePageId, pageTitle, plainText } from "notionic"
import { fetchPage } from "notionic/fetch"
import { cache } from "react"

/**
 * The site's content is one Notion database (NOTION_DATABASE_ID), one page
 * per post, with these properties:
 * - Name (title): the post's title
 * - Slug (text): its URL, /<slug>
 * - Published (checkbox): only published posts appear
 * - Description (text): shown in the list and as the meta description
 * - Date (date): the post's date; the list is newest first
 */

export type Post = {
  /** The page id, 32 hex characters without dashes. */
  id: string
  slug: string
  title: string
  description: string
  /** The Date property's start (YYYY-MM-DD), or null when it's empty. */
  date: string | null
}

let client: { token: string; api: Client } | null = null

/**
 * The Notion client, or null without NOTION_TOKEN.
 *
 * Builds fetch every post at once, which can hit Notion's rate limit (429
 * with retry-after). The client waits and retries 8 times instead of 2.
 */
export function notionClient(): Client | null {
  const token = process.env.NOTION_TOKEN
  if (!token) return null
  if (client?.token !== token) {
    client = {
      token,
      api: new Client({ auth: token, retry: { maxRetries: 8 } }),
    }
  }
  return client.api
}

/**
 * The database's data source, which is what Notion queries. A database made
 * in Notion's UI has exactly one; with several, the first is used.
 */
const getDataSourceId = cache(async (notion: Client, databaseId: string) => {
  const database = await notion.databases.retrieve({ database_id: databaseId })
  const dataSource =
    "data_sources" in database ? database.data_sources[0] : undefined
  if (!dataSource) {
    throw new Error(`Notion database ${databaseId} has no data source`)
  }
  return dataSource.id
})

function text(page: PageObjectResponse, name: string): string {
  const property = page.properties[name]
  return property?.type === "rich_text"
    ? plainText(property.rich_text).trim()
    : ""
}

function toPost(page: PageObjectResponse): Post {
  const date = page.properties.Date
  return {
    id: normalizePageId(page.id),
    slug: text(page, "Slug").toLowerCase(),
    title: pageTitle(page).trim(),
    description: text(page, "Description"),
    date: date?.type === "date" ? (date.date?.start ?? null) : null,
  }
}

/**
 * Published posts with a slug, newest first. Empty when NOTION_TOKEN or
 * NOTION_DATABASE_ID isn't set, so the site still builds without them.
 */
export const getPosts = cache(async (): Promise<Post[]> => {
  const notion = notionClient()
  const databaseId = process.env.NOTION_DATABASE_ID
  if (!notion || !databaseId) return []

  const pages = await collectPaginatedAPI(notion.dataSources.query, {
    data_source_id: await getDataSourceId(notion, databaseId),
    filter: { property: "Published", checkbox: { equals: true } },
    sorts: [{ property: "Date", direction: "descending" }],
  })
  return pages
    .filter(isFullPage)
    .map(toPost)
    .filter((post) => post.slug)
})

/** One post with its page and blocks, or null when it isn't published. */
export const getPost = cache(async (slug: string) => {
  const notion = notionClient()
  const post = (await getPosts()).find((p) => p.slug === slug)
  if (!notion || !post) return null
  return { post, ...(await fetchPage(notion, post.id)) }
})

/** Links to published posts stay on the site; other Notion pages render as text. */
export function postHref(posts: Post[]) {
  const paths = new Map(posts.map((post) => [post.id, `/${post.slug}`]))
  return (pageId: string) => paths.get(pageId) ?? null
}

/**
 * Files uploaded to Notion go through the file route, which re-signs their
 * URLs (Notion's expire after an hour, longer than pages are cached).
 */
export function notionFileUrl({ blockId }: { blockId: string }) {
  return `/api/notion/file/${blockId}`
}
