import { lookup } from "node:dns/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchLinkFavicon,
  imageDataUrl,
  imageType,
  lookupLinkFavicon,
  siteIconUrls,
} from "./link-favicons";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const ICO = new Uint8Array([0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x10, 0x10]);
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"/>';

type Answer = Response | Error | (() => Response);
const respond =
  (status: number, body?: Uint8Array<ArrayBuffer> | string, headers?: Record<string, string>) =>
  () =>
    new Response(body === undefined ? null : body, { status, headers });
const html = (head: string) =>
  respond(200, `<html><head>${head}</head><body></body></html>`, { "content-type": "text/html" });
/** Reads the site's own icon first, as `linkFavicons: { siteIcons: true }` does. */
const SITE = { siteIcons: true } as const;
const google = (host: string) => `https://www.google.com/s2/favicons?domain=${host}&sz=32`;
const duck = (host: string) => `https://icons.duckduckgo.com/ip3/${host}.ico`;

/** A fake network: each URL answers as listed, anything else with a 404. */
function stubWeb(routes: Record<string, Answer> = {}) {
  const fetch = vi.fn(async (input: string | URL, _init?: RequestInit) => {
    const answer = routes[String(input)];
    if (answer instanceof Error) throw answer;
    if (typeof answer === "function") return answer();
    return answer ?? new Response(null, { status: 404 });
  });
  vi.stubGlobal("fetch", fetch);
  return {
    fetch,
    asked: () => fetch.mock.calls.map(([url]) => String(url)),
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("imageType", () => {
  it("reads the type from the bytes, not from any header", () => {
    expect(imageType(PNG)).toBe("image/png");
    expect(imageType(ICO)).toBe("image/x-icon");
    expect(imageType(new TextEncoder().encode("GIF89a"))).toBe("image/gif");
    expect(imageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(imageType(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 "))).toBe("image/webp");
    expect(imageType(new TextEncoder().encode(SVG))).toBe("image/svg+xml");
    expect(imageType(new TextEncoder().encode(`<?xml version="1.0"?>\n${SVG}`))).toBe(
      "image/svg+xml",
    );
    expect(imageType(new TextEncoder().encode(`<!-- license -->\n<!DOCTYPE svg>\n${SVG}`))).toBe(
      "image/svg+xml",
    );
    expect(imageType(new TextEncoder().encode("<html>nope</html>"))).toBeNull();
    expect(imageType(new TextEncoder().encode("<!-- x --><html></html>"))).toBeNull();
    expect(imageType(new Uint8Array())).toBeNull();
  });

  it("inlines the bytes as they came", () => {
    expect(imageDataUrl(PNG)).toBe(`data:image/png;base64,${btoa(String.fromCharCode(...PNG))}`);
    expect(imageDataUrl(new TextEncoder().encode("text"))).toBeNull();
  });
});

describe("siteIconUrls", () => {
  const base = new URL("https://purl.live/");
  it("prefers an SVG, then the smallest raster of 32px or more, and skips apple-touch-icon", () => {
    const head = `
      <link rel="icon" href="/favicon.ico?a" sizes="16x16">
      <link rel="icon" href="/icon2.png" type="image/png" sizes="96x96">
      <link rel="icon" href="/icon.png" type="image/png" sizes="32x32">
      <link rel="apple-touch-icon" href="/apple-icon.png" sizes="1024x1024">
      <link rel="icon" href="/icon.svg" type="image/svg+xml" sizes="any">`;
    expect(siteIconUrls(head, base).map(String)).toEqual([
      "https://purl.live/icon.svg",
      "https://purl.live/icon.png",
      "https://purl.live/icon2.png",
      "https://purl.live/favicon.ico?a",
      "https://purl.live/favicon.ico",
    ]);
  });

  it("falls back to /favicon.ico without icon tags", () => {
    expect(siteIconUrls("<title>x</title>", base).map(String)).toEqual([
      "https://purl.live/favicon.ico",
    ]);
  });
});

describe("fetchLinkFavicon", () => {
  it("uses the site's own icon first, without asking Google", async () => {
    const web = stubWeb({
      "https://purl.live/": html('<link rel="icon" href="/icon.svg" type="image/svg+xml">'),
      "https://purl.live/icon.svg": respond(200, SVG),
    });
    expect(await fetchLinkFavicon("purl.live", SITE)).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(web.asked()).toEqual(["https://purl.live/", "https://purl.live/icon.svg"]);
  });

  it("tries the next icon when one fails, and skips icons on private addresses", async () => {
    vi.mocked(lookup).mockImplementation((async (name: string) => [
      { address: name === "icons.rebind.example" ? "127.0.0.1" : "93.184.216.34", family: 4 },
    ]) as unknown as typeof lookup);
    const web = stubWeb({
      "https://example.com/": html(
        '<link rel="icon" href="https://cdn.example.net/icon.svg"><link rel="icon" href="http://icons.rebind.example:8080/action.png" sizes="32x32"><link rel="icon" href="/icon.png" sizes="48x48">',
      ),
      "https://cdn.example.net/icon.svg": new TypeError("fetch failed"),
      "https://example.com/icon.png": respond(200, PNG),
    });
    expect(await fetchLinkFavicon("example.com", SITE)).toMatch(/^data:image\/png/);
    expect(web.asked()).not.toContain("http://icons.rebind.example:8080/action.png");
    vi.mocked(lookup).mockReset();
    vi.mocked(lookup).mockImplementation((async () => [
      { address: "93.184.216.34", family: 4 },
    ]) as unknown as typeof lookup);
  });

  it("tries /favicon.ico when the page declares no icon", async () => {
    stubWeb({
      "https://example.com/": html("<title>x</title>"),
      "https://example.com/favicon.ico": respond(200, ICO),
    });
    expect(await fetchLinkFavicon("example.com", SITE)).toMatch(/^data:image\/x-icon;base64,/);
  });

  it("moves to Google when the site's icon isn't an image, or the site doesn't answer", async () => {
    let web = stubWeb({
      "https://example.com/": html('<link rel="icon" href="/icon.png">'),
      "https://example.com/icon.png": respond(200, "<html>login</html>"),
      [google("example.com")]: respond(200, PNG),
    });
    expect(await fetchLinkFavicon("example.com", SITE)).toMatch(/^data:image\/png/);
    expect(web.asked().at(-1)).toBe(google("example.com"));

    web = stubWeb({
      "https://example.com/": new TypeError("fetch failed"),
      [google("example.com")]: respond(200, PNG),
    });
    expect(await fetchLinkFavicon("example.com", SITE)).toMatch(/^data:image\/png/);
  });

  it("never contacts the site itself by default", async () => {
    const web = stubWeb({
      "https://purl.live/": html('<link rel="icon" href="/icon.svg">'),
      [google("purl.live")]: respond(200, PNG),
    });
    expect(await fetchLinkFavicon("purl.live")).toMatch(/^data:image\/png/);
    expect(await lookupLinkFavicon("purl.live")).toMatch(/^data:image\/png/);
    expect(web.asked().every((url) => !url.startsWith("https://purl.live"))).toBe(true);
  });

  it("uses Google's icon when the site has none", async () => {
    const web = stubWeb({ [google("github.com")]: respond(200, PNG) });
    expect(await fetchLinkFavicon("github.com")).toMatch(/^data:image\/png;base64,/);
    const call = web.fetch.mock.calls.find(([url]) => String(url) === google("github.com"));
    expect(call?.[1]).toMatchObject({ headers: { accept: "image/*" } });
  });

  it("falls back to DuckDuckGo when Google has none, keeping its ICO", async () => {
    stubWeb({
      [google("sonner.emilkowal.ski")]: respond(404, PNG),
      [duck("sonner.emilkowal.ski")]: respond(200, ICO),
    });
    expect(await fetchLinkFavicon("sonner.emilkowal.ski")).toMatch(/^data:image\/x-icon;base64,/);
  });

  it("returns null when nothing has an icon", async () => {
    stubWeb();
    expect(await fetchLinkFavicon("example.invalid")).toBeNull();
    expect(await fetchLinkFavicon("")).toBeNull();
  });

  it("still uses DuckDuckGo's icon when Google failed, and null when both did", async () => {
    stubWeb({
      [google("example.com")]: new Error("timeout"),
      [duck("example.com")]: respond(200, PNG),
    });
    expect(await fetchLinkFavicon("example.com")).toMatch(/^data:/);
    stubWeb({
      [google("example.com")]: respond(503),
      [duck("example.com")]: new TypeError("fetch failed"),
    });
    expect(await fetchLinkFavicon("example.com")).toBeNull();
  });

  it("moves on when a provider answers with something that isn't an image", async () => {
    stubWeb({
      [google("example.com")]: respond(200, "<html>nope</html>"),
      [duck("example.com")]: respond(200, PNG),
    });
    expect(await fetchLinkFavicon("example.com")).toMatch(/^data:image\/png/);
  });

  it("skips icons bigger than the cap, by length or by header", async () => {
    const huge = new Uint8Array(512 * 1024 + 1);
    huge.set(PNG);
    stubWeb({ [google("example.com")]: respond(200, huge) });
    expect(await fetchLinkFavicon("example.com")).toBeNull();
    stubWeb({
      [google("example.com")]: respond(200, PNG, { "content-length": String(1024 * 1024) }),
    });
    expect(await fetchLinkFavicon("example.com")).toBeNull();
  });
});

describe("lookupLinkFavicon", () => {
  it("tells a site without an icon (null) from providers that couldn't answer (undefined)", async () => {
    stubWeb();
    expect(await lookupLinkFavicon("example.com")).toBeNull();
    stubWeb({
      [google("example.com")]: respond(503),
      [duck("example.com")]: new TypeError("fetch failed"),
    });
    expect(await lookupLinkFavicon("example.com")).toBeUndefined();
    stubWeb({ [google("example.com")]: respond(429) });
    expect(await lookupLinkFavicon("example.com")).toBeUndefined();
  });

  it("falls back to the parent domain when a subdomain has no icon", async () => {
    const web = stubWeb({ [google("substack.com")]: respond(200, PNG) });
    expect(await lookupLinkFavicon("nublson.substack.com")).toMatch(/^data:image\/png/);
    expect(web.asked()).toContain(google("substack.com"));
  });

  it("never falls back to a public suffix, or splits an IP address", async () => {
    let web = stubWeb();
    expect(await lookupLinkFavicon("example.co.uk")).toBeNull();
    expect(web.asked().some((url) => url.includes("domain=co.uk"))).toBe(false);
    web = stubWeb({ [google("example.co.uk")]: respond(200, PNG) });
    expect(await lookupLinkFavicon("blog.example.co.uk")).toMatch(/^data:/);
    web = stubWeb();
    expect(await lookupLinkFavicon("203.0.113.7")).toBeNull();
    expect(web.asked().some((url) => url.includes("domain=0.113.7"))).toBe(false);
  });

  it("never sends private hosts, with or without a trailing dot", async () => {
    const web = stubWeb();
    for (const host of ["localhost", "10.0.0.2", "printer.local", "printer.local."]) {
      expect(await lookupLinkFavicon(host)).toBeNull();
      expect(await fetchLinkFavicon(host)).toBeNull();
    }
    expect(web.fetch).not.toHaveBeenCalled();
  });

  it("stops at two labels", async () => {
    const web = stubWeb();
    expect(await lookupLinkFavicon("example.com")).toBeNull();
    expect(web.asked().filter((url) => url.includes("google"))).toEqual([google("example.com")]);
  });
});
