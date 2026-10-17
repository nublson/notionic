import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchBlocks, fetchPage, type NotionClientLike } from "./fetch";
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

describe("linked pages", () => {
  const page = (id: string, title: string) => ({
    object: "page",
    id,
    url: `https://www.notion.so/${id}`,
    last_edited_time: "2026-10-17T00:00:00.000Z",
    icon: { type: "emoji", emoji: "📘" },
    cover: null,
    properties: { Name: { type: "title", title: [{ plain_text: title }] } },
  });
  const linkTo = (id: string, pageId: string) =>
    ({ ...block("link_to_page", { type: "page_id", page_id: pageId }, { id }) }) as NotionBlock;

  it("attaches the linked page's title and icon, and skips pages it can't read", async () => {
    const { client } = fakeClient({ root: [[linkTo("a", "p1"), linkTo("b", "secret")]] });
    const withPages = {
      ...client,
      pages: {
        async retrieve({ page_id }: { page_id: string }) {
          if (page_id === "secret") throw new Error("object_not_found");
          return page(page_id, "Getting started") as never;
        },
      },
    };
    const [a, b] = await fetchBlocks(withPages, "root");
    expect(a!.linkedPage).toEqual({
      id: "p1",
      title: "Getting started",
      icon: { type: "emoji", emoji: "📘" },
    });
    expect(b!.linkedPage).toBeUndefined();
  });

  describe("bookmarks", () => {
    afterEach(() => vi.unstubAllGlobals());
    const bookmark = (id: string, url: string) => block("bookmark", { url, caption: [] }, { id });

    it("attaches each bookmarked page's preview, and skips pages without one", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async (url: URL) =>
          url.pathname === "/post"
            ? new Response('<head><meta property="og:title" content="A post"></head>', {
                headers: { "content-type": "text/html" },
              })
            : new Response("", { status: 404 }),
        ),
      );
      const { client } = fakeClient({
        root: [
          [bookmark("a", "https://example.com/post"), bookmark("b", "https://example.com/gone")],
        ],
      });
      const [a, b] = await fetchBlocks(client, "root");
      expect(a!.bookmarkPreview).toMatchObject({ title: "A post" });
      expect(b!.bookmarkPreview).toBeUndefined();
    });

    it("makes no requests outside Notion with bookmarkPreviews: false", async () => {
      const fetch = vi.fn();
      vi.stubGlobal("fetch", fetch);
      const { client } = fakeClient({
        root: [[withChildren("toggle", "t")]],
        t: [[bookmark("a", "https://example.com/post")]],
      });
      const [toggle] = await fetchBlocks(client, "root", { bookmarkPreviews: false });
      expect(toggle!.children?.[0]?.bookmarkPreview).toBeUndefined();
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  it("fetchPage returns the page's metadata with its blocks", async () => {
    const { client } = fakeClient({ root: [[block("paragraph", {}, { id: "p" })]] });
    const result = await fetchPage(
      { ...client, pages: { retrieve: async () => page("root", "Docs") as never } },
      "root",
    );
    expect(result.page).toMatchObject({
      id: "root",
      title: "Docs",
      lastEditedTime: "2026-10-17T00:00:00.000Z",
    });
    expect(result.blocks.map((b) => b.id)).toEqual(["p"]);
  });
});
