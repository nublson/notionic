import type { RenderContext, ResolvedLink } from "./types";

const PLAIN_ID = /[0-9a-f]{32}$/i;
const DASHED_ID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A page id as 32 lowercase hex characters, without dashes. */
export function normalizePageId(id: string): string {
  return id.replace(/-/g, "").toLowerCase();
}

/** Links to a page on notion.so, which works for pages shared to the web. */
export function defaultPageHref(pageId: string): string {
  return `https://www.notion.so/${normalizePageId(pageId)}`;
}

function matchPageId(segment: string): string | null {
  const match = segment.match(PLAIN_ID) ?? segment.match(DASHED_ID);
  return match ? normalizePageId(match[0]) : null;
}

function isNotionHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === "notion.so" ||
    host === "www.notion.so" ||
    // Page mentions come back as https://app.notion.com/p/<id>.
    host === "notion.com" ||
    host.endsWith(".notion.com") ||
    host.endsWith(".notion.site")
  );
}

/** The page id in a Notion page URL, or null for any other URL. */
export function notionPageIdFromUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!isNotionHost(parsed.hostname)) return null;
  const segments = parsed.pathname.split("/").filter(Boolean);
  return matchPageId(segments[segments.length - 1] ?? "");
}

/** A same-site path; never `//host` or `/\host`, which browsers read as another site. */
function internalPath(path: string): ResolvedLink | null {
  return /^\/(?![/\\])/.test(path) ? { href: path, external: false } : null;
}

/** A plain URL or path as it should render, or null when empty or unsafe. */
function classify(href: string): ResolvedLink | null {
  // Browsers drop tabs and newlines inside URLs, so do the same before checking.
  // biome-ignore lint/suspicious/noControlCharactersInRegex: stripping control characters is the point
  const value = href.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  if (!value) return null;
  if (value.startsWith("#")) return { href: value, external: false };
  if (value.startsWith("/")) return internalPath(value);

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol === "mailto:" || url.protocol === "tel:") {
    return { href: value, external: false };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  return { href: value, external: true };
}

/** The page id a Notion link points to: a notion.so URL or `/<id>` path. */
function linkedPageId(href: string): string | null {
  const value = href.trim();
  if (value.startsWith("/")) {
    // Notion writes in-text links to workspace pages as `/<id>`,
    // `/Title-<id>?pvs=4` or, for links to a block, `/p/<id>#<block>`.
    // Only those shapes: `/orders/<id>` on your site stays your path.
    const segments = (value.split(/[?#]/)[0] ?? "").split("/").filter(Boolean);
    const page = segments[0] === "p" ? segments[1] : segments[0];
    return matchPageId(page ?? "");
  }
  return notionPageIdFromUrl(value);
}

/**
 * The block id a link to a block points to: a link to a Notion page (a
 * `/<id>` path or a Notion URL) with the block's id as its `#fragment`.
 * Null for any other link.
 */
export function linkedBlockId(href: string | null | undefined): string | null {
  if (!href) return null;
  const hash = href.indexOf("#");
  // `#<id>` alone links to a block on the same page.
  if (hash === -1 || (hash > 0 && !linkedPageId(href.slice(0, hash)))) return null;
  const fragment = href.slice(hash + 1);
  const match = fragment.match(/^[0-9a-f]{32}$/i) ?? fragment.match(DASHED_ID);
  return match && match[0] === fragment ? normalizePageId(fragment) : null;
}

/** Where a link to a Notion page renders, or null to show its text without a link. */
export function resolvePageLink(pageId: string, context: RenderContext): ResolvedLink | null {
  const href = context.pageHref(normalizePageId(pageId));
  return href ? classify(href) : null;
}

/**
 * How a link from Notion content should render, or null for text without a
 * link (empty or unsafe). Notion page links go through `context.pageHref`.
 */
export function resolveLink(
  href: string | null | undefined,
  context: RenderContext,
): ResolvedLink | null {
  if (!href) return null;
  const pageId = linkedPageId(href);
  return pageId ? resolvePageLink(pageId, context) : classify(href);
}

/**
 * The host of a link to another site, for its favicon: an http(s) URL that
 * isn't a Notion page. Null for paths, anchors, mailto and tel links, Notion
 * pages, and anything unsafe.
 */
export function externalLinkHost(href: string | null | undefined): string | null {
  if (!href || linkedPageId(href)) return null;
  const link = classify(href);
  if (!link?.external) return null;
  return new URL(link.href).hostname.toLowerCase() || null;
}
