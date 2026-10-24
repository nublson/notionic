import { describe, expect, it } from "vitest";
import { collectFootnotes } from "./footnotes";
import { block, richText } from "./test-utils";
import type { NotionBlock } from "./types";

const PAGE = "3fcb17268ab381d995c6ff3f97dc741b";
const id = (n: number) => `f00d${String(n).padStart(28, "0")}`;
const ref = (text: string, noteId: string) => richText(text, { href: `/${PAGE}#${noteId}` });
const p = (...text: ReturnType<typeof richText>[]) =>
  block("paragraph", { rich_text: text, color: "default" });
const heading = (text: string, level = 2, extra: { children?: NotionBlock[] } = {}) =>
  block(`heading_${level}`, { rich_text: [richText(text)], color: "default" }, extra);
const note = (n: number, text = `Note ${n}`) =>
  block("paragraph", { rich_text: text ? [richText(text)] : [], color: "default" }, { id: id(n) });

const ids = (result: ReturnType<typeof collectFootnotes>) =>
  result?.notes.map((footnote) => [footnote.block.id, footnote.number]);

describe("collectFootnotes", () => {
  it("returns null without a footnotes heading", () => {
    expect(collectFootnotes([p(ref("a", id(1))), note(1)])).toBeNull();
  });

  it("returns null with headings: []", () => {
    expect(collectFootnotes([heading("Footnotes"), note(1)], { headings: [] })).toBeNull();
  });

  it("numbers notes by first reference", () => {
    const result = collectFootnotes([
      p(ref("b", id(2)), ref("a", id(1))),
      heading("Footnotes"),
      note(1),
      note(2),
    ]);
    expect(ids(result)).toEqual([
      [id(2), 1],
      [id(1), 2],
    ]);
  });

  it("gives a repeated reference its own id", () => {
    const first = ref("x", id(1));
    const second = ref("y", id(1));
    const result = collectFootnotes([p(first), p(second), heading("Footnotes"), note(1)]);
    expect(result?.notes[0]?.refIds).toEqual(["fnref-1", "fnref-1-2"]);
    expect(result?.refs.get(first)).toEqual({ number: 1, id: "fnref-1" });
    expect(result?.refs.get(second)).toEqual({ number: 1, id: "fnref-1-2" });
  });

  it("lists unreferenced notes last, without a number", () => {
    const result = collectFootnotes([p(ref("b", id(2))), heading("Footnotes"), note(1), note(2)]);
    expect(ids(result)).toEqual([
      [id(2), 1],
      [id(1), null],
    ]);
    expect(result?.notes[1]?.refIds).toEqual([]);
  });

  it("numbers references inside nested blocks and table cells", () => {
    const toggle = block(
      "toggle",
      { rich_text: [richText("More")], color: "default" },
      { children: [p(ref("deep", id(2)))] },
    );
    const table = block(
      "table",
      { table_width: 1, has_column_header: false, has_row_header: false },
      { children: [block("table_row", { cells: [[ref("cell", id(3))]] })] },
    );
    const result = collectFootnotes([
      toggle,
      p(ref("a", id(1))),
      table,
      heading("Footnotes"),
      note(1),
      note(2),
      note(3),
    ]);
    expect(ids(result)).toEqual([
      [id(2), 1],
      [id(1), 2],
      [id(3), 3],
    ]);
  });

  it("matches headings ignoring case and spaces, not accents", () => {
    const blocks = [p(ref("a", id(1))), heading(" referências "), note(1)];
    expect(collectFootnotes(blocks, { headings: ["Referências"] })?.heading.text).toBe(
      "referências",
    );
    expect(collectFootnotes(blocks, { headings: ["Referencias"] })).toBeNull();
  });

  it("ends the section at the next heading of the same or a higher level", () => {
    const sub = heading("Sources", 3);
    const next = heading("Appendix", 2);
    const result = collectFootnotes([
      heading("Footnotes", 2),
      note(1),
      sub,
      note(2),
      next,
      note(3),
    ]);
    expect(result?.notes.map((footnote) => footnote.block.id)).toEqual([id(1), sub.id, id(2)]);
    expect(result?.sectionBlockIds.has(next.id.replace(/-/g, ""))).toBe(false);
  });

  it("ignores a footnotes heading that is not top-level", () => {
    const toggle = block(
      "toggle",
      { rich_text: [richText("Hidden")], color: "default" },
      { children: [heading("Footnotes"), note(1)] },
    );
    expect(collectFootnotes([toggle])).toBeNull();
  });

  it("uses the first matching heading", () => {
    const later = heading("Footnotes");
    const result = collectFootnotes([heading("Footnotes"), note(1), later, note(2)]);
    expect(result?.notes.map((footnote) => footnote.block.id)).toEqual([id(1)]);
  });

  it("uses title over the heading text, and showTitle defaults to false", () => {
    const blocks = [heading("Footnotes", 3), note(1)];
    expect(collectFootnotes(blocks)).toMatchObject({
      title: "Footnotes",
      showTitle: false,
      heading: { level: 3, text: "Footnotes" },
    });
    expect(collectFootnotes(blocks, { title: "Notes", showTitle: true })).toMatchObject({
      title: "Notes",
      showTitle: true,
    });
  });

  it("skips empty note blocks, and ignores links inside notes", () => {
    const inner = block(
      "paragraph",
      { rich_text: [ref("see", id(1))], color: "default" },
      { id: id(2) },
    );
    const result = collectFootnotes([heading("Footnotes"), note(1), note(3, ""), inner]);
    expect(ids(result)).toEqual([
      [id(1), null],
      [id(2), null],
    ]);
    expect(result?.refs.size).toBe(0);
  });
});
