import { linkedBlockId, normalizePageId } from "./links";
import type { Footnote, FootnotesOptions, NotionBlock, PageFootnotes, RichText } from "./types";
import { plainText } from "./utils";

const LEVELS = { heading_1: 1, heading_2: 2, heading_3: 3, heading_4: 4 } as const;
const TEXT_TYPES = new Set(["paragraph", "bulleted_list_item", "numbered_list_item"]);

/** The block's own data: `block.paragraph` for a paragraph, and so on. */
function data(block: NotionBlock): Record<string, unknown> {
  return (block as unknown as Record<string, Record<string, unknown>>)[block.type] ?? {};
}

function heading(block: NotionBlock): { level: 1 | 2 | 3 | 4; text: string } | null {
  if (!(block.type in LEVELS)) return null;
  const level = LEVELS[block.type as keyof typeof LEVELS];
  return { level, text: plainText((data(block).rich_text as RichText) ?? []).trim() };
}

/** Every rich text of a block, in reading order: its text, its caption, then table cells. */
function richTexts(block: NotionBlock): RichText[] {
  const { rich_text, caption, cells } = data(block);
  return [
    ...(Array.isArray(rich_text) ? [rich_text as RichText] : []),
    ...(Array.isArray(caption) ? [caption as RichText] : []),
    ...(Array.isArray(cells) ? (cells as RichText[]) : []),
  ];
}

function isEmpty(block: NotionBlock): boolean {
  return (
    TEXT_TYPES.has(block.type) &&
    richTexts(block).every((text) => text.length === 0) &&
    !block.children?.length
  );
}

/**
 * The page's footnotes: a top-level heading named one of `headings` starts
 * a section that runs to the next heading of the same or a higher level.
 * Its blocks are the notes, and links to them elsewhere on the page are the
 * references, numbered in reading order. A toggleable heading holds its
 * notes as its children. Null when the page has no such heading, or nothing
 * links to its notes.
 */
export function collectFootnotes(
  blocks: NotionBlock[],
  options: FootnotesOptions = {},
): PageFootnotes | null {
  const names = new Set(
    (options.headings ?? ["Footnotes"]).map((name) => name.trim().toLowerCase()),
  );
  const start = blocks.findIndex((block) => {
    const text = heading(block)?.text;
    return text !== undefined && names.has(text.toLowerCase());
  });
  const marker = blocks[start];
  const markerHeading = marker ? heading(marker) : null;
  if (!marker || !markerHeading) return null;

  // A toggleable heading holds its notes; otherwise they follow it, up to
  // the next heading of the same or a higher level.
  const toggleable = Boolean(data(marker).is_toggleable);
  let end = toggleable
    ? start + 1
    : blocks.findIndex(
        (block, i) => i > start && (heading(block)?.level ?? 5) <= markerHeading.level,
      );
  if (end === -1) end = blocks.length;
  const section = blocks.slice(start + 1, end);
  const noteBlocks = toggleable ? (marker.children ?? []) : section;

  const notes = new Map<string, Footnote>();
  for (const block of noteBlocks) {
    if (!isEmpty(block)) notes.set(normalizePageId(block.id), { block, number: null, refIds: [] });
  }

  const refs: PageFootnotes["refs"] = new Map();
  let count = 0;
  const walk = (list: NotionBlock[]) => {
    for (const block of list) {
      for (const text of richTexts(block)) {
        for (const item of text) {
          const note = notes.get(linkedBlockId(item.href) ?? "");
          if (!note) continue;
          if (note.number === null) note.number = ++count;
          const id = note.refIds.length
            ? `fnref-${note.number}-${note.refIds.length + 1}`
            : `fnref-${note.number}`;
          note.refIds.push(id);
          refs.set(item, { number: note.number, id });
        }
      }
      if (block.children) walk(block.children);
    }
  };
  // Links inside the notes themselves stay plain links.
  walk([...blocks.slice(0, start), ...blocks.slice(end)]);

  // A section nothing links to is ordinary content, as it was before footnotes.
  if (refs.size === 0) return null;

  const all = [...notes.values()];
  return {
    heading: { blockId: marker.id, ...markerHeading },
    showTitle: options.showTitle ?? false,
    title: options.title ?? markerHeading.text,
    sectionBlockIds: new Set([marker, ...section].map((block) => normalizePageId(block.id))),
    notes: [
      ...all
        .filter((note) => note.number !== null)
        .sort((a, b) => (a.number ?? 0) - (b.number ?? 0)),
      ...all.filter((note) => note.number === null),
    ],
    refs,
  };
}
