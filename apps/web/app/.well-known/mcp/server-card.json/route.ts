import { DISCOVERY_HEADERS } from "@/lib/agent-discovery";
import { DOCS_TOOLS, MCP_SERVER_INFO } from "@/lib/docs-mcp";
import { SITE_URL } from "@/lib/site";

/** The MCP Server Card (SEP-1649) for the docs server at /api/mcp. */
const card = {
  $schema: "https://static.modelcontextprotocol.io/schemas/mcp-server-card/v1.json",
  name: MCP_SERVER_INFO.name,
  serverInfo: MCP_SERVER_INFO,
  transport: { type: "streamable-http", endpoint: `${SITE_URL}/api/mcp` },
  capabilities: { tools: { listChanged: false } },
  tools: Object.entries(DOCS_TOOLS).map(([name, { title, description }]) => ({
    name,
    title,
    description,
  })),
  authentication: { type: "none" },
  documentationUrl: `${SITE_URL}/llms.txt`,
  website: SITE_URL,
};

export function GET() {
  return new Response(JSON.stringify(card, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", ...DISCOVERY_HEADERS },
  });
}
