import type { BookmarkPreview } from "./types";

/** Long enough for a slow site, short enough not to stall a build. */
const TIMEOUT_MS = 5000;
/** Open Graph tags live in <head>; stop reading after this much HTML. */
const MAX_BYTES = 512 * 1024;
const MAX_REDIRECTS = 5;
const USER_AGENT = "Mozilla/5.0 (compatible; notionic; +https://notionic.dev)";

/**
 * Hosts a server shouldn't be asked to fetch on a page's behalf: loopback,
 * private and link-local addresses (which include cloud metadata endpoints).
 * Only literal addresses are checked; a public name that resolves to a private
 * address still gets through.
 */
function isPrivateHost(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  const ipv4 = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }
  if (host.includes(":")) {
    return (
      host === "::" ||
      host === "::1" ||
      host.startsWith("fc") ||
      host.startsWith("fd") ||
      host.startsWith("fe80") ||
      host.startsWith("::ffff:")
    );
  }
  return false;
}

/** A public http(s) URL, or null. */
function fetchableUrl(url: string): URL | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return isPrivateHost(parsed.hostname) ? null : parsed;
  } catch {
    return null;
  }
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code =
        entity[1] === "x" || entity[1] === "X"
          ? Number.parseInt(entity.slice(2), 16)
          : Number(entity.slice(1));
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : match;
    }
    return ENTITIES[entity.toLowerCase()] ?? match;
  });
}

function clean(value: string | undefined): string | undefined {
  const text = value ? decodeEntities(value).replace(/\s+/g, " ").trim() : "";
  return text || undefined;
}

/** The attributes of each tag with the given name, lowercased keys. */
function tags(html: string, name: string): Record<string, string>[] {
  const found: Record<string, string>[] = [];
  for (const [tag] of html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))) {
    const attributes: Record<string, string> = {};
    for (const [, key, , quoted, bare] of tag.matchAll(
      /([\w:-]+)\s*=\s*(?:(["'])(.*?)\2|([^\s"'>]+))/g,
    )) {
      if (key) attributes[key.toLowerCase()] = quoted ?? bare ?? "";
    }
    found.push(attributes);
  }
  return found;
}

/** An absolute http(s) URL resolved against the page, or undefined. */
function absolute(value: string | undefined, base: URL): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(decodeEntities(value.trim()), base);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The preview a page describes in its <head>: Open Graph and Twitter tags,
 * falling back to <title>, the meta description and the favicon. Null
 * without a title.
 */
export function parseBookmarkPreview(html: string, pageUrl: string): BookmarkPreview | null {
  const base = new URL(pageUrl);
  const headEnd = html.search(/<\/head>/i);
  const head = headEnd === -1 ? html : html.slice(0, headEnd);
  const meta: Record<string, string> = {};
  for (const attributes of tags(head, "meta")) {
    const key = (attributes.property ?? attributes.name)?.toLowerCase();
    if (key && attributes.content !== undefined && !(key in meta)) meta[key] = attributes.content;
  }
  const titleTag = head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const title = clean(meta["og:title"] ?? meta["twitter:title"] ?? titleTag);
  if (!title) return null;

  const icons = tags(head, "link").filter((link) =>
    (link.rel ?? "").toLowerCase().split(/\s+/).includes("icon"),
  );
  return {
    title,
    description: clean(meta["og:description"] ?? meta["twitter:description"] ?? meta.description),
    image: absolute(meta["og:image"] ?? meta["og:image:url"] ?? meta["twitter:image"], base),
    favicon: absolute(icons[0]?.href, base) ?? new URL("/favicon.ico", base).href,
    siteName: clean(meta["og:site_name"]),
  };
}

/** Reads up to MAX_BYTES of a response body as text. */
async function readHead(response: Response): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let html = "";
  let bytes = 0;
  while (bytes < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    html += decoder.decode(value, { stream: true });
    if (/<\/head>/i.test(html)) break;
  }
  await reader.cancel().catch(() => {});
  return html;
}

/**
 * The preview card data for a bookmarked page, read from its HTML, or null
 * when the page can't be fetched, isn't HTML, or has no title.
 */
export async function fetchBookmarkPreview(url: string): Promise<BookmarkPreview | null> {
  let target = fetchableUrl(url);
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  try {
    // Redirects are followed by hand so each hop gets the private-host check.
    for (let hop = 0; target && hop <= MAX_REDIRECTS; hop++) {
      const response = await fetch(target, {
        headers: { accept: "text/html,application/xhtml+xml", "user-agent": USER_AGENT },
        redirect: "manual",
        signal,
      });
      const location = response.headers.get("location");
      if (response.status >= 300 && response.status < 400 && location) {
        await response.body?.cancel().catch(() => {});
        target = fetchableUrl(new URL(location, target).href);
        continue;
      }
      if (!response.ok || !/html/i.test(response.headers.get("content-type") ?? "")) {
        await response.body?.cancel().catch(() => {});
        return null;
      }
      return parseBookmarkPreview(await readHead(response), target.href);
    }
    return null;
  } catch {
    return null;
  }
}
