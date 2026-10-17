import type {
  GetPageParameters,
  GetPageResponse,
  ListBlockChildrenParameters,
  ListBlockChildrenResponse,
  PageObjectResponse,
} from "@notionhq/client";
import { toLinkedPage, toNotionPage } from "./page";
import type { NotionBlock, NotionPage } from "./types";

/**
 * The part of the Notion client notionic uses. A `Client` from
 * `@notionhq/client` satisfies it. Without `pages`, `link_to_page` blocks
 * get no titles.
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
};

type Result = ListBlockChildrenResponse["results"][number];

function isFullBlock(result: Result): result is NotionBlock {
  return "type" in result;
}

async function listChildren(
  client: NotionClientLike,
  blockId: string,
): Promise<NotionBlock[]> {
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
      results[i] = await mapper(items[i]!);
    }
  }
  const workers = Math.min(Math.max(1, limit), items.length);
  await Promise.all(Array.from({ length: workers }, worker));
  return results;
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
  const { maxDepth = 5, concurrency = 3 } = options;
  const blocks = await listChildren(client, blockId);

  return mapPool(blocks, concurrency, async (block) => {
    if (block.type === "link_to_page" && block.link_to_page.type === "page_id") {
      const page = await retrievePage(client, block.link_to_page.page_id);
      return page ? { ...block, linkedPage: toLinkedPage(page) } : block;
    }
    if (
      !block.has_children ||
      maxDepth <= 0 ||
      block.type === "child_page" ||
      block.type === "child_database"
    ) {
      return block;
    }
    return {
      ...block,
      children: await fetchBlocks(client, block.id, {
        maxDepth: maxDepth - 1,
        concurrency,
      }),
    };
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
