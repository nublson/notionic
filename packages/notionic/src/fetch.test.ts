import { describe, expect, it } from "vitest";
import { fetchBlocks, type NotionClientLike } from "./fetch";
import { block } from "./test-utils";
import type { NotionBlock } from "./types";

/** A fake client serving pages of children per block id. */
function fakeClient(children: Record<string, NotionBlock[][]>) {
  const calls: string[] = [];
  let inFlight = 0;
  let maxInFlight = 0;
  const client: NotionClientLike = {
    blocks: {
      children: {
        async list({ block_id, start_cursor }) {
          calls.push(`${block_id}@${start_cursor ?? 0}`);
          inFlight++;
          maxInFlight = Math.max(maxInFlight, inFlight);
          await new Promise((resolve) => setTimeout(resolve, 1));
          inFlight--;
          const pages = children[block_id] ?? [[]];
          const index = Number(start_cursor ?? 0);
          const hasMore = index + 1 < pages.length;
          return {
            object: "list",
            type: "block",
            block: {},
            results: pages[index] ?? [],
            has_more: hasMore,
            next_cursor: hasMore ? String(index + 1) : null,
          };
        },
      },
    },
  };
  return { client, calls, maxInFlight: () => maxInFlight };
}

const withChildren = (type: string, id: string) =>
  ({ ...block(type, {}, { id }), has_children: true }) as NotionBlock;

describe("fetchBlocks", () => {
  it("follows pagination and attaches nested children", async () => {
    const { client } = fakeClient({
      page: [[withChildren("toggle", "t")], [block("paragraph", {}, { id: "p" })]],
      t: [[block("paragraph", {}, { id: "inner" })]],
    });
    const blocks = await fetchBlocks(client, "page");
    expect(blocks.map((b) => b.id)).toEqual(["t", "p"]);
    expect(blocks[0]!.children?.map((b) => b.id)).toEqual(["inner"]);
  });

  it("skips partial results, child pages and databases", async () => {
    const { client, calls } = fakeClient({
      page: [
        [
          { object: "block", id: "partial" } as unknown as NotionBlock,
          withChildren("child_page", "cp"),
          withChildren("child_database", "cd"),
        ],
      ],
    });
    const blocks = await fetchBlocks(client, "page");
    expect(blocks.map((b) => b.id)).toEqual(["cp", "cd"]);
    expect(calls).toEqual(["page@0"]);
  });

  it("stops at maxDepth", async () => {
    const { client } = fakeClient({
      page: [[withChildren("toggle", "a")]],
      a: [[withChildren("toggle", "b")]],
      b: [[block("paragraph", {}, { id: "c" })]],
    });
    const [a] = await fetchBlocks(client, "page", { maxDepth: 1 });
    expect(a!.children?.[0]?.id).toBe("b");
    expect(a!.children?.[0]?.children).toBeUndefined();
  });

  it("limits requests in flight per level", async () => {
    const ids = Array.from({ length: 8 }, (_, i) => `t${i}`);
    const { client, maxInFlight } = fakeClient({
      page: [ids.map((id) => withChildren("toggle", id))],
    });
    await fetchBlocks(client, "page", { concurrency: 2 });
    expect(maxInFlight()).toBe(2);
  });
});
