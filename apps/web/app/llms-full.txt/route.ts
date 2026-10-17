import { llmsFull } from "@/lib/docs-markdown";

export const revalidate = 3600;

export async function GET() {
  return new Response(await llmsFull(), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
