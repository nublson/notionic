import { DISCOVERY_HEADERS } from "@/lib/agent-discovery";
import { SITE_URL } from "@/lib/site";

const HOST = new URL(SITE_URL).host;

/** What the site offers agents, as an ARD manifest (agenticresourcediscovery.org). */
const catalog = {
  specVersion: "1.0",
  host: {
    displayName: "notionic",
    identifier: `did:web:${HOST}`,
    documentationUrl: `${SITE_URL}/llms.txt`,
  },
  entries: [
    {
      identifier: `urn:air:${HOST}:docs:llms`,
      displayName: "notionic docs index",
      description: "Every notionic doc, by section, linking to its Markdown.",
      type: "text/plain",
      url: `${SITE_URL}/llms.txt`,
      tags: ["llms-txt", "documentation", "notion", "react"],
      representativeQueries: [
        "how do I render Notion pages in React",
        "notionic documentation",
        "render Notion blocks as React Server Components",
      ],
    },
    {
      identifier: `urn:air:${HOST}:docs:full`,
      displayName: "notionic docs, in one file",
      description: "All notionic docs as one Markdown file.",
      type: "text/plain",
      url: `${SITE_URL}/llms-full.txt`,
      tags: ["llms-txt", "documentation"],
      representativeQueries: ["read all of notionic's documentation", "notionic API reference"],
    },
    {
      identifier: `urn:air:${HOST}:skills:index`,
      displayName: "notionic agent skills",
      description:
        "A skill for adding notionic to a project: install, fetch, render, style and extend.",
      type: "application/agent-skills+json",
      url: `${SITE_URL}/.well-known/agent-skills/index.json`,
      tags: ["agent-skills", "notion", "react", "nextjs"],
      representativeQueries: [
        "add a Notion CMS to a Next.js app",
        "skill for rendering Notion pages with shadcn/ui",
      ],
    },
    {
      identifier: `urn:air:${HOST}:api:catalog`,
      displayName: "notionic public APIs",
      description: "The shadcn registry, the docs search index and the docs as Markdown.",
      type: "application/linkset+json",
      url: `${SITE_URL}/.well-known/api-catalog`,
      tags: ["api-catalog", "shadcn-registry", "read-only"],
      representativeQueries: ["notionic shadcn registry", "search notionic docs over HTTP"],
    },
  ],
};

export function GET() {
  return new Response(JSON.stringify(catalog, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", ...DISCOVERY_HEADERS },
  });
}
