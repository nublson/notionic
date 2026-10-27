import { afterEach, describe, expect, it, vi } from "vitest";
import { lookup } from "node:dns/promises";
import { fetchBookmarkPreview, parseBookmarkPreview } from "./bookmark-preview";

const PAGE = "https://example.com/blog/post";

describe("parseBookmarkPreview", () => {
  it("reads Open Graph tags and resolves relative URLs", () => {
    const html = `<!doctype html><html><head>
      <title>Fallback</title>
      <meta property="og:title" content="Tom &amp; Jerry&#39;s &#x2014; post">
      <meta property="og:description" content="  A   description. ">
      <meta property="og:image" content="/cover.png">
      <meta property="og:site_name" content="Example">
      <link rel="shortcut icon" href="/static/icon.png">
    </head><body><meta property="og:title" content="Not in head"></body></html>`;
    expect(parseBookmarkPreview(html, PAGE)).toEqual({
      title: "Tom & Jerry's — post",
      description: "A description.",
      image: "https://example.com/cover.png",
      favicon: "https://example.com/static/icon.png",
      siteName: "Example",
    });
  });

  it("falls back to Twitter tags, <title>, the meta description and /favicon.ico", () => {
    expect(
      parseBookmarkPreview(
        `<head><title> Plain title </title><meta name="description" content='Meta'>` +
          `<meta name=twitter:image content=https://cdn.example.com/x.jpg></head>`,
        PAGE,
      ),
    ).toEqual({
      title: "Plain title",
      description: "Meta",
      image: "https://cdn.example.com/x.jpg",
      favicon: "https://example.com/favicon.ico",
      siteName: undefined,
    });
  });

  it("returns null without a title and drops non-http image URLs", () => {
    expect(parseBookmarkPreview("<head></head>", PAGE)).toBeNull();
    expect(
      parseBookmarkPreview(
        `<head><title>T</title><meta property="og:image" content="javascript:alert(1)"></head>`,
        PAGE,
      )?.image,
    ).toBeUndefined();
  });
});

describe("fetchBookmarkPreview", () => {
  it("refuses a host whose addresses can't be checked", async () => {
    vi.mocked(lookup).mockImplementationOnce((async () => {
      throw new Error("ESERVFAIL");
    }) as unknown as typeof lookup);
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(await fetchBookmarkPreview("https://flaky-dns.example/")).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("never fetches a public name that resolves to a private address", async () => {
    vi.mocked(lookup).mockImplementationOnce((async () => [
      { address: "127.0.0.1", family: 4 },
    ]) as unknown as typeof lookup);
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(await fetchBookmarkPreview("https://rebind.example/")).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  afterEach(() => vi.unstubAllGlobals());

  const html = (body: string, init: ResponseInit = {}) =>
    new Response(body, { headers: { "content-type": "text/html; charset=utf-8" }, ...init });

  it("follows redirects and reads the final page", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 301, headers: { location: "/new" } }))
      .mockResolvedValueOnce(html("<head><title>Moved</title></head>"));
    vi.stubGlobal("fetch", fetch);
    expect(await fetchBookmarkPreview("https://example.com/old")).toMatchObject({
      title: "Moved",
      favicon: "https://example.com/favicon.ico",
    });
    expect(String(fetch.mock.calls[1]?.[0])).toBe("https://example.com/new");
  });

  it("never fetches private or non-http addresses, even through a redirect", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(null, { status: 302, headers: { location: "http://169.254.169.254/" } }),
      );
    vi.stubGlobal("fetch", fetch);
    for (const url of [
      "http://localhost:3000",
      "http://127.0.0.1/",
      "http://10.0.0.1/",
      "http://192.168.1.1/",
      "http://[::1]/",
      "ftp://example.com/",
      "not a url",
    ]) {
      expect(await fetchBookmarkPreview(url)).toBeNull();
    }
    expect(fetch).not.toHaveBeenCalled();
    expect(await fetchBookmarkPreview("https://example.com/")).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("returns null for errors, non-HTML responses and network failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(html("<title>x</title>", { status: 404 })));
    expect(await fetchBookmarkPreview(PAGE)).toBeNull();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response("{}", { headers: { "content-type": "application/json" } })),
    );
    expect(await fetchBookmarkPreview(PAGE)).toBeNull();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    expect(await fetchBookmarkPreview(PAGE)).toBeNull();
  });
});
