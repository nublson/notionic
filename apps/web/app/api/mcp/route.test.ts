import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SearchEntry } from "@/lib/search";

const llmsIndex = vi.fn();
const docMarkdown = vi.fn();
const searchIndex = vi.fn();
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ unstable_cache: <T>(fn: T) => fn }));
vi.mock("@/lib/docs-markdown", () => ({ llmsIndex, docMarkdown }));
vi.mock("@/lib/docs-search", () => ({ searchIndex }));

const { POST } = await import("./route");

const entries: SearchEntry[] = [
  {
    slug: "fetching",
    title: "Fetching pages",
    section: "Guides",
    description: "Get blocks from the Notion API.",
    heading: null,
    text: "fetchPage returns the page and blocks.",
  },
  {
    slug: "fetching",
    title: "Fetching pages",
    section: "Guides",
    description: "Get blocks from the Notion API.",
    heading: { id: "caching", text: "Caching" },
    text: "notionic doesn't cache. Use your framework's cache.",
  },
];

/** One JSON-RPC request, as an MCP client sends it; the result, from JSON or SSE. */
async function rpc(method: string, params: Record<string, unknown> = {}) {
  const response = await POST(
    new Request("http://localhost/api/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "mcp-protocol-version": "2025-06-18",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    }),
  );
  expect(response.status).toBe(200);
  const body = await response.text();
  const json = body.startsWith("{") ? body : (body.match(/^data: (.*)$/m)?.[1] ?? "");
  return JSON.parse(json).result;
}

async function call(name: string, args: Record<string, unknown> = {}) {
  const result = await rpc("tools/call", { name, arguments: args });
  return { text: result.content[0].text as string, isError: Boolean(result.isError) };
}

describe("POST /api/mcp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchIndex.mockResolvedValue(entries);
  });

  it("initializes as the notionic docs server, with tools", async () => {
    const result = await rpc("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "test", version: "1.0.0" },
    });
    expect(result.serverInfo).toMatchObject({ name: "notionic.dev", version: "1.0.0" });
    expect(result.capabilities.tools).toBeDefined();
  });

  it("lists the three docs tools", async () => {
    const { tools } = await rpc("tools/list");
    expect(tools.map((tool: { name: string }) => tool.name)).toEqual([
      "list_docs",
      "search_docs",
      "read_doc",
    ]);
  });

  it("list_docs returns the llms.txt index", async () => {
    llmsIndex.mockResolvedValue("# notionic\n");
    expect(await call("list_docs")).toEqual({ text: "# notionic\n", isError: false });
  });

  it("search_docs ranks matches and links to the section and its Markdown", async () => {
    const { text } = await call("search_docs", { query: "caching" });
    expect(text.split("\n")[0]).toBe("- Fetching pages › Caching (Guides)");
    expect(text).toContain("https://notionic.dev/docs/fetching#caching");
    expect(text).toContain(
      'Markdown at https://notionic.dev/docs/fetching.md (read_doc slug "fetching")',
    );
  });

  it("search_docs says so when nothing matches, or the query is empty", async () => {
    expect((await call("search_docs", { query: "nonsense" })).text).toContain("No docs match");
    expect((await call("search_docs", { query: "  " })).text).toContain("Give a query");
    expect(searchIndex).toHaveBeenCalledTimes(1);
  });

  it("read_doc returns a doc's Markdown by slug", async () => {
    docMarkdown.mockResolvedValue("# Quick start\n");
    expect(await call("read_doc", { slug: "Quick-Start" })).toEqual({
      text: "# Quick start\n",
      isError: false,
    });
    expect(docMarkdown).toHaveBeenCalledWith("quick-start");
  });

  it("read_doc errors for an unknown or malformed slug", async () => {
    docMarkdown.mockResolvedValue(null);
    expect(await call("read_doc", { slug: "missing" })).toMatchObject({ isError: true });
    expect(await call("read_doc", { slug: "../secrets" })).toMatchObject({ isError: true });
    expect(docMarkdown).toHaveBeenCalledTimes(1);
  });
});
