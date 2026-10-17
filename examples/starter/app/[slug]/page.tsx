import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { collectHeadings, NotionRenderer } from "notionic"

import { getPost, getPosts, notionFileUrl, postHref } from "@/lib/notion"
import { notionComponents } from "@/lib/notion-components"
import { formatDate } from "@/lib/utils"

// Built ahead of time, and rebuilt in the background at most once an hour.
export const revalidate = 3600

type Props = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return (await getPosts()).map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = (await getPosts()).find((p) => p.slug === slug)
  if (!post) return {}
  return {
    title: post.title,
    description: post.description || undefined,
    openGraph: { title: post.title, type: "article" },
  }
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params
  const [posts, result] = await Promise.all([getPosts(), getPost(slug)])
  if (!result) notFound()
  const { post, page, blocks } = result

  // Top-level headings, for the outline beside the post on wide screens.
  const outline = collectHeadings(blocks).filter((h) => h.level <= 2)

  return (
    <div className="mx-auto flex max-w-5xl gap-10 px-4 py-12">
      <main className="mx-auto max-w-3xl min-w-0 flex-1">
        <header className="mb-10 flex flex-col gap-2">
          {post.date ? (
            <time
              dateTime={post.date}
              className="text-sm text-muted-foreground"
            >
              {formatDate(post.date)}
            </time>
          ) : null}
          <h1 className="text-3xl font-semibold tracking-tight text-balance">
            {page.icon?.type === "emoji" ? (
              <span aria-hidden="true" className="mr-2">
                {page.icon.emoji}
              </span>
            ) : null}
            {page.title}
          </h1>
          {post.description ? (
            <p className="text-lg text-pretty text-muted-foreground">
              {post.description}
            </p>
          ) : null}
        </header>

        <NotionRenderer
          blocks={blocks}
          components={notionComponents}
          pageHref={postHref(posts)}
          transformFileUrl={notionFileUrl}
        />
      </main>

      {outline.length > 1 ? (
        <aside className="hidden w-48 shrink-0 xl:block">
          <nav
            aria-label="On this page"
            className="sticky top-8 flex flex-col gap-2 text-sm"
          >
            <p className="font-medium">On this page</p>
            <ul className="flex flex-col gap-1.5">
              {outline.map((heading) => (
                <li
                  key={heading.blockId}
                  className={heading.level === 2 ? "pl-3" : undefined}
                >
                  <a
                    href={`#${heading.id}`}
                    className="rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {heading.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      ) : null}
    </div>
  )
}
