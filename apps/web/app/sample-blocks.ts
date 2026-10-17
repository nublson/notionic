import type { NotionBlock } from "notionic";

// Blocks shaped like the Notion API's, so the page renders without a token.

let id = 0;

function block(type: string, data: object, children?: NotionBlock[]): NotionBlock {
  id += 1;
  return {
    object: "block",
    id: `sample-${id}`,
    type,
    has_children: Boolean(children?.length),
    [type]: data,
    ...(children ? { children } : {}),
  } as unknown as NotionBlock;
}

type Annotations = Partial<{
  bold: boolean;
  italic: boolean;
  strikethrough: boolean;
  underline: boolean;
  code: boolean;
  color: string;
}>;

function text(content: string, annotations: Annotations = {}, href: string | null = null) {
  return {
    type: "text",
    text: { content, link: href ? { url: href } : null },
    annotations: {
      bold: false,
      italic: false,
      strikethrough: false,
      underline: false,
      code: false,
      color: "default",
      ...annotations,
    },
    plain_text: content,
    href,
  };
}

const p = (...rich_text: ReturnType<typeof text>[]) =>
  block("paragraph", { rich_text, color: "default" });

const row = (...cells: string[]) =>
  block("table_row", { cells: cells.map((cell) => [text(cell)]) });

export const sampleBlocks: NotionBlock[] = [
  p(
    text("notionic renders blocks from the "),
    text("official Notion API", {}, "https://developers.notion.com"),
    text(" as React Server Components, with "),
    text("bold", { bold: true }),
    text(", "),
    text("italic", { italic: true }),
    text(", "),
    text("inline code", { code: true }),
    text(", "),
    text("red text", { color: "red" }),
    text(" and "),
    text("highlights", { color: "yellow_background" }),
    text("."),
  ),
  block("heading_1", {
    rich_text: [text("Getting started")],
    color: "default",
    is_toggleable: false,
  }),
  block("numbered_list_item", {
    rich_text: [text("Fetch a page's blocks with fetchBlocks.")],
    color: "default",
  }),
  block(
    "numbered_list_item",
    { rich_text: [text("Pass them to <NotionRenderer>.")], color: "default" },
    [
      block("bulleted_list_item", {
        rich_text: [text("Nested lists work too.")],
        color: "default",
      }),
    ],
  ),
  block("to_do", { rich_text: [text("Reserve the npm name")], checked: true, color: "default" }),
  block("to_do", {
    rich_text: [text("Ship the shadcn registry")],
    checked: false,
    color: "default",
  }),
  block("callout", {
    rich_text: [
      text("Code, callouts, tables and toggles here come from notionic's shadcn registry."),
    ],
    icon: { type: "emoji", emoji: "💡" },
    color: "default",
  }),
  block("code", {
    language: "typescript",
    rich_text: [
      text(
        "const blocks = await fetchBlocks(notion, pageId)\n\nreturn <NotionRenderer blocks={blocks} />",
      ),
    ],
    caption: [text("app/page.tsx")],
  }),
  block("heading_2", { rich_text: [text("More blocks")], color: "default", is_toggleable: false }),
  block("quote", { rich_text: [text("Use Notion as your CMS.")], color: "default" }),
  block("toggle", { rich_text: [text("A toggle")], color: "default" }, [
    p(text("Stays in the HTML while closed, so search engines see it.")),
  ]),
  block("table", { has_column_header: true, has_row_header: false, table_width: 2 }, [
    row("Notion block", "shadcn/ui component"),
    row("code", "Code Block"),
    row("callout", "Alert"),
    row("table", "Table"),
    row("toggle", "Collapsible"),
    row("tab", "Tabs"),
  ]),
  block("column_list", {}, [
    block("column", {}, [p(text("Left column"))]),
    block("column", {}, [p(text("Right column"))]),
  ]),
  block("divider", {}),
  p(text("That's it.", { color: "gray" })),
];
