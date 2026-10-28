"use client";

import { useEffect, useRef } from "react";

// This file imports nothing else of notionic's, so the build keeps it a chunk
// of its own with "use client" at the top. `allowsEmbed` in embeds.ts matches
// hosts the same way.
function matchesHost(host: string, hosts: readonly string[]): boolean {
  const name = host.toLowerCase();
  return hosts.some((allowed) => {
    const listed = allowed.toLowerCase();
    return name === listed || name.endsWith(`.${listed}`);
  });
}

/** The largest height a page can ask for, the same range as `?height=`. */
const MAX_HEIGHT = 9999;

/**
 * The height a `{ type: "notionic:resize", height }` message asks for,
 * rounded and capped at 9999, or undefined for any other message.
 */
export function resizeHeight(data: unknown): number | undefined {
  if (typeof data !== "object" || data === null) return undefined;
  const { type, height } = data as { type?: unknown; height?: unknown };
  if (type !== "notionic:resize" || typeof height !== "number") return undefined;
  if (!Number.isFinite(height) || height <= 0) return undefined;
  return Math.min(MAX_HEIGHT, Math.max(1, Math.round(height)));
}

/**
 * Whether a message from `origin` may resize `frame`: an http(s) origin that
 * `hosts` allows (any, for `true`), or, without `hosts`, the frame's own
 * origin as the server marked it.
 */
function allowsOrigin(
  origin: string,
  frame: HTMLIFrameElement,
  hosts: true | readonly string[] | undefined,
): boolean {
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  if (hosts === true) return true;
  if (hosts) return matchesHost(parsed.hostname, hosts);
  return parsed.origin === frame.dataset.notionicEmbed;
}

/**
 * Lets the live embeds of one `NotionRenderer` take the height their page
 * reports: a frame that posts `{ type: "notionic:resize", height }` to its
 * parent becomes that many pixels tall. A message counts only from a frame of
 * this renderer and from an origin `hosts` allows; a function policy can't
 * reach the browser, so without `hosts` only each frame's own origin counts.
 */
export function EmbedResizer({ hosts }: { hosts?: true | readonly string[] }) {
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const root = marker.current?.parentElement;
    if (!root) return;
    const onMessage = (event: MessageEvent) => {
      if (!event.source) return;
      const frame = Array.from(
        root.querySelectorAll<HTMLIFrameElement>("iframe[data-notionic-embed]"),
      ).find((candidate) => candidate.contentWindow === event.source);
      if (!frame || !allowsOrigin(event.origin, frame, hosts)) return;
      const height = resizeHeight(event.data);
      if (height !== undefined) frame.style.height = `${height}px`;
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [hosts]);
  return <span ref={marker} hidden />;
}
