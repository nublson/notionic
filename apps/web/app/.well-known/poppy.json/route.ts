import { DISCOVERY_HEADERS } from "@/lib/agent-discovery";
import { SITE_URL } from "@/lib/site";

/**
 * The Personal Agent Protocol manifest (personalagentprotocol.org): a
 * website-only declaration. Nothing on the site needs sign-in, so there's no
 * auth issuer, and agents browse it like anyone else.
 */
const manifest = {
  protocol_version: "0.1",
  organization: { name: "notionic", domain: new URL(SITE_URL).host },
  web: {},
};

export function GET() {
  return new Response(JSON.stringify(manifest, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", ...DISCOVERY_HEADERS },
  });
}
