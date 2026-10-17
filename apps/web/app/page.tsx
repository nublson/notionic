import { Client } from "@notionhq/client";
import { NotionRenderer, type NotionBlock } from "notionic";
import { fetchBlocks } from "notionic/fetch";
import { SiteHeader } from "@/components/site-header";
import { buttonVariants } from "@/components/ui/button";
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
} from "@/components/ui/code-block";
import { cn } from "@/lib/utils";
import { notionComponents, notionFileUrl } from "@/lib/notion-components";
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
async function getBlocks(): Promise<{ blocks: NotionBlock[]; live: boolean }> {
  const token = process.env.NOTION_TOKEN;
  const pageId = process.env.NOTION_PAGE_ID;
  if (!token || !pageId) return { blocks: sampleBlocks, live: false };
  try {
    return { blocks: await fetchBlocks(new Client({ auth: token }), pageId), live: true };
  } catch (error) {
    console.error("Could not fetch the Notion page; showing sample blocks.", error);
    return { blocks: sampleBlocks, live: false };
  }
}

export default async function Home() {
  const { blocks, live } = await getBlocks();
  return (
    <div className="mx-auto flex min-h-svh max-w-3xl flex-col px-4">
      <SiteHeader />

      <main className="flex-1">
        <section className="flex flex-col gap-6 py-16 sm:py-24">
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Notion pages, rendered as React Server Components
          </h1>
          <p className="max-w-xl text-lg text-pretty text-muted-foreground">
            Use Notion as your CMS. notionic renders blocks from the official
            Notion API on the server, styled with Tailwind CSS and shadcn/ui.
          </p>
          <CodeBlock className="max-w-md">
            <CodeBlockActions>
              <CodeBlockCopyButton value={INSTALL} />
            </CodeBlockActions>
            <CodeBlockContent aria-label="Install command" className="pr-12">
              {INSTALL}
            </CodeBlockContent>
          </CodeBlock>
          <div className="flex flex-wrap gap-3">
            <a href="/docs" className={cn(buttonVariants({ size: "lg" }), "px-4")}>
              Read the docs
            </a>
            <a
              href="https://github.com/nublson/notionic"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "px-4")}
            >
              View on GitHub
            </a>
          </div>
        </section>

        <section aria-labelledby="live-from-notion" className="border-t border-border py-12">
          <p
            id="live-from-notion"
            className="mb-8 flex items-center gap-2 text-sm font-medium text-muted-foreground"
          >
            <span
              aria-hidden="true"
              className={cn("size-2 rounded-full", live ? "bg-emerald-500" : "bg-muted-foreground/50")}
            />
            {live ? "Live from Notion" : "Sample blocks"}
          </p>
          <NotionRenderer
            blocks={blocks}
            components={notionComponents}
            transformFileUrl={notionFileUrl}
          />
        </section>
      </main>

      <footer className="flex items-center justify-between border-t border-border py-6 text-sm text-muted-foreground">
        <span>MIT License</span>
        <span>Built with notionic</span>
      </footer>
    </div>
  );
}
