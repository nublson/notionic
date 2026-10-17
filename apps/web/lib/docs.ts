import "server-only";

import { Client, collectPaginatedAPI, isFullPage, type PageObjectResponse } from "@notionhq/client";
import { normalizePageId, pageTitle, plainText } from "notionic";
import { fetchPage } from "notionic/fetch";
import { cache } from "react";

/**
 * The docs live in a Notion database (NOTION_DOCS_DATA_SOURCE_ID): one page
 * per doc, with
 * - Name (title): the doc's title
 * - Slug (text): its URL, /docs/<slug>
 * - Section (select): its group in the sidebar
 * - Order (number): its position in the section
 * - Description (text): the subtitle and meta description
 * - Published (checkbox): only published docs appear
 */

/** Sidebar groups, in order. Docs in other sections come last. */
const SECTIONS = ["Getting started", "Guides", "Reference", "Registry"];

export type DocSummary = {
  /** The page id, 32 hex characters without dashes. */
  id: string;
  slug: string;
  title: string;
  section: string;
  order: number;
  description: string;
};

function config() {
  const token = process.env.NOTION_TOKEN;
  const dataSourceId = process.env.NOTION_DOCS_DATA_SOURCE_ID;
  return token && dataSourceId ? { client: new Client({ auth: token }), dataSourceId } : null;
}

function text(page: PageObjectResponse, name: string): string {
  const property = page.properties[name];
  return property?.type === "rich_text" ? plainText(property.rich_text).trim() : "";
}

function toSummary(page: PageObjectResponse): DocSummary {
  const section = page.properties.Section;
  const order = page.properties.Order;
  return {
    id: normalizePageId(page.id),
    slug: text(page, "Slug").toLowerCase(),
    title: pageTitle(page).trim(),
    section: section?.type === "select" ? (section.select?.name ?? "") : "",
    order: order?.type === "number" ? (order.number ?? 0) : 0,
    description: text(page, "Description"),
  };
}

function rank(section: string): number {
  const index = SECTIONS.indexOf(section);
  return index === -1 ? SECTIONS.length : index;
}

/** Published docs with a slug, in sidebar order. Empty when the docs aren't configured. */
export const getDocs = cache(async (): Promise<DocSummary[]> => {
  const notion = config();
  if (!notion) return [];
  const pages = await collectPaginatedAPI(notion.client.dataSources.query, {
    data_source_id: notion.dataSourceId,
    filter: { property: "Published", checkbox: { equals: true } },
  });
  return pages
    .filter(isFullPage)
    .map(toSummary)
    .filter((doc) => doc.slug)
    .sort((a, b) => rank(a.section) - rank(b.section) || a.order - b.order);
});

/** One doc with its page and blocks, or null when it doesn't exist or isn't published. */
export const getDoc = cache(async (slug: string) => {
  const notion = config();
  const doc = (await getDocs()).find((d) => d.slug === slug);
  if (!notion || !doc) return null;
  return { doc, ...(await fetchPage(notion.client, doc.id)) };
});

/** Links to published docs stay on the site; other Notion pages render as text. */
export function docsPageHref(docs: DocSummary[]) {
  const paths = new Map(docs.map((doc) => [doc.id, `/docs/${doc.slug}`]));
  return (pageId: string) => paths.get(pageId) ?? null;
}

/** Docs grouped by section, in sidebar order. */
export function groupBySection(docs: DocSummary[]) {
  const groups = new Map<string, DocSummary[]>();
  for (const doc of docs) {
    const key = doc.section || "Other";
    groups.set(key, [...(groups.get(key) ?? []), doc]);
  }
  return [...groups];
}
