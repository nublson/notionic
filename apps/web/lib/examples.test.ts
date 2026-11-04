import type { BlockOf } from "notionic";
import { describe, expect, it } from "vitest";
import { includeDrafts, isRecipe } from "./examples";

const code = (caption: string) =>
  ({
    object: "block",
    id: "code",
    type: "code",
    code: {
      language: "tsx",
      rich_text: [],
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
