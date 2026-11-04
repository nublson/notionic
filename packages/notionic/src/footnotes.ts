import { linkedBlockId, normalizePageId } from "./links";
import type { Footnote, FootnotesOptions, NotionBlock, PageFootnotes } from "./types";
import { findSection } from "./sections";
import { richTexts } from "./utils";

const TEXT_TYPES = new Set(["paragraph", "bulleted_list_item", "numbered_list_item"]);

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
  const found = findSection(blocks, options.headings ?? ["Footnotes"]);
  if (!found) return null;
  const { marker, heading: markerHeading, start, end, blocks: section, items: noteBlocks } = found;

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
