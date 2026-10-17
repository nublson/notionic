/** A searchable section of a doc, as /docs/search.json serves it. */
export type SearchEntry = {
  slug: string;
  title: string;
  section: string;
  description: string;
  heading: { id: string; text: string } | null;
  text: string;
};

export type SearchResult = {
  entry: SearchEntry;
  href: string;
  /** Text around the first match, or the description. */
  snippet: string;
};

const WEIGHTS = { title: 10, heading: 6, description: 3, text: 1 };

function words(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

function fieldScore(field: string, word: string, weight: number): number {
  const index = field.indexOf(word);
  if (index === -1) return 0;
  // A whole-word or word-start match counts more than one inside a word.
  const startsWord = index === 0 || /\W/.test(field[index - 1] ?? "");
  return weight * (startsWord ? 2 : 1);
}

function snippet(text: string, query: string[], fallback: string): string {
  const lower = text.toLowerCase();
  const at = query
    .map((w) => lower.indexOf(w))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b)[0];
  if (at === undefined) return fallback;
  const start = Math.max(0, at - 40);
  const end = Math.min(text.length, at + 100);
  return `${start > 0 ? "…" : ""}${text.slice(start, end).trim()}${end < text.length ? "…" : ""}`;
}

/** Ranked matches for a query: every word must appear somewhere in the section. */
export function search(entries: SearchEntry[], query: string, limit = 8): SearchResult[] {
  const q = words(query);
  if (q.length === 0) return [];
  const scored: { result: SearchResult; score: number }[] = [];
  for (const entry of entries) {
    const fields = {
      title: entry.title.toLowerCase(),
      heading: entry.heading?.text.toLowerCase() ?? "",
      description: entry.heading ? "" : entry.description.toLowerCase(),
      text: entry.text.toLowerCase(),
    };
    let score = 0;
    let matchesAll = true;
    for (const word of q) {
      const wordScore =
        fieldScore(fields.title, word, WEIGHTS.title) +
        fieldScore(fields.heading, word, WEIGHTS.heading) +
        fieldScore(fields.description, word, WEIGHTS.description) +
        fieldScore(fields.text, word, WEIGHTS.text);
      if (wordScore === 0) matchesAll = false;
      score += wordScore;
    }
    if (!matchesAll) continue;
    // A doc's intro is the better result when the title alone matches.
    if (!entry.heading) score += 0.5;
    scored.push({
      score,
      result: {
        entry,
        href: `/docs/${entry.slug}${entry.heading ? `#${entry.heading.id}` : ""}`,
        snippet: snippet(entry.text, q, entry.description),
      },
    });
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.result);
}
