import { USER_AGENT } from "./bookmark-preview";

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

/** A provider's icon for the host, or null when it has none. Throws when it can't answer. */
async function askProvider(url: string): Promise<string | null> {
  const response = await fetch(url, {
    headers: { accept: "image/*", "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    return null;
  }
  const bytes = await readBytes(response, MAX_BYTES);
  return bytes ? imageDataUrl(bytes) : null;
}

/**
 * A site's favicon as a data URL, from Google's favicon service or, when
 * Google has none, DuckDuckGo's: a PNG or ICO of a few KB, inlined as it
 * came. Null when neither has one, or neither answers within 3 seconds.
 * It doesn't cache.
 */
export async function fetchLinkFavicon(host: string): Promise<string | null> {
  if (!host) return null;
  for (const provider of PROVIDERS) {
    try {
      const icon = await askProvider(provider(host));
      if (icon) return icon;
    } catch {
      // A provider that timed out or failed: the next one may still answer.
    }
  }
  return null;
}
