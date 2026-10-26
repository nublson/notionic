import type { NotionBlock, RichText } from "./types";

/** Joins class names, skipping empty ones. */
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** The text of a rich text array, without formatting. */
export function plainText(text: RichText): string {
  return text.map((item) => item.plain_text).join("");
}

/** Logs once per message, in development only. */
const warned = new Set<string>();
export function warnOnce(message: string): void {
  if (
    typeof process === "undefined" ||
    process.env.NODE_ENV !== "development" ||
    warned.has(message)
  ) {
    return;
  }
  warned.add(message);
  console.warn(`[notionic] ${message}`);
}

/** The block's own data: `block.paragraph` for a paragraph, and so on. */
export function blockData(block: NotionBlock): Record<string, unknown> {
  return (block as unknown as Record<string, Record<string, unknown>>)[block.type] ?? {};
}

/** Every rich text of a block, in reading order: its text, its caption, then table cells. */
export function richTexts(block: NotionBlock): RichText[] {
  const { rich_text, caption, cells } = blockData(block);
  return [
    ...(Array.isArray(rich_text) ? [rich_text as RichText] : []),
    ...(Array.isArray(caption) ? [caption as RichText] : []),
    ...(Array.isArray(cells) ? (cells as RichText[]) : []),
  ];
}
