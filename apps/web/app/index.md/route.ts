import { llmsIndex } from "@/lib/docs-markdown";

export const revalidate = 3600;

/** The home page as Markdown, for agents that ask for it (see proxy.ts). */
export async function GET() {
  return new Response(await llmsIndex(), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
