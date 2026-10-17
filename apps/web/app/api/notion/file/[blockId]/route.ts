import { isFullBlock } from "@notionhq/client";
import { NextResponse } from "next/server";
import { notionClient } from "@/lib/notion";

export const runtime = "nodejs";

const BLOCK_ID = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

/** Longest the CDN may serve a redirect, and how long before expiry it must stop. */
const MAX_CACHE_SECONDS = 30 * 60;
const SAFETY_SECONDS = 5 * 60;

type HostedFile = { url: string; expiry_time: string };

/** The uploaded file of a media block (image, video, file…), or of a block's icon. */
function hostedFile(block: Record<string, unknown> & { type: string }): HostedFile | null {
  const payload = block[block.type] as
    | { type?: string; file?: HostedFile; icon?: { type?: string; file?: HostedFile } | null }
    | undefined;
  if (payload?.type === "file" && payload.file) return payload.file;
  if (payload?.icon?.type === "file" && payload.icon.file) return payload.icon.file;
  return null;
}

/**
 * Redirects to a fresh signed URL for a file uploaded to Notion. Those URLs
 * expire after an hour, so pages link here (via `transformFileUrl`) instead:
 * each request looks the block up again. The redirect is cached on the CDN
 * for at most 30 minutes, and never past 5 minutes before the URL expires.
 * Only blocks the integration can read are reachable.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ blockId: string }> }) {
  const { blockId } = await params;
  const client = notionClient();
  if (!client || !BLOCK_ID.test(blockId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let file: HostedFile | null = null;
  try {
    const block = await client.blocks.retrieve({ block_id: blockId });
    if (isFullBlock(block))
      file = hostedFile(block as unknown as Record<string, unknown> & { type: string });
  } catch {
    // Missing, or not shared with the integration.
  }
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const secondsLeft = Math.floor((Date.parse(file.expiry_time) - Date.now()) / 1000);
  const cacheSeconds = Math.max(0, Math.min(MAX_CACHE_SECONDS, secondsLeft - SAFETY_SECONDS));
  const response = NextResponse.redirect(file.url, 307);
  // Browsers ask again each time; the CDN answers until shortly before the URL expires.
  response.headers.set("Cache-Control", `public, max-age=0, s-maxage=${cacheSeconds}`);
  return response;
}
