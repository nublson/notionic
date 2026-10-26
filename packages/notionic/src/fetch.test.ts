import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchBlocks, fetchPage, type NotionClientLike } from "./fetch";
import { block, richText } from "./test-utils";
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

  it("attaches each subpage's icon", async () => {
    const { client } = fakeClient({
      root: [[block("child_page", { title: "Intro" }, { id: "p1" })]],
    });
    const withPages = {
      ...client,
      pages: {
        retrieve: async ({ page_id }: { page_id: string }) => page(page_id, "Intro") as never,
      },
    };
    const [child] = await fetchBlocks(withPages, "root");
    expect(child!.linkedPage?.icon).toEqual({ type: "emoji", emoji: "📘" });
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

    it("attaches previews to embeds and link previews too", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(
          async () =>
            new Response('<head><meta property="og:title" content="A pen"></head>', {
              headers: { "content-type": "text/html" },
            }),
        ),
      );
      const { client } = fakeClient({
        root: [
          [
            block("embed", { url: "https://example.com/pen", caption: [] }, { id: "e" }),
            block("link_preview", { url: "https://example.com/pr" }, { id: "l" }),
          ],
        ],
      });
      const [embed, preview] = await fetchBlocks(client, "root");
      expect(embed!.bookmarkPreview).toMatchObject({ title: "A pen" });
      expect(preview!.bookmarkPreview).toMatchObject({ title: "A pen" });
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

describe("link favicons", () => {
  afterEach(() => vi.unstubAllGlobals());

  const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const para = (id: string, ...hrefs: string[]) =>
    block("paragraph", { rich_text: hrefs.map((href) => richText("x", { href })) }, { id });

  /** Serves Google's icon for every host but the ones listed, which have none. */
  function stubProviders(missing: string[] = []) {
    const fetch = vi.fn(async (url: URL | string) => {
      const { searchParams, hostname } = new URL(String(url));
      const host = searchParams.get("domain") ?? hostname;
      const found = !missing.some((name) => String(url).includes(name));
      return found && host
        ? new Response(PNG, { status: 200 })
        : new Response(null, { status: 404 });
    });
    vi.stubGlobal("fetch", fetch);
    return fetch;
  }

  it("attaches each linked site's favicon by host, looking each host up once", async () => {
    const fetch = stubProviders(["none.example"]);
    const { client } = fakeClient({
      root: [
        [
          para("a", "https://github.com/nublson", "https://GitHub.com/other", "/docs", "#top"),
          para("b", "https://github.com/x", "https://none.example/"),
          withChildren("toggle", "t"),
          block("image", {
            type: "external",
            external: { url: "https://cdn.example.com/a.png" },
            caption: [richText("pen", { href: "https://codepen.io/pen" })],
          }),
        ],
      ],
      t: [[para("nested", "https://sonner.emilkowal.ski/")]],
    });
    const [a, b, toggle, image] = await fetchBlocks(client, "root", { linkFavicons: true });
    expect(Object.keys(a!.linkFavicons ?? {})).toEqual(["github.com"]);
    expect(a!.linkFavicons?.["github.com"]).toMatch(/^data:image\/png;base64,/);
    // A host without an icon is left out; a block with no icons gets no record.
    expect(b!.linkFavicons).toEqual({ "github.com": a!.linkFavicons?.["github.com"] });
    expect(toggle!.children?.[0]?.linkFavicons).toHaveProperty("sonner.emilkowal.ski");
    expect(image!.linkFavicons).toHaveProperty("codepen.io");
    const asked = fetch.mock.calls.map(([url]) => String(url));
    expect(asked.filter((url) => url.includes("github.com"))).toHaveLength(1);
    // Google, then DuckDuckGo for the host Google had none for.
    expect(asked.filter((url) => url.includes("none.example"))).toHaveLength(2);
  });

  it("never looks up Notion pages, and makes no requests by default", async () => {
    const fetch = stubProviders();
    const { client } = fakeClient({
      root: [
        [
          para(
            "a",
            `/${"244b17268ab383c3938887a7a5748b73"}`,
            "https://www.notion.so/Title-244b17268ab383c3938887a7a5748b73",
            "mailto:a@b.co",
          ),
        ],
      ],
    });
    const [a] = await fetchBlocks(client, "root", { linkFavicons: true });
    expect(a!.linkFavicons).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();

    const { client: other } = fakeClient({ root: [[para("b", "https://example.com/")]] });
    const [b] = await fetchBlocks(other, "root");
    expect(b!.linkFavicons).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });
});
