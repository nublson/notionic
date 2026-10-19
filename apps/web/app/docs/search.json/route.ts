import { searchIndex } from "@/lib/docs-search";
import type { SearchEntry } from "@/lib/search";

export const revalidate = 3600;

// Production serves this route from the ISR cache. In development every
// request would rebuild the index from Notion (several seconds), so it's kept
// in memory for a few minutes and only the first search after a restart waits.
const DEV_TTL = 5 * 60 * 1000;
let devIndex: { at: number; entries: Promise<SearchEntry[]> } | null = null;

function cachedIndex() {
  if (process.env.NODE_ENV !== "development") return searchIndex();
  if (!devIndex || Date.now() - devIndex.at > DEV_TTL) {
    devIndex = { at: Date.now(), entries: searchIndex() };
    devIndex.entries.catch(() => {
      devIndex = null;
    });
  }
  return devIndex.entries;
}

/** The docs search index, loaded by the search dialog the first time it opens. */
export async function GET() {
  return Response.json(await cachedIndex());
}
