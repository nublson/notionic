import { type NextRequest, NextResponse } from "next/server";
import { DISCOVERY_LINKS } from "@/lib/agent-discovery";

/** Whether the request asks for Markdown, as agents do with Accept: text/markdown. */
function acceptsMarkdown(request: NextRequest): boolean {
  return (request.headers.get("accept") ?? "")
    .split(",")
    .some((type) => type.trim().toLowerCase().startsWith("text/markdown"));
}

/** The Markdown version of a page, for the pages that have one. */
function markdownPath(pathname: string): string | null {
  if (pathname === "/") return "/index.md";
  const doc = pathname.match(/^\/docs\/([\w-]+)$/);
  return doc ? `/docs/${doc[1]}/md` : null;
}

/**
 * Serves pages as Markdown to agents that ask for it (the HTML stays the
 * default), and advertises the site's agent resources in a Link header.
 */
export function proxy(request: NextRequest) {
  const markdown = markdownPath(request.nextUrl.pathname);
  let response: NextResponse;
  if (markdown && acceptsMarkdown(request)) {
    const url = request.nextUrl.clone();
    url.pathname = markdown;
    response = NextResponse.rewrite(url);
  } else {
    response = NextResponse.next();
  }
  // Caches must keep the HTML and Markdown versions apart.
  if (markdown) response.headers.set("Vary", "Accept");
  response.headers.set("Link", DISCOVERY_LINKS);
  return response;
}

export const config = {
  // Pages only: not Next's assets, API routes or files with an extension.
  matcher: ["/((?!_next/|api/|.*\\.[\\w]+$).*)"],
};
