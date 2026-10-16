import type {
  ListBlockChildrenParameters,
  ListBlockChildrenResponse,
} from "@notionhq/client";
import type { NotionBlock } from "./types";

/**
 * The part of the Notion client `fetchBlocks` uses. A `Client` from
 * `@notionhq/client` satisfies it.
 */
export type NotionClientLike = {
  blocks: {
    children: {
      list(args: ListBlockChildrenParameters): Promise<ListBlockChildrenResponse>;
    };
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
