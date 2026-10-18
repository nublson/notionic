import { DISCOVERY_HEADERS } from "@/lib/agent-discovery";
import { SITE_URL } from "@/lib/site";

/** The site's public, read-only APIs (RFC 9727), as a linkset (RFC 9264). */
const catalog = {
  linkset: [
    {
      anchor: `${SITE_URL}/r/registry.json`,
      "service-desc": [{ href: `${SITE_URL}/r/registry.json`, type: "application/json" }],
      "service-doc": [{ href: `${SITE_URL}/docs/registry`, type: "text/html" }],
    },
    {
      anchor: `${SITE_URL}/docs/search.json`,
      "service-doc": [{ href: `${SITE_URL}/docs`, type: "text/html" }],
    },
    {
      anchor: `${SITE_URL}/docs/{slug}.md`,
      "service-desc": [{ href: `${SITE_URL}/llms.txt`, type: "text/plain" }],
      "service-doc": [{ href: `${SITE_URL}/llms-full.txt`, type: "text/plain" }],
    },
    {
      anchor: `${SITE_URL}/api/mcp`,
      "service-desc": [
        {
          href: `${SITE_URL}/.well-known/mcp/server-card.json`,
          type: "application/mcp-server-card+json",
        },
      ],
      "service-doc": [{ href: `${SITE_URL}/llms.txt`, type: "text/plain" }],
    },
  ],
};

export function GET() {
  return new Response(JSON.stringify(catalog, null, 2), {
    headers: { "Content-Type": "application/linkset+json", ...DISCOVERY_HEADERS },
  });
}
