import { searchIndex } from "@/lib/docs-search";

export const revalidate = 3600;

/** The docs search index, loaded by the search dialog the first time it opens. */
export async function GET() {
  return Response.json(await searchIndex());
}
