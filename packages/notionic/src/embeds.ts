import { matchDemo } from "./demos";
import type { Demos, EmbedPolicy, NotionBlock } from "./types";

/**
 * Whether `host` is one of `hosts` or a subdomain of one. embed-resizer.tsx
 * keeps a copy, since a client entry can't share modules with the server build.
 */
function matchesHost(host: string, hosts: readonly string[]): boolean {
  const name = host.toLowerCase();
  return hosts.some((allowed) => {
    const listed = allowed.toLowerCase();
    return name === listed || name.endsWith(`.${listed}`);
  });
}

/**
 * Whether `embeds` lets this URL load in an iframe: only http(s) URLs, and of
 * those all (`true`), the ones whose host is a listed host or a subdomain of
 * one, or the ones the function accepts.
 */
export function allowsEmbed(url: string, embeds: EmbedPolicy | undefined): boolean {
  if (!embeds) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  if (embeds === true) return true;
  if (typeof embeds === "function") return embeds(parsed.href);
  return matchesHost(parsed.hostname, embeds);
}

/** Whether any embed in `blocks` (nested ones included) renders as a live iframe. */
export function hasLiveEmbed(
  blocks: NotionBlock[],
  embeds: EmbedPolicy | undefined,
  demos: Demos | undefined,
): boolean {
  if (!embeds) return false;
  return blocks.some(
    (block) =>
      (block.type === "embed" &&
        !matchDemo(block.embed.url, demos) &&
        allowsEmbed(block.embed.url, embeds)) ||
      (block.children !== undefined && hasLiveEmbed(block.children, embeds, demos)),
  );
}
