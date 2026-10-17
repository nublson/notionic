import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { DISCOVERY_HEADERS } from "@/lib/agent-discovery";
import { SITE_URL } from "@/lib/site";

// The skill's file is in public/; its digest is computed here, at build time,
// so it always matches what's served.
const SKILL = "/.well-known/agent-skills/notionic/SKILL.md";

/** The agent skills discovery index (Agent Skills Discovery RFC v0.2.0). */
export async function GET() {
  const file = await readFile(path.join(process.cwd(), "public", SKILL));
  const index = {
    $schema: "https://schemas.agentskills.io/discovery/0.2.0/schema.json",
    skills: [
      {
        name: "notionic",
        type: "skill-md",
        description:
          "Add notionic to a React or Next.js project: fetch Notion pages and render them as React Server Components with Tailwind CSS and shadcn/ui.",
        url: `${SITE_URL}${SKILL}`,
        digest: `sha256:${createHash("sha256").update(file).digest("hex")}`,
      },
    ],
  };
  return new Response(JSON.stringify(index, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", ...DISCOVERY_HEADERS },
  });
}
