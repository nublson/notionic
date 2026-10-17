import { describe, expect, it, vi } from "vitest";
import page from "./fixtures/test-page.json";
import { collectHeadings } from "./headings";
import { NotionRenderer } from "./renderer";
import { renderToHtml } from "./test-utils";
import type { NotionBlock } from "./types";

// Blocks fetched with fetchBlocks from a real Notion page that uses every
// block type (metadata stripped).
const blocks = page as unknown as NotionBlock[];

describe("a real Notion page", () => {
  it("renders every block type without warnings", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const html = await renderToHtml(<NotionRenderer blocks={blocks} />);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
    vi.unstubAllEnvs();

    expect(html).toContain('<nav aria-label="Table of contents"');
    expect(html).toContain('<time dateTime="2026-10-19">2026-10-19</time>');
    expect(html).toContain("A multi-line quote<br/>with a second line");
    expect(html.match(/<details name="notionic-tabs-/g)).toHaveLength(2);
    expect(html).toContain("Content of the second tab.");
    expect(html).toContain('href="https://www.notion.so/3fcb17268ab381d995c6ff3f97dc741b"');
    expect(html).toContain("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  });

  it("collects its headings in reading order with unique ids", () => {
    const headings = collectHeadings(blocks);
    expect(headings.slice(0, 5).map((h) => [h.level, h.id])).toEqual([
      [1, "heading-1"],
      [2, "heading-2"],
      [3, "heading-3"],
      [4, "heading-4"],
      [2, "toggle-heading-2"],
    ]);
    expect(new Set(headings.map((h) => h.id)).size).toBe(headings.length);
  });
});
