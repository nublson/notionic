import type { Metadata } from "next";
import { ChevronDownIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { collectHeadings, NotionRenderer } from "notionic";
import { SiteHeader } from "@/components/site-header";
import { docsPageHref, getDoc, getDocs, groupBySection, type DocSummary } from "@/lib/docs";
import { demos } from "@/lib/demos";
import { notionComponents, notionFileUrl } from "@/lib/notion-components";
import { docStructuredData, JsonLd } from "@/lib/structured-data";
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
    alternates: {
      canonical: `/docs/${doc.slug}`,
      types: { "text/markdown": `/docs/${doc.slug}.md` },
    },
    openGraph: { title: doc.title, description, url: `/docs/${doc.slug}`, type: "article" },
  };
}

const FOCUS =
  "rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

// Rendered twice (the desktop column and the mobile menu), so `idPrefix` keeps
// the section labels' ids unique.
function Sidebar({
  docs,
  current,
  idPrefix,
}: {
  docs: DocSummary[];
  current: string;
  idPrefix: string;
}) {
  return (
    <nav aria-label="Docs" className="flex flex-col gap-6 text-sm">
      {groupBySection(docs).map(([section, items], index) => (
        // A label rather than a heading, so the page's outline starts at its h1.
        <div key={section} className="flex flex-col gap-2">
          <p id={`${idPrefix}-${index}`} className="font-medium">
            {section}
          </p>
          <ul
            aria-labelledby={`${idPrefix}-${index}`}
            className="flex flex-col gap-1.5 border-l border-border"
          >
            {items.map((doc) => (
              <li key={doc.id}>
                <Link
                  href={`/docs/${doc.slug}`}
                  aria-current={doc.slug === current ? "page" : undefined}
                  className={cn(
                    FOCUS,
                    "relative block pl-3 text-muted-foreground transition-colors hover:text-foreground",
                    // The marker is its own straight line over the rail: a border
                    // on the link would bend around its focus-ring corners.
                    "before:absolute before:inset-y-0 before:-left-px before:w-px aria-[current=page]:font-medium aria-[current=page]:text-foreground aria-[current=page]:before:bg-foreground",
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
      <JsonLd data={docStructuredData(doc)} />
      <SiteHeader />
      <div className="flex gap-10 py-10">
        <aside className="hidden w-52 shrink-0 md:block">
          {/* Scrolls on its own when taller than the screen; faded edges show there is more, and the 4px inset keeps focus rings clear of the scroll box. */}
          <div className="sticky top-8 -m-1 max-h-[calc(100svh-4rem)] scroll-fade-y overflow-y-auto p-1">
            <Sidebar docs={docs} current={slug} idPrefix="sidebar" />
          </div>
        </aside>

        <main id="main" className="min-w-0 flex-1">
          {/* On small screens, the sidebar folds into a menu above the page. */}
          {/* Opens and closes like Notion toggles (notionic's DISCLOSURE_CLASSES):
              200ms grow and fade, only the fade with reduced motion. */}
          <details className="group mb-8 rounded-lg border border-border [interpolate-size:allow-keywords] details-content:h-0 details-content:overflow-y-clip details-content:opacity-0 details-content:transition-[height,opacity,content-visibility] details-content:transition-discrete details-content:duration-200 details-content:ease-[cubic-bezier(0.23,1,0.32,1)] open:details-content:h-auto open:details-content:opacity-100 motion-reduce:details-content:transition-[opacity,content-visibility] md:hidden">
            {/* The whole row is the target, with a chevron like Notion toggles. */}
            <summary
              className={cn(
                FOCUS,
                "flex cursor-pointer list-none items-center justify-between rounded-lg px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden",
              )}
            >
              Docs menu
              <ChevronDownIcon
                aria-hidden="true"
                className="size-4 text-muted-foreground transition-transform duration-150 ease-out group-open:rotate-180 motion-reduce:transition-none"
              />
            </summary>
            <div className="px-4 pb-4">
              <Sidebar docs={docs} current={slug} idPrefix="menu" />
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
            demos={demos}
            linkFavicons
          />

          <nav aria-label="Previous and next" className="mt-16 grid grid-cols-2 gap-4 text-sm">
            {previous ? (
              <Link
                href={`/docs/${previous.slug}`}
                className={cn(FOCUS, "group/link flex flex-col gap-1")}
              >
                <span className="text-muted-foreground">Previous</span>
                <span className="font-medium underline-offset-4 group-hover/link:underline">
                  {previous.title}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                href={`/docs/${next.slug}`}
                className={cn(FOCUS, "group/link flex flex-col items-end gap-1 text-right")}
              >
                <span className="text-muted-foreground">Next</span>
                <span className="font-medium underline-offset-4 group-hover/link:underline">
                  {next.title}
                </span>
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
