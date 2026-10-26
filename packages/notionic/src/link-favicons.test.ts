import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchLinkFavicon, imageDataUrl, imageType, lookupLinkFavicon } from "./link-favicons";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const ICO = new Uint8Array([0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x10, 0x10]);

const respond = (status: number, body?: Uint8Array<ArrayBuffer> | string) =>
  new Response(body === undefined ? null : body, { status });

function stubFetch(...answers: (Response | Error)[]) {
  const fetch = vi.fn();
  for (const answer of answers) {
    if (answer instanceof Error) fetch.mockRejectedValueOnce(answer);
    else fetch.mockResolvedValueOnce(answer);
  }
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

afterEach(() => vi.unstubAllGlobals());

describe("imageType", () => {
  it("reads the type from the bytes, not from any header", () => {
    expect(imageType(PNG)).toBe("image/png");
    expect(imageType(ICO)).toBe("image/x-icon");
    expect(imageType(new TextEncoder().encode("GIF89a"))).toBe("image/gif");
    expect(imageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(imageType(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 "))).toBe("image/webp");
    expect(imageType(new TextEncoder().encode("<html>nope</html>"))).toBeNull();
    expect(imageType(new Uint8Array())).toBeNull();
  });

  it("inlines the bytes as they came", () => {
    expect(imageDataUrl(PNG)).toBe(`data:image/png;base64,${btoa(String.fromCharCode(...PNG))}`);
    expect(imageDataUrl(new TextEncoder().encode("text"))).toBeNull();
  });
});

describe("fetchLinkFavicon", () => {
  it("uses Google's icon when it has one", async () => {
    const fetch = stubFetch(respond(200, PNG));
    expect(await fetchLinkFavicon("github.com")).toMatch(/^data:image\/png;base64,/);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0]?.[0])).toBe(
      "https://www.google.com/s2/favicons?domain=github.com&sz=32",
    );
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({ headers: { accept: "image/*" } });
  });

  it("falls back to DuckDuckGo when Google has none, keeping its ICO", async () => {
    const fetch = stubFetch(respond(404, PNG), respond(200, ICO));
    expect(await fetchLinkFavicon("sonner.emilkowal.ski")).toMatch(/^data:image\/x-icon;base64,/);
    expect(String(fetch.mock.calls[1]?.[0])).toBe(
      "https://icons.duckduckgo.com/ip3/sonner.emilkowal.ski.ico",
    );
  });

  it("returns null when every provider says there is none", async () => {
    stubFetch(respond(404), respond(404));
    expect(await fetchLinkFavicon("example.invalid")).toBeNull();
    expect(await fetchLinkFavicon("")).toBeNull();
  });

  it("still uses DuckDuckGo's icon when Google failed, and null when both did", async () => {
    stubFetch(new Error("timeout"), respond(200, PNG));
    expect(await fetchLinkFavicon("example.com")).toMatch(/^data:/);
    stubFetch(respond(503), new TypeError("fetch failed"));
    expect(await fetchLinkFavicon("example.com")).toBeNull();
  });

  it("moves on when a provider answers with something that isn't an image", async () => {
    stubFetch(respond(200, "<html>nope</html>"), respond(200, PNG));
    expect(await fetchLinkFavicon("example.com")).toMatch(/^data:image\/png/);
  });

  it("skips icons bigger than the cap, by length or by header", async () => {
    const huge = new Uint8Array(512 * 1024 + 1);
    huge.set(PNG);
    stubFetch(respond(200, huge), respond(404));
    expect(await fetchLinkFavicon("example.com")).toBeNull();
    stubFetch(
      new Response(PNG, { status: 200, headers: { "content-length": String(1024 * 1024) } }),
      respond(404),
    );
    expect(await fetchLinkFavicon("example.com")).toBeNull();
  });
});

describe("lookupLinkFavicon", () => {
  it("tells a site without an icon (null) from providers that couldn't answer (undefined)", async () => {
    stubFetch(respond(404), respond(404));
    expect(await lookupLinkFavicon("example.com")).toBeNull();
    stubFetch(respond(503), new TypeError("fetch failed"));
    expect(await lookupLinkFavicon("example.com")).toBeUndefined();
    stubFetch(respond(429), respond(404));
    expect(await lookupLinkFavicon("example.com")).toBeUndefined();
  });

  it("falls back to the parent domain when a subdomain has no icon", async () => {
    const fetch = stubFetch(respond(404), respond(404), respond(200, PNG));
    expect(await lookupLinkFavicon("nublson.substack.com")).toMatch(/^data:image\/png/);
    expect(String(fetch.mock.calls[2]?.[0])).toBe(
      "https://www.google.com/s2/favicons?domain=substack.com&sz=32",
    );
  });

  it("never falls back to a public suffix, or splits an IP address", async () => {
    let fetch = stubFetch(respond(404), respond(404));
    expect(await lookupLinkFavicon("example.co.uk")).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);
    fetch = stubFetch(respond(404), respond(404), respond(200, PNG));
    expect(await lookupLinkFavicon("blog.example.co.uk")).toMatch(/^data:/);
    expect(String(fetch.mock.calls[2]?.[0])).toContain("domain=example.co.uk");
    fetch = stubFetch(respond(404), respond(404));
    expect(await lookupLinkFavicon("203.0.113.7")).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("stops at two labels", async () => {
    const fetch = stubFetch(respond(404), respond(404));
    expect(await lookupLinkFavicon("example.com")).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
