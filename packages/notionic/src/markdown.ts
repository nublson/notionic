import { resolveFileUrl } from "./files";
import { defaultPageHref, resolveLink, resolvePageLink } from "./links";
import type { NotionBlock, RenderContext, RichText } from "./types";
import { plainText } from "./utils";

export type MarkdownOptions = {
  /** Where links to Notion pages point, as in `NotionRenderer`. Defaults to notion.so. */
  pageHref?: (pageId: string) => string | null;
  /** Rewrites URLs of files uploaded to Notion, as in `NotionRenderer`. */
  transformFileUrl?: RenderContext["transformFileUrl"];
};

type Context = RenderContext;

function inline(text: RichText, context: Context): string {
  return text
    .map((item) => {
      if (item.type === "equation") return `$${item.equation.expression}$`;
      let value = item.plain_text;
      if (!value) return "";
      const { annotations } = item;
      if (annotations.code) value = `\`${value}\``;
      if (annotations.bold) value = `**${value}**`;
      if (annotations.italic) value = `*${value}*`;
      if (annotations.strikethrough) value = `~~${value}~~`;
      const link = resolveLink(item.href, context);
      if (link) value = `[${value}](${link.href})`;
      // A line break within a block (Shift+Enter) is a hard break.
      return value.replace(/\n/g, "  \n");
    })
    .join("");
}

function indent(markdown: string, prefix: string): string {
  return markdown
    .split("\n")
    .map((line) => (line ? prefix + line : line))
    .join("\n");
}

function quote(markdown: string): string {
  return markdown
    .split("\n")
    .map((line) => (line ? `> ${line}` : ">"))
    .join("\n");
}

function fence(code: string): string {
  const longest = Math.max(2, ...(code.match(/`+/g) ?? []).map((run) => run.length));
  return "`".repeat(longest + 1);
}

function linkLine(label: string, url: string | null, context: Context): string {
  const link = url ? resolveLink(url, context) : null;
  return link ? `[${label || link.href}](${link.href})` : "";
}

function headingLevel(type: string): number {
  // A page's title is its h1, so Notion's heading 1 is ##, as in the HTML.
  return Number(type.slice(-1)) + 1;
}

function listItems(items: NotionBlock[], context: Context): string {
  const first = items[0];
  const start =
    first?.type === "numbered_list_item" ? (first.numbered_list_item.list_start_index ?? 1) : 1;
  return items
    .map((item, index) => {
      let marker = "-";
      let text: RichText = [];
      if (item.type === "bulleted_list_item") text = item.bulleted_list_item.rich_text;
      if (item.type === "numbered_list_item") {
        marker = `${start + index}.`;
        text = item.numbered_list_item.rich_text;
      }
      if (item.type === "to_do") {
        marker = item.to_do.checked ? "- [x]" : "- [ ]";
        text = item.to_do.rich_text;
      }
      const children = item.children?.length
        ? `\n${indent(render(item.children, context), "   ")}`
        : "";
      return `${marker} ${inline(text, context)}${children}`;
    })
    .join("\n");
}

function table(block: NotionBlock, context: Context): string {
  const rows = (block.children ?? []).flatMap((row) =>
    row.type === "table_row" ? [row.table_row.cells] : [],
  );
  const [header, ...body] = rows;
  if (!header) return "";
  const line = (cells: RichText[]) =>
    `| ${cells
      .map((cell) =>
        inline(cell, context)
          .replace(/\|/g, "\\|")
          .replace(/ {2}\n/g, " "),
      )
      .join(" | ")} |`;
  return [line(header), `| ${header.map(() => "---").join(" | ")} |`, ...body.map(line)].join("\n");
}

function block(item: NotionBlock, context: Context): string {
  const children = item.children?.length ? render(item.children, context) : "";
  const withChildren = (markdown: string) => [markdown, children].filter(Boolean).join("\n\n");

  switch (item.type) {
    case "paragraph":
      return withChildren(inline(item.paragraph.rich_text, context));
    case "heading_1":
    case "heading_2":
    case "heading_3":
    case "heading_4": {
      const data =
        item.type === "heading_1"
          ? item.heading_1
          : item.type === "heading_2"
            ? item.heading_2
            : item.type === "heading_3"
              ? item.heading_3
              : item.heading_4;
      const text = inline(data.rich_text, context).trim();
      return withChildren(text ? `${"#".repeat(headingLevel(item.type))} ${text}` : "");
    }
    case "quote":
      return quote(withChildren(inline(item.quote.rich_text, context)));
    case "callout": {
      const icon = item.callout.icon?.type === "emoji" ? `${item.callout.icon.emoji} ` : "";
      return quote(withChildren(icon + inline(item.callout.rich_text, context)));
    }
    case "toggle":
      return `<details>\n<summary>${plainText(item.toggle.rich_text)}</summary>\n\n${children}\n\n</details>`;
    case "divider":
      return "---";
    case "equation":
      return `$$\n${item.equation.expression}\n$$`;
    case "code": {
      const code = plainText(item.code.rich_text).replace(/\n$/, "");
      const language = item.code.language === "plain text" ? "" : item.code.language;
      const marks = fence(code);
      const caption = plainText(item.code.caption);
      return `${marks}${language}\n${code}\n${marks}${caption ? `\n\n${caption}` : ""}`;
    }
    case "table":
      return table(item, context);
    case "column_list":
    case "column":
    case "synced_block":
      return children;
    case "tab":
      return (item.children ?? [])
        .flatMap((tab) => {
          if (tab.type !== "paragraph") return [];
          const title = `**${plainText(tab.paragraph.rich_text)}**`;
          return [
            [title, tab.children?.length ? render(tab.children, context) : ""]
              .filter(Boolean)
              .join("\n\n"),
          ];
        })
        .join("\n\n");
    case "image": {
      const url = resolveFileUrl(item.image, item.id, context);
      return url ? `![${plainText(item.image.caption)}](${url})` : "";
    }
    case "video":
      return linkLine(
        plainText(item.video.caption) || "Video",
        resolveFileUrl(item.video, item.id, context),
        context,
      );
    case "audio":
      return linkLine(
        plainText(item.audio.caption) || "Audio",
        resolveFileUrl(item.audio, item.id, context),
        context,
      );
    case "file":
      return linkLine(
        item.file.name || plainText(item.file.caption),
        resolveFileUrl(item.file, item.id, context),
        context,
      );
    case "pdf":
      return linkLine(
        plainText(item.pdf.caption) || "PDF",
        resolveFileUrl(item.pdf, item.id, context),
        context,
      );
    case "bookmark":
      return linkLine(
        plainText(item.bookmark.caption) || item.bookmarkPreview?.title || "",
        item.bookmark.url,
        context,
      );
    case "embed":
      return linkLine(
        plainText(item.embed.caption) || item.bookmarkPreview?.title || "",
        item.embed.url,
        context,
      );
    case "link_preview":
      return linkLine(item.bookmarkPreview?.title ?? "", item.link_preview.url, context);
    case "child_page": {
      const link = resolvePageLink(item.id, context);
      const title = item.child_page.title || "Untitled";
      return link ? `[${title}](${link.href})` : title;
    }
    case "link_to_page": {
      const page = item.linkedPage;
      if (!page) return "";
      const link = resolvePageLink(page.id, context);
      const title = page.title || "Untitled";
      return link ? `[${title}](${link.href})` : title;
    }
    default:
      // Table of contents, breadcrumbs and unsupported blocks have no text.
      return "";
  }
}

const LIST_TYPES = new Set(["bulleted_list_item", "numbered_list_item", "to_do"]);

function render(blocks: NotionBlock[], context: Context): string {
  const parts: string[] = [];
  let list: NotionBlock[] = [];
  const flush = () => {
    if (list.length) parts.push(listItems(list, context));
    list = [];
  };
  for (const item of blocks) {
    if (LIST_TYPES.has(item.type)) {
      if (list[0] && list[0].type !== item.type) flush();
      list.push(item);
      continue;
    }
    flush();
    const markdown = block(item, context);
    if (markdown.trim()) parts.push(markdown);
  }
  flush();
  return parts.join("\n\n");
}

/**
 * Notion blocks as GitHub-flavored Markdown, for feeds, `llms.txt` and other
 * plain-text uses. Links and files resolve as in `NotionRenderer`; Notion's
 * heading 1 becomes `##`, so add the page title as `#` yourself.
 */
export function blocksToMarkdown(blocks: NotionBlock[], options: MarkdownOptions = {}): string {
  const context: Context = {
    pageHref: options.pageHref ?? defaultPageHref,
    transformFileUrl: options.transformFileUrl,
    headings: [],
    components: {},
  };
  return render(blocks, context);
}
