import { createSlugger } from "./slug";
import type { NotionBlock } from "./types";
import { plainText } from "./utils";

export type PageHeading = {
  /** The heading block's id. */
  blockId: string;
  /** Its anchor id on the page, unique across all headings. */
  id: string;
  text: string;
  /** Notion's heading level: 1 for heading_1, and so on. */
  level: 1 | 2 | 3 | 4;
};

const LEVELS = { heading_1: 1, heading_2: 2, heading_3: 3, heading_4: 4 } as const;

/**
 * Every non-blank heading on the page, in reading order (headings nested in
 * toggles, columns and callouts included), with unique anchor ids. Use it for
 * a table of contents or a sidebar outline.
 */
export function collectHeadings(blocks: NotionBlock[]): PageHeading[] {
  const slug = createSlugger();
  const headings: PageHeading[] = [];
  const walk = (list: NotionBlock[]) => {
    for (const block of list) {
      if (
        block.type === "heading_1" ||
        block.type === "heading_2" ||
        block.type === "heading_3" ||
        block.type === "heading_4"
      ) {
        const data =
          block.type === "heading_1"
            ? block.heading_1
            : block.type === "heading_2"
              ? block.heading_2
              : block.type === "heading_3"
                ? block.heading_3
                : block.heading_4;
        const text = plainText(data.rich_text).trim();
        if (text) {
          headings.push({ blockId: block.id, id: slug(text), text, level: LEVELS[block.type] });
        }
      }
      if (block.children) walk(block.children);
    }
  };
  walk(blocks);
  return headings;
}
