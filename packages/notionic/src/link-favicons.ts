import {
  absolute,
  fetchPublic,
  isHtml,
  isPrivateHost,
  readHead,
  tags,
  USER_AGENT,
} from "./bookmark-preview";

/** One slow provider shouldn't stall a build. */
const TIMEOUT_MS = 3000;
/** Favicons are a few KB; anything bigger isn't one. */
const MAX_BYTES = 512 * 1024;
/** A site's own icon is inlined in every page that links to it, so a smaller cap. */
const SITE_ICON_MAX_BYTES = 100 * 1024;
/** Icon URLs to try from a site's page before the favicon services. */
const SITE_ICON_TRIES = 3;
/** Twice the size the icon renders at, so it stays sharp on dense screens. */
const ICON_SIZE = 32;

/**
 * Where favicons come from when the site's own icon can't be read: Google's
 * favicon service, then DuckDuckGo's, which knows subdomains Google misses.
 * Each answers 404 for a host it has no icon for.
 */
const PROVIDERS: readonly ((host: string) => string)[] = [
  (host) => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${ICON_SIZE}`,
  (host) => `https://icons.duckduckgo.com/ip3/${encodeURIComponent(host)}.ico`,
];

/** The image type the bytes start with, or null for anything that isn't an image. */
export function imageType(bytes: Uint8Array): string | null {
  const at = (offset: number, ...head: number[]) =>
    head.every((byte, i) => bytes[offset + i] === byte);
  if (at(0, 0x89, 0x50, 0x4e, 0x47)) return "image/png";
  if (at(0, 0x00, 0x00, 0x01, 0x00)) return "image/x-icon";
  if (at(0, 0x47, 0x49, 0x46, 0x38)) return "image/gif";
  if (at(0, 0xff, 0xd8, 0xff)) return "image/jpeg";
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return "image/webp";
  // An SVG may open with an XML declaration, comments or a doctype before its root.
  const text = new TextDecoder().decode(bytes.subarray(0, 1024)).toLowerCase();
  const root = text.replace(/^(?:\s|<\?xml[^>]*>|<!--[\s\S]*?-->|<!doctype[^>]*>)*/, "");
  if (root.startsWith("<svg")) return "image/svg+xml";
  return null;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  // In chunks: spreading a whole icon into one call could overflow the stack.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/** The bytes as a data URL, or null when they aren't an image. */
export function imageDataUrl(bytes: Uint8Array): string | null {
  const type = imageType(bytes);
  return type ? `data:${type};base64,${toBase64(bytes)}` : null;
}

/** Reads a response body of at most `max` bytes; null when it's empty or longer. */
async function readBytes(response: Response, max: number): Promise<Uint8Array | null> {
  if (!response.body) return null;
  if (Number(response.headers.get("content-length")) > max) {
    await response.body.cancel().catch(() => {});
    return null;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > max) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  if (length === 0) return null;
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

/** Statuses that mean "ask again later", not "this site has no icon". */
function isTransient(status: number): boolean {
  return status >= 500 || status === 408 || status === 429;
}

/**
 * The icons a page declares, best first: an SVG, then the smallest raster of
 * 32px or more, then smaller ones, then `/favicon.ico`. `apple-touch-icon`
 * (a large, opaque tile) is left out.
 */
export function siteIconUrls(head: string, base: URL): URL[] {
  const rank = (link: Record<string, string>) => {
    const svg = /svg/i.test(link.type ?? "") || /\.svg(?:$|[?#])/i.test(link.href ?? "");
    if (svg) return 0;
    const size = Number((link.sizes ?? "").match(/\d+/)?.[0] ?? 0);
    if (!size) return 3000;
    return size >= ICON_SIZE ? size : 2000 - size;
  };
  const icons = tags(head, "link")
    .filter((link) => (link.rel ?? "").toLowerCase().split(/\s+/).includes("icon"))
    .map((link) => ({ link, rank: rank(link) }))
    .sort((a, b) => a.rank - b.rank)
    .flatMap(({ link }) => {
      const href = absolute(link.href, base);
      return href ? [href] : [];
    });
  const urls = [...new Set([...icons, new URL("/favicon.ico", base).href])];
  return urls.map((url) => new URL(url));
}

/**
 * The icon a site declares for itself, read from its home page, or
 * `/favicon.ico`; null when it has none that loads as an image within the
 * timeout. Every hop is checked for private hosts.
 */
async function siteIcon(host: string): Promise<string | null> {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  try {
    const home = `https://${host}/`;
    const page = await fetchPublic(home, "text/html,application/xhtml+xml", signal);
    let urls = [new URL("/favicon.ico", home)];
    if (page && isHtml(page.response)) {
      urls = siteIconUrls(await readHead(page.response), page.url);
    } else {
      await page?.response.body?.cancel().catch(() => {});
    }
    for (const url of urls.slice(0, SITE_ICON_TRIES)) {
      if (signal.aborted) break;
      try {
        const icon = await fetchPublic(url.href, "image/*", signal);
        if (!icon) continue;
        if (!icon.response.ok) {
          await icon.response.body?.cancel().catch(() => {});
          continue;
        }
        const bytes = await readBytes(icon.response, SITE_ICON_MAX_BYTES);
        const dataUrl = bytes ? imageDataUrl(bytes) : null;
        if (dataUrl) return dataUrl;
      } catch {
        // One icon that fails to load (a CDN that's down): try the next.
      }
    }
  } catch {
    // A site that's slow or unreachable: the favicon services may still know it.
  }
  return null;
}

/** A provider's icon for the host, or null when it has none. Throws when it can't answer. */
async function askProvider(url: string): Promise<string | null> {
  const response = await fetch(url, {
    headers: { accept: "image/*", "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    if (isTransient(response.status)) throw new Error(`HTTP ${response.status} from ${url}`);
    return null;
  }
  const bytes = await readBytes(response, MAX_BYTES);
  return bytes ? imageDataUrl(bytes) : null;
}

/**
 * The host's icon: its own, or from the first service that has one;
 * undefined when none has one and a service couldn't answer.
 */
async function askProviders(host: string): Promise<string | null | undefined> {
  // The site's own icon first: the services' stored copies can be stale or
  // re-encoded (a white-cornered JPEG of a rounded icon).
  const own = await siteIcon(host);
  if (own) return own;
  let unanswered = false;
  for (const provider of PROVIDERS) {
    try {
      const icon = await askProvider(provider(host));
      if (icon) return icon;
    } catch {
      // A provider that timed out or failed: the next one may still answer.
      unanswered = true;
    }
  }
  return unanswered ? undefined : null;
}

/** Second-level labels that country domains register names under: co.uk, com.br, or.jp… */
const SECOND_LEVELS = new Set(["ac", "co", "com", "edu", "gov", "ne", "net", "or", "org"]);

/**
 * The domain a host belongs to, one label up (`blog.example.com` →
 * `example.com`), or null at the site's own domain: never a public suffix
 * like `co.uk`, and never part of an IP address.
 */
export function parentDomain(host: string): string | null {
  if (host.includes(":") || /^[\d.]+$/.test(host)) return null;
  const labels = host.split(".");
  const tld = labels[labels.length - 1] ?? "";
  const second = labels[labels.length - 2] ?? "";
  const minimum = tld.length === 2 && SECOND_LEVELS.has(second) ? 3 : 2;
  return labels.length > minimum ? labels.slice(1).join(".") : null;
}

/** Each name's answer, shared so that subdomains of one site ask for its domain once. */
export type FaviconLookups = Map<string, Promise<string | null | undefined>>;

function ask(
  name: string,
  lookups: FaviconLookups | undefined,
): Promise<string | null | undefined> {
  if (!lookups) return askProviders(name);
  let lookup = lookups.get(name);
  if (!lookup) {
    lookup = askProviders(name);
    lookups.set(name, lookup);
  }
  return lookup;
}

/**
 * A site's favicon as a data URL: the icon its own page declares (an SVG,
 * or the smallest PNG of 32px or more) or its `/favicon.ico`, and when it
 * has none that loads, Google's favicon service and then DuckDuckGo's.
 * Inlined as it came, a few KB. A subdomain without one gets its domain's (`you.substack.com` →
 * `substack.com`). Null when the site has none; undefined when a provider
 * couldn't answer (a timeout, a 5xx, a rate limit), so a caller can ask
 * again later rather than keep "none". Private hosts are never sent, and
 * get null. Pass `lookups` to share answers
 * across calls; otherwise it doesn't cache.
 */
export async function lookupLinkFavicon(
  host: string,
  lookups?: FaviconLookups,
): Promise<string | null | undefined> {
  // Private hosts (`localhost`, `10.x`, `*.local`) are never sent to the services.
  let name: string | null = host.toLowerCase().replace(/\.$/, "");
  if (!name || isPrivateHost(name)) return null;
  while (name) {
    const icon = await ask(name, lookups);
    if (icon !== null) return icon;
    name = parentDomain(name);
  }
  return null;
}

/** A site's favicon as a data URL, or null when it has none or none could be fetched. See `lookupLinkFavicon`. */
export async function fetchLinkFavicon(host: string): Promise<string | null> {
  return (await lookupLinkFavicon(host)) ?? null;
}
