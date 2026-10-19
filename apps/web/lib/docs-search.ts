import "server-only";

import { collectHeadings, type NotionBlock } from "notionic";
import { blocksToMarkdown } from "notionic/markdown";
import { getDoc, getDocs } from "./docs";
import type { SearchEntry } from "./search";

const HEADINGS = new Set(["heading_1", "heading_2", "heading_3", "heading_4"]);

/** Markdown down to searchable words: link text kept, syntax and URLs dropped. */
function plain(markdown: string): string {
  return (
    markdown
      .replace(/^`{3,}[\w-]*$/gm, " ")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/<\/?(details|summary)>/g, " ")
      // Table separator rows (| --- | :---: |) and blockquote markers; a ">"
      // elsewhere stays, so inline code like <p> reads whole.
      .replace(/^\|?(\s*:?-{3,}:?\s*\|?)+$/gm, " ")
      .replace(/^>+ ?/gm, "")
      .replace(/[`*_#|~$]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/** Splits a doc at its top-level headings, so results can link to a section. */
function sections(blocks: NotionBlock[]) {
  const ids = new Map(collectHeadings(blocks).map((h) => [h.blockId, h]));
  const parts: { heading: SearchEntry["heading"]; blocks: NotionBlock[] }[] = [
    { heading: null, blocks: [] },
  ];
  for (const block of blocks) {
    const heading = HEADINGS.has(block.type) ? ids.get(block.id) : undefined;
    if (heading) {
      // A toggleable heading's content is its children.
      parts.push({ heading: { id: heading.id, text: heading.text }, blocks: block.children ?? [] });
    } else {
      parts[parts.length - 1]?.blocks.push(block);
    }
  }
  return parts;
}

// Docs fetched at once. Each doc is a page request plus its block requests,
// so two in flight stay near Notion's ~3 requests a second (the token is
// shared with production); the client retries the odd 429.
const CONCURRENCY = 2;

/** `fn` over `items`, at most `limit` at a time, results in input order. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>) {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index] as T);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/** Every published doc, split into sections, for the client-side search. */
export async function searchIndex(): Promise<SearchEntry[]> {
  const summaries = await getDocs();
  const docs = await mapLimit(summaries, CONCURRENCY, (summary) => getDoc(summary.slug));
  const entries: SearchEntry[] = [];
  summaries.forEach((summary, index) => {
    const doc = docs[index];
    if (!doc) return;
    for (const part of sections(doc.blocks)) {
      const text = plain(blocksToMarkdown(part.blocks));
      if (!part.heading && !text && entries.some((e) => e.slug === summary.slug)) continue;
      entries.push({
        slug: summary.slug,
        title: summary.title,
        section: summary.section,
        description: summary.description,
        heading: part.heading,
        text,
      });
    }
  });
  return entries;
}
