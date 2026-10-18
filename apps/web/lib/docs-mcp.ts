import "server-only";

import { unstable_cache } from "next/cache";
import * as z from "zod/v4";
import { docMarkdown, llmsIndex } from "./docs-markdown";
import { searchIndex } from "./docs-search";
import { search } from "./search";
import { DOCS_CACHE_TAG, SITE_URL } from "./site";

/** The MCP server at /api/mcp, as its server card and initialize describe it. */
export const MCP_SERVER_INFO = {
  name: "notionic.dev",
  title: "notionic docs",
  version: "1.0.0",
  description:
    "Read-only MCP server for the notionic docs: list, search and read them as Markdown.",
};

type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };

const text = (value: string): ToolResult => ({ content: [{ type: "text", text: value }] });
const error = (value: string): ToolResult => ({ ...text(value), isError: true });

// The route is dynamic, so the Notion data is cached here, like the pages
// (an hour, or until the Notion webhook revalidates DOCS_CACHE_TAG).
const cache = { revalidate: 3600, tags: [DOCS_CACHE_TAG] };
const cachedIndex = unstable_cache(llmsIndex, ["mcp", "llms-index"], cache);
const cachedSearchIndex = unstable_cache(searchIndex, ["mcp", "search-index"], cache);
const cachedDoc = unstable_cache(docMarkdown, ["mcp", "doc"], cache);

/** The docs as MCP tools, mirroring the WebMCP tools in components/webmcp.tsx. */
export const DOCS_TOOLS = {
  list_docs: {
    title: "List docs",
    description: "List every notionic doc, by section, with a link to its Markdown.",
    inputSchema: z.object({}),
    async run(): Promise<ToolResult> {
      return text(await cachedIndex());
    },
  },
  search_docs: {
    title: "Search docs",
    description:
      "Search the notionic docs by keyword, in titles, headings and text. Every word must match.",
    inputSchema: z.object({ query: z.string().describe("Words to search for.") }),
    async run({ query }: { query: string }): Promise<ToolResult> {
      if (!query.trim()) return text("Give a query, or use list_docs for every doc.");
      const results = search(await cachedSearchIndex(), query, 10);
      if (!results.length) return text(`No docs match "${query}". Try list_docs.`);
      return text(
        results
          .map(({ entry, href, snippet }) =>
            [
              `- ${entry.title}${entry.heading ? ` › ${entry.heading.text}` : ""} (${entry.section})`,
              `  ${SITE_URL}${href}, Markdown at ${SITE_URL}/docs/${entry.slug}.md (read_doc slug "${entry.slug}")`,
              snippet ? `  ${snippet}` : "",
            ]
              .filter(Boolean)
              .join("\n"),
          )
          .join("\n"),
      );
    },
  },
  read_doc: {
    title: "Read doc",
    description: "Read one notionic doc as Markdown, by its slug (e.g. quick-start).",
    inputSchema: z.object({ slug: z.string().describe("The doc's slug, from list_docs.") }),
    async run({ slug }: { slug: string }): Promise<ToolResult> {
      const normalized = slug.trim().toLowerCase();
      if (!/^[\w-]+$/.test(normalized)) return error("Give a slug such as quick-start.");
      const markdown = await cachedDoc(normalized);
      return markdown ? text(markdown) : error(`No doc named "${slug}". Use list_docs for slugs.`);
    },
  },
};
