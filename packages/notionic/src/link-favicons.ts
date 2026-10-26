import { isPrivateHost, USER_AGENT } from "./bookmark-preview";

/** One slow provider shouldn't stall a build. */
const TIMEOUT_MS = 3000;
/** Favicons are a few KB; anything bigger isn't one. */
const MAX_BYTES = 512 * 1024;
/** Twice the size the icon renders at, so it stays sharp on dense screens. */
const ICON_SIZE = 32;

/**
 * Where favicons come from, in order: Google's favicon service, then
 * DuckDuckGo's, which knows subdomains Google misses. Each answers 404 for a
 * host it has no icon for.
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

/** The host's icon from the first provider that has one; undefined when none has one and one couldn't answer. */
async function askProviders(host: string): Promise<string | null | undefined> {
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
 * A site's favicon as a data URL, from Google's favicon service or, when
 * Google has none, DuckDuckGo's: a PNG or ICO of a few KB, inlined as it
 * came. A subdomain without one gets its domain's (`you.substack.com` →
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
