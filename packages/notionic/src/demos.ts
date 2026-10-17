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
