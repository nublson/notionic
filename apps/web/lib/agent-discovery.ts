import { SITE_URL } from "@/lib/site";

/**
 * Where agents find things on the site, advertised in the Link header of every
 * page (RFC 8288) and in the catalogs under /.well-known.
 */
export const DISCOVERY_LINKS = [
  `<${SITE_URL}/sitemap.xml>; rel="sitemap"`,
  `<${SITE_URL}/llms.txt>; rel="help"; type="text/plain"; title="Docs index for LLMs"`,
  `<${SITE_URL}/.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"`,
  `<${SITE_URL}/docs>; rel="service-doc"; type="text/html"`,
  `<${SITE_URL}/.well-known/agent-skills/index.json>; rel="describedby"; type="application/json"; title="Agent skills"`,
].join(", ");

/** Discovery documents are public: any origin, including in-browser agents, may read them. */
export const DISCOVERY_HEADERS = { "Access-Control-Allow-Origin": "*" };
