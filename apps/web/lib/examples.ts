import { type BlockOf, plainText } from "notionic";

/** The docs section whose pages show each block as notionic renders it from npm. */
export const EXAMPLES_SECTION = "Examples";

/**
 * A recipe on an Examples page: a code block captioned "Customize…", which
 * keeps the site's highlighting while other blocks render built-in.
 */
export function isRecipe(block: BlockOf<"code">): boolean {
  return plainText(block.code.caption).trim().startsWith("Customize");
}

/** Whether to list unpublished docs: with NOTION_DOCS_DRAFTS=1, and never in production. */
export function includeDrafts(env: { NODE_ENV?: string; NOTION_DOCS_DRAFTS?: string }): boolean {
  return env.NOTION_DOCS_DRAFTS === "1" && env.NODE_ENV !== "production";
}
