import { collectFootnotes } from "./footnotes";
import { normalizePageId } from "./links";
import { findSection } from "./sections";
import type {
  FootnotesOptions,
  NotionBlock,
  PageResources,
  ResourceItem,
  ResourcesOptions,
  RichText,
} from "./types";
import { blockData } from "./utils";

const ITEM_TYPES = new Set(["bulleted_list_item", "numbered_list_item"]);
/** What writers put between a resource's title and its description. */
const SEPARATORS = new Set(["-", "–", "—", ":", "|"]);

/** A copy of a rich text item with other text. */
function withText(item: RichText[number], value: string): RichText[number] {
  return {
    ...item,
    plain_text: value,
    ...(item.type === "text" ? { text: { ...item.text, content: value } } : {}),
  } as RichText[number];
}

/** The text without its leading whitespace and one separator. */
function trimSeparator(text: RichText): RichText {
  const out = [...text];
  let separator = false;
  while (out[0]) {
    const first = out[0];
    // A linked item may be a footnote reference, matched by identity: keep it.
    if (first.href) break;
    const value = first.plain_text;
    let i = 0;
    while (i < value.length) {
      const char = value.charAt(i);
      if (/\s/.test(char)) i++;
      else if (!separator && SEPARATORS.has(char)) {
        separator = true;
        i++;
      } else break;
    }
    if (i === value.length) {
      out.shift();
      continue;
    }
    if (i > 0 && first.type === "text") out[0] = withText(first, value.slice(i));
    break;
  }
  return out;
}

/** The item as a resource when its text starts with a link that isn't a footnote reference. */
function toResource(
  block: NotionBlock,
  footnoteRefs: ReadonlyMap<object, unknown>,
): ResourceItem | null {
  if (!ITEM_TYPES.has(block.type)) return null;
  const text = (blockData(block).rich_text as RichText | undefined) ?? [];
  const start = text.findIndex((item) => item.plain_text.trim() !== "");
  const href = text[start]?.href;
  if (!href || footnoteRefs.has(text[start] as object)) return null;
  let end = start;
  while (text[end]?.href === href) end++;
  const description = trimSeparator(text.slice(end));
  return {
    block,
    href,
    title: text.slice(start, end),
    description: description.length ? description : null,
    preview: block.resourcePreview ?? null,
  };
}

/**
 * The page's resources: a top-level heading named one of `resources.headings`
 * starts a section, as for footnotes, and its list items that start with a
 * link are the resources. Null when the page has no such heading, none of its
 * items start with a link, or the heading also names the footnotes section
 * (footnotes win).
 */
export function collectResources(
  blocks: NotionBlock[],
  options: { resources?: ResourcesOptions; footnotes?: FootnotesOptions } = {},
): PageResources | null {
  const section = findSection(blocks, options.resources?.headings ?? ["Resources"]);
  if (!section) return null;
  const footnotes = (options.footnotes?.headings ?? ["Footnotes"]).map((name) =>
    name.trim().toLowerCase(),
  );
  if (footnotes.includes(section.heading.text.toLowerCase())) return null;

  // A footnote reference keeps its item an ordinary list item, so it renders.
  const footnoteRefs = collectFootnotes(blocks, options.footnotes)?.refs ?? new Map();
  const items = new Map<string, ResourceItem>();
  for (const block of section.items) {
    const resource = toResource(block, footnoteRefs);
    if (resource) items.set(normalizePageId(block.id), resource);
  }
  if (items.size === 0) return null;
  return { headingBlockId: normalizePageId(section.marker.id), items };
}
