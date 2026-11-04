import { describe, expect, it } from "vitest";
import { findSection } from "./sections";
import { block, richText } from "./test-utils";
import type { NotionBlock } from "./types";

const p = (text = "Text") => block("paragraph", { rich_text: [richText(text)], color: "default" });
const heading = (
  text: string,
  level = 2,
  extra: { children?: NotionBlock[]; toggleable?: boolean } = {},
) =>
  block(
    `heading_${level}`,
    { rich_text: [richText(text)], color: "default", is_toggleable: Boolean(extra.toggleable) },
    extra.children ? { children: extra.children } : {},
  );

describe("findSection", () => {
  it("finds the first matching top-level heading", () => {
    const blocks = [p(), heading("Resources"), p("a"), p("b"), heading("Next"), p()];
    const section = findSection(blocks, ["resources"]);
    expect(section?.start).toBe(1);
    expect(section?.end).toBe(4);
    expect(section?.items).toHaveLength(2);
    expect(section?.blocks).toEqual(section?.items);
    expect(section?.heading).toEqual({ level: 2, text: "Resources" });
    expect(section?.marker).toBe(blocks[1]);
  });

  it("ends at a heading of the same or higher level, not a lower one", () => {
    const blocks = [heading("Resources"), p(), heading("Sub", 3), p(), heading("Top", 1), p()];
    const section = findSection(blocks, ["Resources"]);
    expect(section?.end).toBe(4);
    expect(section?.items).toHaveLength(3);
  });

  it("runs to the end of the page", () => {
    const blocks = [p(), heading("Resources"), p(), p()];
    expect(findSection(blocks, ["Resources"])?.end).toBe(blocks.length);
  });

  it("reads a toggleable heading's children", () => {
    const children = [p("a"), p("b")];
    const blocks = [heading("Resources", 2, { toggleable: true, children }), p("after")];
    const section = findSection(blocks, ["Resources"]);
    expect(section?.items).toEqual(children);
    expect(section?.blocks).toEqual([]);
    expect(section?.end).toBe(1);
  });

  it("ignores a heading nested in a toggle", () => {
    const toggle = block(
      "toggle",
      { rich_text: [richText("T")] },
      { children: [heading("Resources")] },
    );
    expect(findSection([toggle, p()], ["Resources"])).toBeNull();
  });

  it("returns null with no names or no match", () => {
    const blocks = [heading("Resources"), p()];
    expect(findSection(blocks, [])).toBeNull();
    expect(findSection(blocks, ["Links"])).toBeNull();
  });

  it("matches ignoring case and surrounding whitespace but not accents", () => {
    expect(findSection([heading("  RESOURCES "), p()], ["Resources"])).not.toBeNull();
    expect(findSection([heading("Referencias"), p()], ["Referências"])).toBeNull();
  });

  it("uses the first match in reading order", () => {
    const blocks = [heading("Links"), p(), heading("Resources"), p()];
    expect(findSection(blocks, ["Resources", "Links"])?.start).toBe(0);
  });
});
