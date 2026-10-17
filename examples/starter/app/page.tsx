import Link from "next/link"

import { getPosts } from "@/lib/notion"
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site"
import { formatDate } from "@/lib/utils"

// Built ahead of time, and rebuilt in the background at most once an hour.
export const revalidate = 3600

export default async function HomePage() {
  const posts = await getPosts()

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <header className="mb-10 flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{SITE_NAME}</h1>
        <p className="text-lg text-muted-foreground">{SITE_DESCRIPTION}</p>
      </header>

      {posts.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
          No posts yet. Set NOTION_TOKEN and NOTION_DATABASE_ID, then check
          Published and fill in Slug on a page of your database.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {posts.map((post) => (
            <li key={post.id}>
              <Link
                href={`/${post.slug}`}
                className="group flex flex-col gap-1 rounded-sm py-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {post.date ? (
                  <time
                    dateTime={post.date}
                    className="text-sm text-muted-foreground"
                  >
                    {formatDate(post.date)}
                  </time>
                ) : null}
                <h2 className="text-lg font-medium group-hover:underline">
                  {post.title}
                </h2>
                {post.description ? (
                  <p className="text-pretty text-muted-foreground">
                    {post.description}
                  </p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
