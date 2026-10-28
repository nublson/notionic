import { NotionRenderer, type NotionBlock } from "notionic";
import { fetchBlocks } from "notionic/fetch";
import { SiteHeader } from "@/components/site-header";
import { Hero } from "@/components/hero";
import { notionClient } from "@/lib/notion";
import { demos } from "@/lib/demos";
import { notionComponents, notionFileUrl } from "@/lib/notion-components";
import { SITE_AUTHOR } from "@/lib/site";
import { homeStructuredData, JsonLd } from "@/lib/structured-data";
import { sampleBlocks } from "./sample-blocks";

// The page is cached and rebuilt in the background at most once an hour, so
// visits don't call the Notion API (about 3 requests a second on average).
export const revalidate = 3600;

/**
 * The Notion page in NOTION_PAGE_ID, or sample blocks without NOTION_TOKEN
 * (local development, forks) or when Notion can't be reached, so the site
 * never fails on Notion.
 */
async function getBlocks(): Promise<NotionBlock[]> {
  const client = notionClient();
  const pageId = process.env.NOTION_PAGE_ID;
  if (!client || !pageId) return sampleBlocks;
  try {
    return await fetchBlocks(client, pageId, { linkFavicons: true });
  } catch (error) {
    console.error("Could not fetch the Notion page; showing sample blocks.", error);
    return sampleBlocks;
  }
}

export default async function Home() {
  const blocks = await getBlocks();
  return (
    <div className="mx-auto flex min-h-svh max-w-3xl flex-col px-4">
      <JsonLd data={homeStructuredData} />
      <SiteHeader />

      <main id="main" className="flex-1">
        <Hero />

        <section className="pb-16">
          <NotionRenderer
            blocks={blocks}
            components={notionComponents}
            transformFileUrl={notionFileUrl}
            demos={demos}
            linkFavicons
          />
        </section>
      </main>

      <footer className="flex items-center justify-between py-10 text-sm text-muted-foreground">
        <span>MIT License</span>
        {SITE_AUTHOR ? (
          <span>
            by{" "}
            {SITE_AUTHOR.url ? (
              <a
                href={SITE_AUTHOR.url}
                className="rounded-sm transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {SITE_AUTHOR.name}
              </a>
            ) : (
              SITE_AUTHOR.name
            )}
          </span>
        ) : null}
      </footer>
    </div>
  );
}
