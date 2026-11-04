import { describe, expect, it } from "vitest";
import { collectResources } from "./resources";
import { block, richText } from "./test-utils";
import type { NotionBlock, RichText } from "./types";
import { normalizePageId } from "./links";
import { plainText } from "./utils";

const URL = "https://developer.mozilla.org/en-US/docs/Web/CSS/font-smooth";
const text = (value: string) => richText(value);
const link = (value: string, href = URL, bold = false) =>
  richText(value, { href, annotations: { bold } });
const item = (...rich: RichText) =>
  block("bulleted_list_item", { rich_text: rich, color: "default" });
const p = (value = "Text") => block("paragraph", { rich_text: [text(value)], color: "default" });
const heading = (
  value: string,
  level = 2,
  extra: { children?: NotionBlock[]; toggleable?: boolean } = {},
) =>
  block(
    `heading_${level}`,
    { rich_text: [text(value)], color: "default", is_toggleable: Boolean(extra.toggleable) },
    extra.children ? { children: extra.children } : {},
  );

const resource = (result: ReturnType<typeof collectResources>, of: NotionBlock) =>
  result?.items.get(normalizePageId(of.id));

describe("collectResources", () => {
  it("returns null without a resources heading", () => {
    expect(collectResources([p(), item(link("a"))])).toBeNull();
  });

  it("returns null with headings: []", () => {
    expect(
      collectResources([heading("Resources"), item(link("a"))], { resources: { headings: [] } }),
    ).toBeNull();
  });

  it("returns null when no item starts with a link", () => {
    expect(collectResources([heading("Resources"), item(text("Plain")), p()])).toBeNull();
  });

  it("reads title, href and description", () => {
    const one = item(link("font-smooth"), text(" - MDN on smoothing"));
    const marker = heading("Resources");
    const result = collectResources([p(), marker, one]);
    const found = resource(result, one);
    expect(found?.href).toBe(URL);
    expect(plainText(found?.title ?? [])).toBe("font-smooth");
    expect(plainText(found?.description ?? [])).toBe("MDN on smoothing");
    expect(found?.block).toBe(one);
    expect(found?.preview).toBeNull();
    expect(result?.headingBlockId).toBe(normalizePageId(marker.id));
  });

  it("trims each separator", () => {
    for (const separator of [" - ", " – ", " — ", ": ", " | "]) {
      const one = item(link("a"), text(`${separator}MDN`));
      const found = resource(collectResources([heading("Resources"), one]), one);
      expect(plainText(found?.description ?? [])).toBe("MDN");
    }
    const bare = item(link("a"), text(" - "));
    expect(resource(collectResources([heading("Resources"), bare]), bare)?.description).toBeNull();
  });

  it("does not mutate the writer's rich text when trimming", () => {
    const rest = text(" - MDN");
    const one = item(link("a"), rest);
    collectResources([heading("Resources"), one]);
    expect(rest.plain_text).toBe(" - MDN");
  });

  it("joins title segments that share the first link", () => {
    const one = item(link("Font ", URL, true), link("smooth"), text(" - d"));
    const found = resource(collectResources([heading("Resources"), one]), one);
    expect(found?.title).toHaveLength(2);
    expect(plainText(found?.title ?? [])).toBe("Font smooth");
    expect(plainText(found?.description ?? [])).toBe("d");
  });

  it("skips leading blank segments", () => {
    const one = item(text(" "), link("a"));
    expect(resource(collectResources([heading("Resources"), one]), one)?.href).toBe(URL);
  });

  it("keeps later links in the description", () => {
    const other = "https://example.com/b";
    const one = item(link("a"), text(" - see "), link("b", other));
    const found = resource(collectResources([heading("Resources"), one]), one);
    expect(found?.description?.[1]?.href).toBe(other);
  });

  it("ignores items that don't start with a link, and non-list blocks", () => {
    const later = item(text("See "), link("MDN"));
    const para = block("paragraph", { rich_text: [link("a")], color: "default" });
    const ok = item(link("ok"));
    const result = collectResources([heading("Resources"), later, para, ok]);
    expect(resource(result, later)).toBeUndefined();
    expect(resource(result, para)).toBeUndefined();
    expect(resource(result, ok)).toBeDefined();
  });

  it("accepts numbered items", () => {
    const one = block("numbered_list_item", { rich_text: [link("a")], color: "default" });
    expect(resource(collectResources([heading("Resources"), one]), one)).toBeDefined();
  });

  it("reads a toggleable heading's children", () => {
    const one = item(link("a"));
    const result = collectResources([
      heading("Resources", 2, { toggleable: true, children: [one] }),
      item(link("outside")),
    ]);
    expect(result?.items.size).toBe(1);
    expect(resource(result, one)).toBeDefined();
  });

  it("stops at the next same-level heading", () => {
    const inside = item(link("a"));
    const outside = item(link("b"));
    const result = collectResources([heading("Resources"), inside, heading("Next"), outside]);
    expect(resource(result, inside)).toBeDefined();
    expect(resource(result, outside)).toBeUndefined();
  });

  it("reads a renamed heading", () => {
    const one = item(link("a"));
    const result = collectResources([heading("Recursos"), one], {
      resources: { headings: ["Recursos"] },
    });
    expect(resource(result, one)).toBeDefined();
  });

  it("attaches the fetched preview", () => {
    const preview = { title: "MDN", description: "From the site" };
    const one = { ...item(link("a")), resourcePreview: preview };
    expect(resource(collectResources([heading("Resources"), one]), one)?.preview).toBe(preview);
  });

  it("does not treat a footnote reference as a resource title", () => {
    const PAGE = "3fcb17268ab381d995c6ff3f97dc741b";
    const noteId = "f00d0000000000000000000000000001";
    const note = block(
      "paragraph",
      { rich_text: [text("A note")], color: "default" },
      { id: noteId },
    );
    const one = item(link("a", `/${PAGE}#${noteId}`), text(" - d"));
    const result = collectResources([
      heading("Resources"),
      one,
      item(link("ok")),
      heading("Footnotes"),
      note,
    ]);
    expect(resource(result, one)).toBeUndefined();
  });

  it("never rewrites a linked description item while trimming", () => {
    const linked = link(" - see MDN", "https://example.com/mdn");
    const one = item(link("a"), linked);
    const found = resource(collectResources([heading("Resources"), one]), one);
    expect(found?.description?.[0]).toBe(linked);
  });

  it("defers to footnotes on the same heading", () => {
    const one = item(link("a"));
    expect(
      collectResources([heading("Notes"), one], {
        resources: { headings: ["Notes"] },
        footnotes: { headings: ["Notes"] },
      }),
    ).toBeNull();
    expect(
      collectResources([heading("Footnotes"), one], { resources: { headings: ["Footnotes"] } }),
    ).toBeNull();
  });
});
