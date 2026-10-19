import { NotionRenderer, type NotionBlock } from "notionic";
import { fetchBlocks } from "notionic/fetch";
import { SiteHeader } from "@/components/site-header";
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
} from "@/components/ui/code-block";
import { notionClient } from "@/lib/notion";
import { demos } from "@/lib/demos";
import { notionComponents, notionFileUrl } from "@/lib/notion-components";
import { SITE_AUTHOR } from "@/lib/site";
import { homeStructuredData, JsonLd } from "@/lib/structured-data";
import { sampleBlocks } from "./sample-blocks";

// The page is cached and rebuilt in the background at most once an hour, so
// visits don't call the Notion API (about 3 requests a second on average).
export const revalidate = 3600;

const INSTALL = "pnpm add notionic @notionhq/client";

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
    return await fetchBlocks(client, pageId);
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
        <section className="py-16 sm:py-24">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            <span className="block">Write in Notion.</span>
            <span className="block">Ship it as React.</span>
          </h1>
          <p className="mt-4 max-w-md text-lg text-pretty text-muted-foreground">
            Notion pages as React Server Components, styled with your shadcn/ui theme.
          </p>
          <CodeBlock className="mt-10 max-w-md">
            {/* Always shown: copying the command is the page's first action. */}
            <CodeBlockActions className="[[data-slot=code-block]>&]:opacity-100">
              <CodeBlockCopyButton value={INSTALL} />
            </CodeBlockActions>
            <CodeBlockContent aria-label="Install command" className="pr-10">
              {INSTALL}
            </CodeBlockContent>
          </CodeBlock>
          <a
            href="/docs"
            className="group mt-6 inline-flex items-center gap-1 rounded-sm text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Read the docs
            <span
              aria-hidden="true"
              className="transition-transform duration-150 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none"
            >
              →
            </span>
          </a>
        </section>

        <section className="pb-16">
          <NotionRenderer
            blocks={blocks}
            components={notionComponents}
            transformFileUrl={notionFileUrl}
            demos={demos}
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
