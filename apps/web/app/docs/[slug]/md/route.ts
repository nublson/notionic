import { getDocs } from "@/lib/docs";
import { docMarkdown } from "@/lib/docs-markdown";

export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getDocs()).map((doc) => ({ slug: doc.slug }));
}

/** A doc as Markdown, served at /docs/<slug>.md (see next.config.ts). */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const markdown = await docMarkdown((await params).slug);
  if (!markdown) return new Response("Not found\n", { status: 404 });
  return new Response(markdown, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
