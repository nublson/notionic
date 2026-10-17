import "server-only";

import { Client } from "@notionhq/client";

let client: { token: string; api: Client } | null = null;

/**
 * The site's Notion client, or null without NOTION_TOKEN.
 *
 * Builds prerender every docs page at once, and preview builds share the
 * notionic-dev token, so Notion rate-limits them (429 with retry-after).
 * The client honors retry-after; it retries 8 times instead of 2, each wait
 * capped at a minute.
 */
export function notionClient(): Client | null {
  const token = process.env.NOTION_TOKEN;
  if (!token) return null;
  if (client?.token !== token) {
    client = { token, api: new Client({ auth: token, retry: { maxRetries: 8 } }) };
  }
  return client.api;
}
