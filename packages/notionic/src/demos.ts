import type { ComponentType } from "react";
import type { DemoProps, Demos } from "./types";

export type DemoMatch = DemoProps & { Component: ComponentType<DemoProps> };

/**
 * The demo an embed URL names, or null. A URL names a demo when its path ends
 * in `/demos/<name>` and `<name>` is one of `demos`. Only the path counts, so
 * the same embed works on localhost, previews and production.
 */
export function matchDemo(url: string, demos: Demos | undefined): DemoMatch | null {
  if (!demos) return null;
  let parsed: URL;
  let name: string;
  try {
    parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length < 2 || segments[segments.length - 2] !== "demos") return null;
    name = decodeURIComponent(segments[segments.length - 1] ?? "");
  } catch {
    return null;
  }
  // Own keys only, so "constructor" or "toString" never match.
  if (!Object.hasOwn(demos, name)) return null;
  const Component = demos[name];
  if (!Component) return null;
  return { name, params: Object.fromEntries(parsed.searchParams), Component };
}

/**
 * The frame height a demo's or live embed's `?height=` asks for, in pixels, or undefined. The
 * public API doesn't send the size an embed has in Notion, so the URL carries
 * it. Only whole numbers from 1 to 9999 count.
 */
export function demoHeight(params: Record<string, string>): number | undefined {
  const value = params.height;
  if (!value || !/^\d{1,4}$/.test(value)) return undefined;
  const height = Number(value);
  return height > 0 ? height : undefined;
}
