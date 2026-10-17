import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const retrieve = vi.fn();
vi.mock("server-only", () => ({}));
vi.mock("@notionhq/client", () => ({
  Client: class {
    blocks = { retrieve };
  },
  isFullBlock: (block: { type?: string }) => "type" in block,
}));

const { GET } = await import("./route");

const ID = "3fcb1726-8ab3-81d7-b265-ff9229b44af9";
const call = (blockId: string) =>
  GET(new Request("http://localhost/x"), { params: Promise.resolve({ blockId }) });
const inMinutes = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();
const signed = "https://prod-files-secure.s3.amazonaws.com/a.png?X-Amz-Signature=fresh";

describe("GET /api/notion/file/[blockId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NOTION_TOKEN", "secret_test");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("redirects to a fresh signed URL for an uploaded image", async () => {
    retrieve.mockResolvedValue({
      type: "image",
      image: { type: "file", file: { url: signed, expiry_time: inMinutes(60) } },
    });
    const res = await call(ID);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(signed);
    expect(res.headers.get("cache-control")).toBe("public, max-age=0, s-maxage=1800");
    expect(retrieve).toHaveBeenCalledWith({ block_id: ID });
  });

  it("caches only until shortly before the URL expires", async () => {
    retrieve.mockResolvedValue({
      type: "file",
      file: { type: "file", file: { url: signed, expiry_time: inMinutes(10) } },
    });
    const res = await call(ID);
    const maxAge = Number(res.headers.get("cache-control")?.match(/s-maxage=(\d+)/)?.[1]);
    expect(maxAge).toBeGreaterThan(290);
    expect(maxAge).toBeLessThanOrEqual(300);
  });

  it("serves an uploaded callout icon", async () => {
    retrieve.mockResolvedValue({
      type: "callout",
      callout: { icon: { type: "file", file: { url: signed, expiry_time: inMinutes(60) } } },
    });
    expect((await call(ID)).headers.get("location")).toBe(signed);
  });

  it("returns 404 for external files, blocks without files, unreadable blocks and bad ids", async () => {
    retrieve.mockResolvedValueOnce({
      type: "image",
      image: { type: "external", external: { url: "https://x.y/a.png" } },
    });
    expect((await call(ID)).status).toBe(404);
    retrieve.mockResolvedValueOnce({ type: "paragraph", paragraph: { rich_text: [], icon: null } });
    expect((await call(ID)).status).toBe(404);
    retrieve.mockRejectedValueOnce(new Error("object_not_found"));
    expect((await call(ID)).status).toBe(404);
    expect((await call("../../etc/passwd")).status).toBe(404);
    expect(retrieve).toHaveBeenCalledTimes(3);
  });

  it("returns 404 without a Notion token", async () => {
    vi.stubEnv("NOTION_TOKEN", "");
    expect((await call(ID)).status).toBe(404);
    expect(retrieve).not.toHaveBeenCalled();
  });
});
