import type { NotionBlock, RichText } from "./types";
import { blockData, plainText } from "./utils";

const LEVELS = { heading_1: 1, heading_2: 2, heading_3: 3, heading_4: 4 } as const;

/** A section of the page that starts at a named heading (see `findSection`). */
export type Section = {
  marker: NotionBlock;
  heading: { level: 1 | 2 | 3 | 4; text: string };
  /** Index of the marker in `blocks`, and the index after the section's last top-level block. */
  start: number;
  end: number;
  /** The top-level blocks after the marker that the section spans (empty for a toggleable marker). */
  blocks: NotionBlock[];
  /** The section's content: the marker's children when toggleable, else `blocks`. */
  items: NotionBlock[];
};

/** The heading level and trimmed text of a heading block, else null. */
export function headingOf(block: NotionBlock): { level: 1 | 2 | 3 | 4; text: string } | null {
  if (!(block.type in LEVELS)) return null;
  const level = LEVELS[block.type as keyof typeof LEVELS];
  return { level, text: plainText((blockData(block).rich_text as RichText) ?? []).trim() };
}

/**
 * The first top-level heading whose text is one of `names` (ignoring case
 * and surrounding whitespace), and its section: the blocks after it up to
 * the next heading of the same or a higher level, or, for a toggleable
 * heading, its children.
 */
export function findSection(blocks: NotionBlock[], names: readonly string[]): Section | null {
  const wanted = new Set(names.map((name) => name.trim().toLowerCase()));
  const start = blocks.findIndex((block) => {
    const text = headingOf(block)?.text;
    return text !== undefined && wanted.has(text.toLowerCase());
  });
  const marker = blocks[start];
  const heading = marker ? headingOf(marker) : null;
  if (!marker || !heading) return null;

  if (blockData(marker).is_toggleable) {
    return { marker, heading, start, end: start + 1, blocks: [], items: marker.children ?? [] };
  }
  let end = blocks.findIndex(
    (block, i) => i > start && (headingOf(block)?.level ?? 5) <= heading.level,
  );
  if (end === -1) end = blocks.length;
  const section = blocks.slice(start + 1, end);
  return { marker, heading, start, end, blocks: section, items: section };
}
