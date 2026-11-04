import { type BlockOf, type NotionRichText as RichText, plainText } from "notionic";

/** The docs section whose pages show each block as notionic renders it from npm. */
export const EXAMPLES_SECTION = "Examples";

/**
 * A recipe on an Examples page: a code block captioned "Customize…", which
 * keeps the site's highlighting while other blocks render built-in.
 */
export function isRecipe(block: BlockOf<"code">): boolean {
  return plainText(block.code.caption).trim().startsWith("Customize");
}

const MARKER = /^\/\/ (Customize[^\n]*)\n?/;

/** A plain text item, as the code block's text or caption. */
function text(content: string): RichText[number] {
  return {
    type: "text",
    text: { content, link: null },
    annotations: {
      bold: false,
      italic: false,
      strikethrough: false,
      underline: false,
      code: false,
      color: "default",
    },
    plain_text: content,
    href: null,
  } as RichText[number];
}

/**
 * The code block as a recipe, or null when it isn't one. Notion's Markdown
 * can't write captions, so a recipe can also start with a comment,
 * `// Customize · callout.tsx`, which becomes its caption.
 */
export function toRecipe(block: BlockOf<"code">): BlockOf<"code"> | null {
  if (isRecipe(block)) return block;
  const source = plainText(block.code.rich_text);
  const match = source.match(MARKER);
  if (!match?.[1]) return null;
  return {
    ...block,
    code: {
      ...block.code,
      rich_text: [text(source.slice(match[0].length))],
      caption: [text(match[1].trim())],
    },
  };
}

/** Whether to list unpublished docs: with NOTION_DOCS_DRAFTS=1, and never in production. */
export function includeDrafts(env: { NODE_ENV?: string; NOTION_DOCS_DRAFTS?: string }): boolean {
  return env.NOTION_DOCS_DRAFTS === "1" && env.NODE_ENV !== "production";
}
