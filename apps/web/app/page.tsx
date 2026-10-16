import { Client } from "@notionhq/client";
import Link from "next/link";
import { NotionRenderer, type NotionBlock } from "notionic";
import { fetchBlocks } from "notionic/fetch";
import { NotionCallout } from "@/registry/notionic/notion-callout";
import { NotionCode } from "@/registry/notionic/notion-code";
import { NotionTable } from "@/registry/notionic/notion-table";
import { NotionToggle } from "@/registry/notionic/notion-toggle";
import { sampleBlocks } from "./sample-blocks";

// The shadcn/ui versions from notionic's registry.
const components = {
  code: NotionCode,
  callout: NotionCallout,
  table: NotionTable,
  toggle: NotionToggle,
};

// Rendered on each request, so a Notion page shows its latest content.
export const dynamic = "force-dynamic";

/** The page in NOTION_PAGE_ID when NOTION_TOKEN is set, otherwise sample blocks. */
async function getBlocks(): Promise<{ blocks: NotionBlock[]; source: string }> {
  const token = process.env.NOTION_TOKEN;
  const pageId = process.env.NOTION_PAGE_ID;
  if (!token || !pageId) return { blocks: sampleBlocks, source: "sample blocks" };
  const blocks = await fetchBlocks(new Client({ auth: token }), pageId);
  return { blocks, source: `Notion page ${pageId}` };
}

export default async function Home() {
  const { blocks, source } = await getBlocks();
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-4xl font-bold tracking-tight">notionic</h1>
      <p className="mt-2 text-muted-foreground">
        Rendering {source}.{" "}
        <Link href="/changelog" className="underline underline-offset-4 hover:text-foreground">
          Changelog
        </Link>
      </p>
      <NotionRenderer blocks={blocks} components={components} className="mt-10" />
    </main>
  );
}
