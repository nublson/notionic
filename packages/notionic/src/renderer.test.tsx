import { describe, expect, it } from "vitest";
import { NotionRenderer, type NotionRendererProps } from "./renderer";
import { RichText } from "./rich-text";
import { block, renderToHtml, richText } from "./test-utils";
import type { BlockProps, DemoFrameProps, DemoProps, NotionBlock } from "./types";

const PAGE_ID = "244b17268ab383c3938887a7a5748b73";

function render(blocks: NotionBlock[], props: Partial<NotionRendererProps> = {}) {
  return renderToHtml(<NotionRenderer blocks={blocks} {...props} />);
}

const para = (...text: ReturnType<typeof richText>[]) => block("paragraph", { rich_text: text });

describe("NotionRenderer", () => {
  it("renders a paragraph inside the root", async () => {
    const html = await render([para(richText("Hello"))]);
    expect(html).toMatch(/^<div class="notionic [^"]*text-foreground/);
    expect(html).toContain("<p>Hello</p>");
  });

  it("renders nothing inside the root for no blocks or an empty paragraph", async () => {
    expect(await render([])).not.toContain("<p");
    expect(await render([para()])).not.toContain("<p");
  });

  it("groups consecutive list items into one list, and nests children", async () => {
    const html = await render([
      block("bulleted_list_item", { rich_text: [richText("one")] }),
      block(
        "bulleted_list_item",
        { rich_text: [richText("two")] },
        { children: [block("numbered_list_item", { rich_text: [richText("two.a")] })] },
      ),
      para(richText("break")),
      block("bulleted_list_item", { rich_text: [richText("three")] }),
    ]);
    expect(html.match(/<ul/g)).toHaveLength(2);
    expect(html.match(/<ol/g)).toHaveLength(1);
    expect(html.match(/<li[ >]/g)).toHaveLength(4);
    expect(html.indexOf("two.a")).toBeGreaterThan(html.indexOf("two"));
  });

  it("starts numbered lists at their index, in their format", async () => {
    const html = await render([
      block("numbered_list_item", {
        rich_text: [richText("x")],
        list_start_index: 3,
        list_format: "roman",
      }),
    ]);
    expect(html).toMatch(/<ol start="3" data-list="roman" class="[^"]*list-\[lower-roman\]/);
  });

  it("renders to-dos as disabled checkboxes", async () => {
    const html = await render([
      block("to_do", { rich_text: [richText("done")], checked: true }),
      block("to_do", { rich_text: [richText("todo")], checked: false }),
    ]);
    expect(html.match(/<ul/g)).toHaveLength(1);
    expect(html.match(/type="checkbox"/g)).toHaveLength(2);
    expect(html.match(/checked=""/g)).toHaveLength(1);
    expect(html).toContain("line-through");
  });

  it("renders annotations and colors", async () => {
    const a = (annotations: Record<string, unknown>) =>
      render([para(richText("x", { annotations }))]);
    expect(await a({ bold: true })).toContain("<strong");
    expect(await a({ italic: true })).toContain("<em>");
    expect(await a({ strikethrough: true })).toContain("<s>");
    expect(await a({ underline: true })).toContain("<u ");
    expect(await a({ code: true })).toContain("<code");
    expect(await a({ color: "red" })).toContain("text-(--notionic-red)");
    const bg = await a({ color: "blue_background" });
    expect(bg).toContain("<mark");
    expect(bg).toContain("bg-(--notionic-blue-bg)");
  });

  it("opens external links in a new tab, with a screen reader hint", async () => {
    const html = await render([para(richText("e", { href: "https://example.com" }))]);
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain("opens in a new tab");
  });

  it("escapes HTML-looking text and drops unsafe links", async () => {
    const html = await render([
      para(
        richText("<script>alert(1)</script>"),
        richText("click", { href: "javascript:alert(1)" }),
      ),
    ]);
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).toContain("click");
    expect(html).not.toContain("javascript:");
  });

  it("links Notion pages to notion.so by default, or through pageHref", async () => {
    const blocks = [para(richText("p", { href: `/${PAGE_ID}` }))];
    expect(await render(blocks)).toContain(`href="https://www.notion.so/${PAGE_ID}"`);

    const routed = await render(blocks, { pageHref: (id) => `/docs/${id.slice(0, 4)}` });
    expect(routed).toContain('href="/docs/244b"');
    expect(routed).not.toContain("target=");

    const hidden = await render(blocks, { pageHref: () => null });
    expect(hidden).not.toContain("<a");
    expect(hidden).toContain("p");
  });

  it("renders headings one level down, with unique ids and anchors", async () => {
    const rt = [richText("Save a link")];
    const html = await render([
      block("heading_1", { rich_text: rt }),
      block("heading_2", { rich_text: rt }),
      block("heading_3", { rich_text: rt }),
      block("heading_4", { rich_text: rt }),
    ]);
    expect(html).toMatch(/<h2 id="save-a-link"/);
    expect(html).toMatch(/<h3 id="save-a-link-2"/);
    expect(html).toMatch(/<h4 id="save-a-link-3"/);
    expect(html).toMatch(/<h5 id="save-a-link-4"/);
    // The anchor is beside the heading, so the heading's name is only its text.
    expect(html).toMatch(/<\/h2><a href="#save-a-link" aria-label="Link to section: Save a link"/);
  });

  it("renders toggleable headings as details, and blank headings as their children only", async () => {
    const toggle = await render([
      block(
        "heading_2",
        { rich_text: [richText("More")], is_toggleable: true },
        { children: [para(richText("Inside"))] },
      ),
    ]);
    expect(toggle).toMatch(
      /<details[^>]*><summary[^>]*><span aria-hidden="true"[^>]*><svg[\s\S]*<\/span><h3 id="more"/,
    );
    expect(toggle).toContain("Inside");

    const blank = await render([
      block("heading_1", { rich_text: [richText("  ")] }, { children: [para(richText("Kid"))] }),
    ]);
    expect(blank).not.toContain("<h2");
    expect(blank).toContain("Kid");
  });

  it("renders toggles, callouts and quotes with their children", async () => {
    const html = await render([
      block("toggle", { rich_text: [richText("Open")] }, { children: [para(richText("A"))] }),
      block(
        "callout",
        { rich_text: [richText("Note")], icon: { type: "emoji", emoji: "💡" }, color: "default" },
        { children: [para(richText("B"))] },
      ),
      block("quote", { rich_text: [richText("Said")] }, { children: [para(richText("C"))] }),
    ]);
    expect(html).toMatch(
      /<details[^>]*><summary[^>]*><span aria-hidden="true"[\s\S]*?<\/span><span[^>]*>Open<\/span><\/summary>/,
    );
    expect(html).toContain("💡");
    expect(html.match(/<blockquote[\s\S]*<\/blockquote>/)![0]).toContain("C");
  });

  it("renders a table with header rows and cells", async () => {
    const row = (...cells: string[]) =>
      block("table_row", { cells: cells.map((c) => [richText(c)]) });
    const html = await render([
      block(
        "table",
        { has_column_header: true, has_row_header: true, table_width: 2 },
        { children: [row("Name", "Plan"), row("Ada", "Pro")] },
      ),
    ]);
    expect(html).toContain('aria-label="Table: Name, Plan"');
    expect(html).toMatch(/<thead><tr><th scope="col"/);
    expect(html).toContain('<th scope="row"');
    expect(html).toMatch(/<td[^>]*>Pro<\/td>/);
  });

  it("renders code as plain text with its language", async () => {
    const html = await render([
      block("code", {
        language: "typescript",
        rich_text: [richText("const a = <b>1</b>")],
        caption: [],
      }),
    ]);
    expect(html).toContain('aria-label="Code, typescript"');
    expect(html).toContain("const a = &lt;b&gt;1&lt;/b&gt;");
  });

  it("renders images and YouTube videos, and skips unsafe URLs", async () => {
    const html = await render([
      block("image", {
        type: "external",
        external: { url: "https://example.com/a.png" },
        caption: [richText("A cat")],
      }),
      block("image", { type: "external", external: { url: "javascript:x" }, caption: [] }),
      block("video", {
        type: "external",
        external: { url: "https://youtu.be/dQw4w9WgXcQ" },
        caption: [],
      }),
    ]);
    expect(html).toContain('alt="A cat"');
    expect(html.match(/<img/g)).toHaveLength(1);
    expect(html).toContain("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  });

  it("renders columns side by side, with their width ratios", async () => {
    const html = await render([
      block(
        "column_list",
        {},
        {
          children: [
            block("column", { width_ratio: 0.25 }, { children: [para(richText("L"))] }),
            block("column", { width_ratio: 0.75 }, { children: [para(richText("R"))] }),
          ],
        },
      ),
    ]);
    expect(html).toContain("md:flex-row");
    expect(html).toContain("flex:0.25 1 0%");
    expect(html.indexOf("R")).toBeGreaterThan(html.indexOf("L"));
  });

  it("renders line breaks within text", async () => {
    const html = await render([para(richText("one\ntwo"))]);
    expect(html).toContain("<p>one<br/>two</p>");
  });

  it("links a table of contents to headings, even ones after it", async () => {
    const html = await render([
      block("table_of_contents", { color: "default" }),
      block("heading_1", { rich_text: [richText("Intro")] }),
      block("heading_2", { rich_text: [richText("Intro")] }),
    ]);
    expect(html).toContain('<a href="#intro"');
    expect(html).toContain('<a href="#intro-2"');
    expect(html).toMatch(/<li class="ps-4"><a href="#intro-2"/);
    expect(html).toMatch(/<h2 id="intro"/);
    expect(html).toMatch(/<h3 id="intro-2"/);
  });

  it("renders tabs as an exclusive accordion with the first open", async () => {
    const tab = (title: string, body: string) =>
      block(
        "paragraph",
        { rich_text: [richText(title)], color: "default", icon: null },
        {
          children: [para(richText(body))],
        },
      );
    const html = await render([
      block("tab", {}, { children: [tab("One", "First"), tab("Two", "Second")] }),
    ]);
    const names = html.match(/<details name="([^"]+)"/g) ?? [];
    expect(names).toHaveLength(2);
    expect(new Set(names).size).toBe(1);
    expect(html).toMatch(/<details name="[^"]+" open=""/);
    expect(html).toContain("Second");
  });

  it("renders inline equations with a replaceable component", async () => {
    const equation = {
      type: "equation",
      equation: { expression: "x^2" },
      annotations: {
        bold: true,
        italic: false,
        strikethrough: false,
        underline: false,
        code: false,
        color: "default",
      },
      plain_text: "x^2",
      href: null,
    } as unknown as ReturnType<typeof richText>;
    expect(await render([para(equation)])).toContain('<strong class="font-semibold"><code');
    const html = await render([para(equation)], {
      components: { inline_equation: ({ expression }) => <span data-math="">{expression}</span> },
    });
    expect(html).toContain('<span data-math="">x^2</span>');
  });

  it("links to a linked page by its title, through pageHref", async () => {
    const link = {
      ...block("link_to_page", { type: "page_id", page_id: PAGE_ID }),
      linkedPage: { id: PAGE_ID, title: "Install", icon: { type: "emoji", emoji: "📦" } },
    } as NotionBlock;
    const html = await render(
      [link, block("link_to_page", { type: "page_id", page_id: PAGE_ID })],
      {
        pageHref: (id) => `/docs/${id.slice(0, 4)}`,
      },
    );
    expect(html).toMatch(
      /<a href="\/docs\/244b"[^>]*><span aria-hidden="true"[^>]*>📦<\/span>Install<\/a>/,
    );
    expect(html.match(/<a /g)).toHaveLength(1);
  });

  it("renders bookmarks with a preview as cards, and others as links", async () => {
    const url = "https://example.com/post";
    const card = {
      ...block("bookmark", { url, caption: [richText("Worth reading")] }),
      bookmarkPreview: {
        title: "A post",
        description: "What it's about.",
        image: "https://example.com/cover.png",
        favicon: "https://example.com/favicon.ico",
      },
    } as NotionBlock;
    const html = await render([card, block("bookmark", { url, caption: [] })]);
    expect(html).toMatch(
      /<a href="https:\/\/example.com\/post" target="_blank" rel="noopener noreferrer"/,
    );
    expect(html).toContain("A post");
    expect(html).toContain("What it&#x27;s about.");
    expect(html).toContain('src="https://example.com/cover.png"');
    expect(html).toContain("<figcaption");
    // The second bookmark has no preview: a plain link labelled by its URL.
    expect(html).toMatch(
      /<p><a href="https:\/\/example.com\/post"[^>]*>https:\/\/example.com\/post/,
    );
  });

  it("renders embeds of /demos/<name> as demos, in a frame with the caption", async () => {
    const Demo = ({ name, params }: DemoProps) => (
      <button type="button">
        {name} {params.speed}
      </button>
    );
    const embed = (url: string, caption = [richText("Press the button.")]) =>
      block("embed", { url, caption });
    const blocks = [
      embed("https://nublson.com/demos/morph-button?speed=slow"),
      embed("https://nublson.com/demos/unknown", []),
    ];
    const html = await render(blocks, { demos: { "morph-button": Demo } });
    expect(html).toMatch(
      /<figure><div class="flex min-h-48[^"]*"><button type="button">morph-button<!-- --> <!-- -->slow<\/button><\/div><figcaption[^>]*>Press the button.<\/figcaption><\/figure>/,
    );
    // An unknown name stays a link.
    expect(html).toMatch(/<a href="https:\/\/nublson.com\/demos\/unknown"/);
    // Without demos, every embed is a link.
    expect(await render(blocks)).not.toContain("<button");

    const Frame = ({ name, children }: DemoFrameProps) => (
      <section data-demo={name}>{children}</section>
    );
    expect(
      await render(blocks, { demos: { "morph-button": Demo }, components: { demo: Frame } }),
    ).toContain('<section data-demo="morph-button"><button');
  });

  it("renders callout icons in one slot, and keeps the surface for text colors", async () => {
    const callout = (icon: unknown, color = "default") =>
      block("callout", { rich_text: [richText("Note")], color, icon });
    const html = await render([
      callout({
        type: "custom_emoji",
        custom_emoji: { id: "x", name: "notionic", url: "https://e.com/n.png" },
      }),
      callout({ type: "emoji", emoji: "💡" }, "red"),
      callout(null, "yellow_background"),
    ]);
    expect(html).toContain('<img src="https://e.com/n.png" alt=""');
    // A text color keeps the default surface; a background color replaces it.
    expect(html).toMatch(/border border-border bg-muted\/50 text-\(--notionic-red\)/);
    expect(html).toMatch(
      /class="flex gap-3 rounded-lg p-4 border border-transparent bg-\(--notionic-yellow-bg\)"/,
    );
  });

  it("passes uploaded files, not external ones, through transformFileUrl", async () => {
    const signed = "https://prod-files-secure.s3.amazonaws.com/a.png?X-Amz-Signature=x";
    const html = await render(
      [
        block(
          "image",
          { type: "file", file: { url: signed, expiry_time: "" }, caption: [] },
          { id: "img-1" },
        ),
        block("image", {
          type: "external",
          external: { url: "https://example.com/b.png" },
          caption: [],
        }),
        block(
          "file",
          { type: "file", file: { url: signed, expiry_time: "" }, caption: [], name: "a.pdf" },
          { id: "file-1" },
        ),
        block(
          "callout",
          {
            rich_text: [richText("Note")],
            color: "default",
            icon: { type: "file", file: { url: signed, expiry_time: "" } },
          },
          { id: "callout-1" },
        ),
      ],
      { transformFileUrl: ({ blockId }) => `/api/notion/file/${blockId}` },
    );
    expect(html).toContain('src="/api/notion/file/img-1"');
    expect(html).toContain('src="https://example.com/b.png"');
    expect(html).toContain('href="/api/notion/file/file-1"');
    expect(html).toContain('src="/api/notion/file/callout-1"');
    expect(html).not.toContain("X-Amz-Signature");
  });

  it("keeps uploaded files' URLs as they are without transformFileUrl", async () => {
    const signed = "https://prod-files-secure.s3.amazonaws.com/a.png";
    const html = await render([
      block("image", { type: "file", file: { url: signed, expiry_time: "" }, caption: [] }),
    ]);
    expect(html).toContain(`src="${signed}"`);
  });

  it("skips unsupported blocks", async () => {
    const html = await render([block("breadcrumb"), para(richText("after"))]);
    expect(html).toContain("after");
  });

  it("uses a replacement component for a block type", async () => {
    function MyCallout({ block, context, children }: BlockProps<"callout">) {
      return (
        <aside data-custom="">
          <RichText text={block.callout.rich_text} context={context} />
          {children}
        </aside>
      );
    }
    const html = await render(
      [
        block(
          "callout",
          { rich_text: [richText("Hi")], icon: null, color: "default" },
          { children: [para(richText("nested"))] },
        ),
      ],
      { components: { callout: MyCallout } },
    );
    expect(html).toContain("<aside data-custom");
    expect(html).toContain("Hi");
    expect(html).toContain("<p>nested</p>");
  });
});
