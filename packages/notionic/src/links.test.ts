import { describe, expect, it } from "vitest";
import { defaultComponents } from "./renderer";
import { defaultPageHref, linkedBlockId, resolveLink } from "./links";
import type { RenderContext } from "./types";

const ID = "244b17268ab383c3938887a7a5748b73";
const DASHED = "244b1726-8ab3-83c3-9388-87a7a5748b73";

const context = (pageHref: RenderContext["pageHref"] = defaultPageHref): RenderContext => ({
  pageHref,
  headings: [],
  components: defaultComponents,
});

describe("resolveLink", () => {
  it("keeps hashes, paths, mailto and tel in the tab", () => {
    for (const href of ["#top", "/pricing", "mailto:a@b.co", "tel:+351"]) {
      expect(resolveLink(href, context())).toEqual({ href, external: false });
    }
  });

  it("opens other sites in a new tab", () => {
    expect(resolveLink("https://example.com/a", context())).toEqual({
      href: "https://example.com/a",
      external: true,
    });
  });

  it("drops empty and unsafe links, and protocol-relative paths", () => {
    for (const href of [
      null,
      "",
      "  ",
      "javascript:alert(1)",
      "java\nscript:x",
      "//evil.com",
      "/\\evil.com",
      "data:text/html,x",
    ]) {
      expect(resolveLink(href, context())).toBeNull();
    }
  });

  it("finds the page id in every form of Notion page link", () => {
    const seen: string[] = [];
    const ctx = context((id) => {
      seen.push(id);
      return `/p/${id}`;
    });
    for (const href of [
      `/${ID}`,
      `/Pricing-${ID}?pvs=4`,
      `/p/${ID}`,
      `/p/${ID}#403b17268ab38071a858e39d5b8b27c0`,
      `https://www.notion.so/${DASHED}`,
      `https://www.notion.so/team/Pricing-${ID}`,
      `https://app.notion.com/p/${ID}`,
      `https://acme.notion.site/Pricing-${ID}`,
    ]) {
      expect(resolveLink(href, ctx)).toEqual({ href: `/p/${ID}`, external: false });
    }
    expect(seen.every((id) => id === ID)).toBe(true);
  });

  it("checks the URL pageHref returns", () => {
    expect(
      resolveLink(
        `/${ID}`,
        context(() => "javascript:x"),
      ),
    ).toBeNull();
    expect(resolveLink(`/${ID}`, context())).toEqual({
      href: `https://www.notion.so/${ID}`,
      external: true,
    });
  });
});

describe("linkedBlockId", () => {
  const block = "1a2b3c4d5e6f40718293a4b5c6d7e8f9";
  it("reads the block id from a workspace path", () => {
    expect(linkedBlockId(`/3fcb17268ab381d995c6ff3f97dc741b#${block}`)).toBe(block);
  });
  it("reads a dashed block id from a notion.so URL", () => {
    expect(
      linkedBlockId(
        "https://www.notion.so/Title-3fcb17268ab381d995c6ff3f97dc741b#1a2b3c4d-5e6f-4071-8293-a4b5c6d7e8f9",
      ),
    ).toBe(block);
  });
  it("reads Notion's /p/<page>#<block> links, as the API returns them", () => {
    expect(
      linkedBlockId("/p/3fcb17268ab381d7b265ff9229b44af9#403b17268ab38071a858e39d5b8b27c0"),
    ).toBe("403b17268ab38071a858e39d5b8b27c0");
  });
  it("reads a fragment-only link to a block on the same page", () => {
    expect(linkedBlockId(`#${block}`)).toBe(block);
    expect(linkedBlockId("#intro")).toBeNull();
  });
  it("is null without a fragment, for other sites, and for empty links", () => {
    expect(linkedBlockId("/3fcb17268ab381d995c6ff3f97dc741b")).toBeNull();
    expect(linkedBlockId(`https://example.com/page#${block}`)).toBeNull();
    expect(linkedBlockId(null)).toBeNull();
  });
});
