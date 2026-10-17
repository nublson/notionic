import { SITE_URL } from "@/lib/site";

// A route rather than robots.ts, which has no way to write Content-Signal.
// Content Signals (contentsignals.org): the docs may be indexed, quoted in AI
// answers and used for training, so agents can learn notionic.
const ROBOTS = `User-Agent: *
Allow: /
Content-Signal: search=yes, ai-input=yes, ai-train=yes

Sitemap: ${SITE_URL}/sitemap.xml
`;

export function GET() {
  return new Response(ROBOTS, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
