import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { DOCS_TOOLS, MCP_SERVER_INFO } from "@/lib/docs-mcp";

export const runtime = "nodejs";

const { list_docs, search_docs, read_doc } = DOCS_TOOLS;

/**
 * A read-only MCP server for the docs (Streamable HTTP, stateless, no auth):
 * a fresh server answers each request.
 */
const handler = createMcpHandler(
  () => {
    const server = new McpServer(MCP_SERVER_INFO, {
      capabilities: { tools: { listChanged: false } },
    });
    server.registerTool("list_docs", list_docs, () => list_docs.run());
    server.registerTool("search_docs", search_docs, (input) => search_docs.run(input));
    server.registerTool("read_doc", read_doc, (input) => read_doc.run(input));
    return server;
  },
  // One JSON body per request: the tools send no progress, and nothing streams.
  { responseMode: "json" },
);

export const GET = handler.fetch;
export const POST = handler.fetch;
export const DELETE = handler.fetch;
