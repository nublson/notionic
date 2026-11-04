import type { BlockOf } from "notionic";
import { describe, expect, it } from "vitest";
import { includeDrafts, isRecipe, toRecipe } from "./examples";

const code = (caption: string, source = "") =>
  ({
    object: "block",
    id: "code",
    type: "code",
    code: {
      language: "tsx",
      rich_text: source
        ? [{ type: "text", text: { content: source, link: null }, plain_text: source, href: null }]
        : [],
      caption: caption
        ? [
            {
              type: "text",
              text: { content: caption, link: null },
              plain_text: caption,
              href: null,
            },
          ]
        : [],
    },
  }) as unknown as BlockOf<"code">;

describe("isRecipe", () => {
  it("is true for a caption that starts with Customize", () => {
    expect(isRecipe(code("Customize · callout.tsx"))).toBe(true);
    expect(isRecipe(code("  Customize"))).toBe(true);
  });

  it("is false for other captions, no caption, and another case", () => {
    expect(isRecipe(code("app/page.tsx"))).toBe(false);
    expect(isRecipe(code(""))).toBe(false);
    expect(isRecipe(code("customize"))).toBe(false);
  });
});

describe("toRecipe", () => {
  it("moves a first-line Customize comment into the caption", () => {
    const recipe = toRecipe(code("", "// Customize · callout.tsx\nconst a = 1\n"));
    expect(recipe?.code.caption.map((t) => t.plain_text).join("")).toBe("Customize · callout.tsx");
    expect(recipe?.code.rich_text.map((t) => t.plain_text).join("")).toBe("const a = 1\n");
  });

  it("keeps a block already captioned Customize", () => {
    const block = code("Customize · x.tsx", "const a = 1");
    expect(toRecipe(block)).toBe(block);
  });

  it("is null for other code", () => {
    expect(toRecipe(code("", "// a comment\nconst a = 1"))).toBeNull();
    expect(toRecipe(code("app/page.tsx", "const a = 1"))).toBeNull();
    expect(toRecipe(code("", ""))).toBeNull();
  });
});

describe("includeDrafts", () => {
  it("is true with the flag in development", () => {
    expect(includeDrafts({ NOTION_DOCS_DRAFTS: "1", NODE_ENV: "development" })).toBe(true);
  });

  it("ignores the drafts flag in production", () => {
    expect(includeDrafts({ NOTION_DOCS_DRAFTS: "1", NODE_ENV: "production" })).toBe(false);
  });

  it("is false without the flag", () => {
    expect(includeDrafts({})).toBe(false);
  });
});
