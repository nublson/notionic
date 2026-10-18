"use client";

import { useEffect } from "react";

type ToolResult = { content: { type: "text"; text: string }[] };

type Tool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: Record<string, unknown>) => Promise<ToolResult>;
};

type ModelContext = {
  registerTool?: (tool: Tool, options?: { signal?: AbortSignal }) => unknown;
};

type SearchEntry = {
  slug: string;
  title: string;
  section: string;
  description: string;
  heading: { id: string; text: string } | null;
  text: string;
};

const text = (value: string): ToolResult => ({ content: [{ type: "text", text: value }] });

async function fetchText(url: string): Promise<string | null> {
  const response = await fetch(url);
  return response.ok ? response.text() : null;
}

/** The docs as tools for in-browser agents: list, search and read them. */
const TOOLS: Tool[] = [
  {
    name: "list_docs",
    description: "List every notionic doc, by section, with a link to its Markdown.",
    inputSchema: { type: "object", properties: {} },
    async execute() {
      return text((await fetchText("/llms.txt")) ?? "Couldn't load the docs index.");
    },
  },
  {
    name: "search_docs",
    description: "Search the notionic docs by keyword, in titles, headings and text.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "Words to search for." } },
      required: ["query"],
    },
    async execute(input) {
      const query = String(input.query ?? "")
        .trim()
        .toLowerCase();
      if (!query) return text("Give a query, or use list_docs for every doc.");
      const response = await fetch("/docs/search.json");
      if (!response.ok) return text("Couldn't load the search index.");
      const entries = (await response.json()) as SearchEntry[];
      const matches = entries.filter((entry) =>
        [entry.title, entry.heading?.text ?? "", entry.description, entry.text]
          .join(" ")
          .toLowerCase()
          .includes(query),
      );
      if (!matches.length) return text(`No docs match "${query}". Try list_docs.`);
      return text(
        matches
          .slice(0, 10)
          .map(
            (entry) =>
              `- ${entry.title}${entry.heading ? ` › ${entry.heading.text}` : ""} (${entry.section}): /docs/${entry.slug}${entry.heading ? `#${entry.heading.id}` : ""}, Markdown at /docs/${entry.slug}.md`,
          )
          .join("\n"),
      );
    },
  },
  {
    name: "read_doc",
    description: "Read one notionic doc as Markdown, by its slug (e.g. quick-start).",
    inputSchema: {
      type: "object",
      properties: { slug: { type: "string", description: "The doc's slug, from list_docs." } },
      required: ["slug"],
    },
    async execute(input) {
      const slug = String(input.slug ?? "");
      if (!/^[\w-]+$/.test(slug)) return text("Give a slug such as quick-start.");
      return text((await fetchText(`/docs/${slug}.md`)) ?? `No doc named "${slug}".`);
    },
  },
];

/**
 * Registers the docs tools with WebMCP (document.modelContext), for agents
 * running in the browser. The API is a draft, so any failure is ignored.
 */
export function WebMcp() {
  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (typeof context?.registerTool !== "function") return;
    const controller = new AbortController();
    for (const tool of TOOLS) {
      try {
        void Promise.resolve(context.registerTool(tool, { signal: controller.signal })).catch(
          () => {},
        );
      } catch {
        // A draft API: a shape change must never break the page.
      }
    }
    return () => controller.abort();
  }, []);
  return null;
}
