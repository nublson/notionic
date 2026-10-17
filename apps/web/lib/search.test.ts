import { describe, expect, it } from "vitest";
import { type SearchEntry, search } from "./search";

const entry = (overrides: Partial<SearchEntry>): SearchEntry => ({
  slug: "doc",
  title: "Doc",
  section: "Guides",
  description: "",
  heading: null,
  text: "",
  ...overrides,
});

const entries: SearchEntry[] = [
  entry({
    slug: "fetching",
    title: "Fetching pages",
    description: "Get blocks from the Notion API.",
    text: "fetchPage returns the page and blocks.",
  }),
  entry({
    slug: "fetching",
    title: "Fetching pages",
    heading: { id: "caching", text: "Caching" },
    text: "notionic doesn't cache. Use your framework's cache.",
  }),
  entry({
    slug: "styling",
    title: "Styling",
    text: "Override the --notionic-red variable to change Notion's colors and caching nothing.",
  }),
];

describe("search", () => {
  it("ranks a title match above text matches", () => {
    expect(search(entries, "fetching")[0]?.href).toBe("/docs/fetching");
  });

  it("links heading matches to their section", () => {
    const [first] = search(entries, "caching");
    expect(first?.href).toBe("/docs/fetching#caching");
  });

  it("requires every word of the query", () => {
    expect(search(entries, "cache framework").map((r) => r.href)).toEqual([
      "/docs/fetching#caching",
    ]);
    expect(search(entries, "cache nonsense")).toEqual([]);
  });

  it("returns nothing for an empty query, and caps results", () => {
    expect(search(entries, "   ")).toEqual([]);
    expect(
      search(
        Array.from({ length: 20 }, () => entries[0]!),
        "fetch",
        5,
      ),
    ).toHaveLength(5);
  });

  it("shows a snippet around the match, or the description", () => {
    const [styling] = search(entries, "variable");
    expect(styling?.snippet).toContain("--notionic-red variable");
    const [intro] = search(entries, "pages");
    expect(intro?.snippet).toBe("Get blocks from the Notion API.");
  });
});
