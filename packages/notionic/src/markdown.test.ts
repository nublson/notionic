import { describe, expect, it } from "vitest";
import page from "./fixtures/test-page.json";
import { blocksToMarkdown } from "./markdown";
import { block, richText } from "./test-utils";
import type { NotionBlock } from "./types";

const para = (...text: ReturnType<typeof richText>[]) => block("paragraph", { rich_text: text });

describe("blocksToMarkdown", () => {
  it("renders inline formatting, links and line breaks", () => {
    const md = blocksToMarkdown([
      para(
        richText("bold", { annotations: { bold: true } }),
        richText(" and "),
        richText("code", { annotations: { code: true } }),
        richText(", "),
        richText("site", { href: "https://example.com" }),
        richText(", one\ntwo"),
      ),
    ]);
    expect(md).toBe("**bold** and `code`, [site](https://example.com), one  \ntwo");
  });

  it("shifts headings down a level and nests lists", () => {
    const md = blocksToMarkdown([
      block("heading_1", { rich_text: [richText("Title")] }),
      block(
        "numbered_list_item",
        { rich_text: [richText("one")] },
        {
          children: [block("bulleted_list_item", { rich_text: [richText("nested")] })],
        },
      ),
      block("numbered_list_item", { rich_text: [richText("two")] }),
      block("to_do", { rich_text: [richText("done")], checked: true }),
    ]);
    expect(md).toBe("## Title\n\n1. one\n   - nested\n2. two\n\n- [x] done");
  });

  it("maps Notion page links through pageHref and drops unsafe links", () => {
    const id = "244b17268ab383c3938887a7a5748b73";
    const md = blocksToMarkdown(
      [
        para(
          richText("docs", { href: `/${id}` }),
          richText(" "),
          richText("x", { href: "javascript:alert(1)" }),
        ),
      ],
      { pageHref: (pageId) => `https://notionic.dev/docs/${pageId.slice(0, 4)}` },
    );
    expect(md).toBe("[docs](https://notionic.dev/docs/244b) x");
  });

  it("uses a longer fence for code that contains backticks, and drops plain text's language", () => {
    const md = blocksToMarkdown([
      block("code", { language: "plain text", rich_text: [richText("a ``` b")], caption: [] }),
    ]);
    expect(md).toBe("````\na ``` b\n````");
  });

  it("passes uploaded files through transformFileUrl", () => {
    const md = blocksToMarkdown(
      [
        block(
          "image",
          {
            type: "file",
            file: { url: "https://s3/x.png", expiry_time: "" },
            caption: [richText("Shot")],
          },
          { id: "img" },
        ),
      ],
      { transformFileUrl: ({ blockId }) => `https://notionic.dev/api/notion/file/${blockId}` },
    );
    expect(md).toBe("![Shot](https://notionic.dev/api/notion/file/img)");
  });

  it("renders a whole real page", () => {
    const md = blocksToMarkdown(page as unknown as NotionBlock[]);
    expect(md).toContain("## Heading 1");
    expect(md).toContain("| Block | Default | shadcn |");
    expect(md).toContain("```typescript\nimport { NotionRenderer }");
    expect(md).toContain("$$\n\\int_0^1");
    expect(md).toContain("<summary>A toggle</summary>");
    expect(md).toContain("**First tab**");
    expect(md).toContain("> 💡 A callout with **rich text**.");
    expect(md).toContain("[A child page](https://www.notion.so/3fcb17268ab381d995c6ff3f97dc741b)");
    expect(md).not.toMatch(/\n{3,}/);
  });
});
