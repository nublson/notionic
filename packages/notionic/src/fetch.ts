import type {
  GetPageParameters,
  GetPageResponse,
  ListBlockChildrenParameters,
  ListBlockChildrenResponse,
  PageObjectResponse,
} from "@notionhq/client";
import { fetchBookmarkPreview, isPrivateHost } from "./bookmark-preview";
import { type FaviconLookups, fetchLinkFavicon, lookupLinkFavicon } from "./link-favicons";
import { externalLinkHost } from "./links";
import { toLinkedPage, toNotionPage } from "./page";
import type { NotionBlock, NotionPage } from "./types";
import { richTexts } from "./utils";

/**
 * The part of the Notion client notionic uses. A `Client` from
 * `@notionhq/client` satisfies it. Without `pages`, `link_to_page` blocks
 * get no titles and subpages no icons.
 */
export type NotionClientLike = {
  blocks: {
    children: {
      list(args: ListBlockChildrenParameters): Promise<ListBlockChildrenResponse>;
    };
  };
  pages?: {
    retrieve(args: GetPageParameters): Promise<GetPageResponse>;
  };
};

export type FetchBlocksOptions = {
  /** How many levels of nested blocks to fetch below the top level. Default 5. */
  maxDepth?: number;
  /**
   * Max child-block requests in flight per level. Default 3, Notion's average
   * rate limit per second.
   */
  concurrency?: number;
  /**
   * Fetch the page behind each bookmark, embed and link preview to read its
   * title, description and image for a preview card. Default true. A page
   * that's slow, unreachable or has no title renders as a one-line card.
   */
  bookmarkPreviews?: boolean;
  /**
   * Fetch the favicon of each site linked from text (Google's favicon
   * service, then DuckDuckGo's) and attach it to the block as `linkFavicons`,
   * by host, for `<NotionRenderer linkFavicons>`. Default false. Each host is
   * looked up once per call; a subdomain without an icon gets its parent
   * domain's. A site with none is recorded as null (a globe); a host the
   * services can't answer for within 3 seconds is left out, so the next
   * fetch asks again. Private hosts are never sent.
   */
  linkFavicons?: boolean;
};

type Result = ListBlockChildrenResponse["results"][number];

/** The URL of a block that links to another site: a bookmark, embed or link preview. */
function linkedUrl(block: Result): string | null {
  if (!("type" in block)) return null;
  if (block.type === "bookmark") return block.bookmark.url;
  if (block.type === "embed") return block.embed.url;
  if (block.type === "link_preview") return block.link_preview.url;
  return null;
}

function isFullBlock(result: Result): result is NotionBlock {
  return "type" in result;
}

async function listChildren(client: NotionClientLike, blockId: string): Promise<NotionBlock[]> {
  const blocks: NotionBlock[] = [];
  let cursor: string | undefined;
  do {
    const page = await client.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
    });
    blocks.push(...page.results.filter(isFullBlock));
    cursor = page.has_more ? (page.next_cursor ?? undefined) : undefined;
  } while (cursor);
  return blocks;
}

/** A full page, or null when the integration can't read it. */
async function retrievePage(
  client: NotionClientLike,
  pageId: string,
): Promise<PageObjectResponse | null> {
  if (!client.pages) return null;
  try {
    const page = await client.pages.retrieve({ page_id: pageId });
    return "properties" in page ? page : null;
  } catch {
    return null;
  }
}

/** Maps items with at most `limit` mapper calls in flight. */
async function mapPool<T, R>(
  items: readonly T[],
  limit: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    while (next < items.length) {
      const i = next++;
      // biome-ignore lint/style/noNonNullAssertion: i < items.length
      results[i] = await mapper(items[i]!);
    }
  }
  const workers = Math.min(Math.max(1, limit), items.length);
  await Promise.all(Array.from({ length: workers }, worker));
  return results;
}

/** The block with the favicons of the sites its text links to, when any was looked up. */
async function withLinkFavicons(block: NotionBlock, lookups: FaviconLookups): Promise<NotionBlock> {
  const hosts = new Set<string>();
  for (const text of richTexts(block)) {
    for (const item of text) {
      const host = externalLinkHost(item.href);
      // Private hosts aren't sent to the favicon services.
      if (host && !isPrivateHost(host)) hosts.add(host);
    }
  }
  if (hosts.size === 0) return block;
  const icons = await Promise.all(
    [...hosts].map(async (host) => [host, await lookupLinkFavicon(host, lookups)] as const),
  );
  // null records a site without an icon; a host the services couldn't answer
  // for is left out, so the next fetch asks again.
  const linkFavicons: Record<string, string | null> = {};
  for (const [host, icon] of icons) {
    if (icon !== undefined) linkFavicons[host] = icon;
  }
  return Object.keys(linkFavicons).length > 0 ? { ...block, linkFavicons } : block;
}

type FetchState = {
  concurrency: number;
  bookmarkPreviews: boolean;
  /** Present when favicons are fetched. */
  faviconLookups?: FaviconLookups;
};

async function fetchTree(
  client: NotionClientLike,
  blockId: string,
  maxDepth: number,
  state: FetchState,
): Promise<NotionBlock[]> {
  const blocks = await listChildren(client, blockId);

  return mapPool(blocks, state.concurrency, async (fetched) => {
    const block = state.faviconLookups
      ? await withLinkFavicons(fetched, state.faviconLookups)
      : fetched;
    if (block.type === "link_to_page" && block.link_to_page.type === "page_id") {
      const page = await retrievePage(client, block.link_to_page.page_id);
      return page ? { ...block, linkedPage: toLinkedPage(page) } : block;
    }
    // A subpage's block holds only its title; its page has the icon.
    if (block.type === "child_page") {
      const page = await retrievePage(client, block.id);
      return page ? { ...block, linkedPage: toLinkedPage(page) } : block;
    }
    const previewUrl = state.bookmarkPreviews ? linkedUrl(block) : null;
    if (previewUrl) {
      const preview = await fetchBookmarkPreview(previewUrl);
      return preview ? { ...block, bookmarkPreview: preview } : block;
    }
    if (!block.has_children || maxDepth <= 0 || block.type === "child_database") {
      return block;
    }
    return {
      ...block,
      children: await fetchTree(client, block.id, maxDepth - 1, state),
    };
  });
}

/**
 * Every block of a page (or any block), with nested blocks attached as
 * `children`, ready for `<NotionRenderer>`.
 *
 * Child pages and databases are separate documents, so their content is not
 * fetched. Caching is left to your framework.
 */
export async function fetchBlocks(
  client: NotionClientLike,
  blockId: string,
  options: FetchBlocksOptions = {},
): Promise<NotionBlock[]> {
  const { maxDepth = 5, concurrency = 3, bookmarkPreviews = true, linkFavicons = false } = options;
  return fetchTree(client, blockId, maxDepth, {
    concurrency,
    bookmarkPreviews,
    faviconLookups: linkFavicons ? new Map() : undefined,
  });
}

/**
 * A page's metadata (title, icon, cover, properties…) and every block of it.
 * Throws if the page doesn't exist or isn't shared with the integration.
 */
export async function fetchPage(
  client: NotionClientLike & { pages: NonNullable<NotionClientLike["pages"]> },
  pageId: string,
  options: FetchBlocksOptions = {},
): Promise<{ page: NotionPage; blocks: NotionBlock[] }> {
  const [page, blocks] = await Promise.all([
    client.pages.retrieve({ page_id: pageId }),
    fetchBlocks(client, pageId, options),
  ]);
  if (!("properties" in page)) {
    throw new Error(`notionic: page ${pageId} returned without its properties`);
  }
  return { page: toNotionPage(page), blocks };
}

/** A page's title, description, image and favicon, read from its HTML; null if it has none. */
export { fetchBookmarkPreview };
/** A site's favicon as a data URL, as `linkFavicons` fetches it; null if it has none. */
export { fetchLinkFavicon };
