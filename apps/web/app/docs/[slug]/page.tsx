import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { collectHeadings, NotionRenderer } from "notionic";
import { SiteHeader } from "@/components/site-header";
import { docsPageHref, getDoc, getDocs, groupBySection, type DocSummary } from "@/lib/docs";
import { notionComponents, notionFileUrl } from "@/lib/notion-components";
import { cn } from "@/lib/utils";

// Built ahead of time, and rebuilt in the background at most once an hour.
export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getDocs()).map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const doc = (await getDocs()).find((d) => d.slug === slug);
  if (!doc) return {};
  const description = doc.description || undefined;
  return {
    title: doc.title,
    description,
    alternates: { canonical: `/docs/${doc.slug}` },
    openGraph: { title: doc.title, description, url: `/docs/${doc.slug}`, type: "article" },
  };
}

const FOCUS =
  "rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function Sidebar({ docs, current }: { docs: DocSummary[]; current: string }) {
  return (
    <nav aria-label="Docs" className="flex flex-col gap-6 text-sm">
      {groupBySection(docs).map(([section, items]) => (
        <div key={section} className="flex flex-col gap-2">
          <h2 className="font-medium">{section}</h2>
          <ul className="flex flex-col gap-1.5 border-l border-border">
            {items.map((doc) => (
              <li key={doc.id}>
                <Link
                  href={`/docs/${doc.slug}`}
                  aria-current={doc.slug === current ? "page" : undefined}
                  className={cn(
                    FOCUS,
                    "-ml-px block border-l border-transparent pl-3 text-muted-foreground transition-colors hover:text-foreground",
                    "aria-[current=page]:border-foreground aria-[current=page]:font-medium aria-[current=page]:text-foreground",
                  )}
                >
                  {doc.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export default async function DocPage({ params }: Props) {
  const { slug } = await params;
  const [docs, result] = await Promise.all([getDocs(), getDoc(slug)]);
  if (!result) notFound();
  const { doc, page, blocks } = result;

  const outline = collectHeadings(blocks).filter((heading) => heading.level <= 2);
  const index = docs.findIndex((d) => d.slug === slug);
  const previous = docs[index - 1];
  const next = docs[index + 1];

  return (
    <div className="mx-auto max-w-6xl px-4">
      <SiteHeader />
      <div className="flex gap-10 py-10">
        <aside className="hidden w-52 shrink-0 md:block">
          <div className="sticky top-8">
            <Sidebar docs={docs} current={slug} />
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          {/* On small screens, the sidebar folds into a menu above the page. */}
          <details className="mb-8 rounded-lg border border-border px-4 py-3 md:hidden">
            <summary className="cursor-pointer text-sm font-medium">Docs menu</summary>
            <div className="mt-4">
              <Sidebar docs={docs} current={slug} />
            </div>
          </details>

          <header className="mb-10 flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">{doc.section}</p>
            <h1 className="text-3xl font-semibold tracking-tight text-balance">
              {page.icon?.type === "emoji" ? (
                <span aria-hidden="true" className="mr-2">
                  {page.icon.emoji}
                </span>
              ) : null}
              {page.title}
            </h1>
            {doc.description ? (
              <p className="text-lg text-pretty text-muted-foreground">{doc.description}</p>
            ) : null}
          </header>

          <NotionRenderer
            blocks={blocks}
            components={notionComponents}
            pageHref={docsPageHref(docs)}
            transformFileUrl={notionFileUrl}
          />

          <nav
            aria-label="Previous and next"
            className="mt-16 grid grid-cols-2 gap-4 border-t border-border pt-6 text-sm"
          >
            {previous ? (
              <Link href={`/docs/${previous.slug}`} className={cn(FOCUS, "flex flex-col gap-1")}>
                <span className="text-muted-foreground">Previous</span>
                <span className="font-medium">{previous.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                href={`/docs/${next.slug}`}
                className={cn(FOCUS, "flex flex-col items-end gap-1 text-right")}
              >
                <span className="text-muted-foreground">Next</span>
                <span className="font-medium">{next.title}</span>
              </Link>
            ) : null}
          </nav>
        </main>

        {outline.length > 1 ? (
          <aside className="hidden w-48 shrink-0 xl:block">
            <nav aria-label="On this page" className="sticky top-8 flex flex-col gap-2 text-sm">
              <p className="font-medium">On this page</p>
              <ul className="flex flex-col gap-1.5">
                {outline.map((heading) => (
                  <li key={heading.blockId} className={heading.level === 2 ? "pl-3" : undefined}>
                    <a
                      href={`#${heading.id}`}
                      className={cn(FOCUS, "text-muted-foreground hover:text-foreground")}
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
    </div>
  );
}
