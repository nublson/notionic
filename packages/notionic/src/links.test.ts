import { describe, expect, it } from "vitest";
import { defaultComponents } from "./renderer";
import { defaultPageHref, resolveLink } from "./links";
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
