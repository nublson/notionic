import "server-only";

import { collectHeadings, type NotionBlock } from "notionic";
import { blocksToMarkdown } from "notionic/markdown";
import { getDoc, getDocs } from "./docs";
import type { SearchEntry } from "./search";

const HEADINGS = new Set(["heading_1", "heading_2", "heading_3", "heading_4"]);

/** Markdown down to searchable words: link text kept, syntax and URLs dropped. */
function plain(markdown: string): string {
  return markdown
    .replace(/^`{3,}[\w-]*$/gm, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<\/?(details|summary)>/g, " ")
    .replace(/[`*_#>|~$]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

/** Every published doc, split into sections, for the client-side search. */
export async function searchIndex(): Promise<SearchEntry[]> {
  const entries: SearchEntry[] = [];
  for (const summary of await getDocs()) {
    // One doc at a time, to stay under Notion's rate limit.
    const doc = await getDoc(summary.slug);
    if (!doc) continue;
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
  }
  return entries;
}
