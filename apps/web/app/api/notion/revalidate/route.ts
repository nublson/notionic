import { createHmac, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function safeEqual(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** `X-Notion-Signature`: `sha256=` + HMAC-SHA256 of the raw body, keyed by the verification token. */
function signatureMatches(body: string, signature: string, key: string): boolean {
  const expected = `sha256=${createHmac("sha256", key).update(body).digest("hex")}`;
  return safeEqual(signature, expected);
}

/** The shared secret, as `Authorization: Bearer` or `?secret=`, for refreshing by hand. */
function manualSecretMatches(request: NextRequest): boolean {
  const expected = process.env.NOTION_REVALIDATION_SECRET?.trim();
  if (!expected) return false;
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const given = (bearer ?? request.nextUrl.searchParams.get("secret"))?.trim();
  return given ? safeEqual(given, expected) : false;
}

/** The token Notion sends once, when a webhook subscription is created. */
function readVerificationToken(body: string): string | null {
  try {
    const parsed: unknown = JSON.parse(body);
    if (parsed && typeof parsed === "object" && "verification_token" in parsed) {
      const token = (parsed as { verification_token: unknown }).verification_token;
      // One printable "word", so a forged request can't write fake log lines.
      return typeof token === "string" && /^[\x21-\x7e]{1,256}$/.test(token) ? token : null;
    }
  } catch {
    // Not JSON.
  }
  return null;
}

/**
 * Refreshes every page (the landing page and the docs) on its next visit,
 * instead of waiting for the hourly revalidation. Called by:
 * - a Notion webhook subscription on the integration, whose events are
 *   signed with `X-Notion-Signature` using its verification token,
 *   NOTION_WEBHOOK_SECRET. Creating the subscription first sends
 *   `{ verification_token }`; it's logged so it can be pasted back into
 *   Notion's Verify dialog and saved as NOTION_WEBHOOK_SECRET;
 * - by hand: POST with NOTION_REVALIDATION_SECRET as a Bearer token or `?secret=`.
 * Event bodies aren't read: the site has few pages, so everything refreshes.
 */
export async function POST(request: NextRequest) {
  const body = await request.text();

  // Anyone can send this. It changes nothing; it only logs the token.
  const verificationToken = readVerificationToken(body);
  if (verificationToken) {
    console.info(
      `[notion] Webhook verification token: ${verificationToken}. Paste it into the subscription's Verify dialog, and set NOTION_WEBHOOK_SECRET to it.`,
    );
    return NextResponse.json({ received: true });
  }

  const signature = request.headers.get("x-notion-signature");
  if (signature) {
    const webhookSecret = process.env.NOTION_WEBHOOK_SECRET?.trim();
    if (!webhookSecret || !signatureMatches(body, signature, webhookSecret)) {
      console.warn(
        webhookSecret
          ? "[notion] Webhook event rejected: X-Notion-Signature doesn't match NOTION_WEBHOOK_SECRET."
          : "[notion] Webhook event rejected: NOTION_WEBHOOK_SECRET is not set.",
      );
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (!manualSecretMatches(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  revalidatePath("/", "layout");
  return NextResponse.json({ revalidated: true, now: Date.now() });
}
