import type { ComponentType } from "react";
import { Code } from "./blocks/code";
import { Heading } from "./blocks/heading";
import { Column, ColumnList, SyncedBlock, Toggle } from "./blocks/layout";
import { BulletedListItem, NumberedListItem, ToDo } from "./blocks/list";
import {
  Audio,
  Bookmark,
  ChildPage,
  Embed,
  File,
  Image,
  LinkPreview,
  LinkToPage,
  Pdf,
  Video,
} from "./blocks/media";
import { Table } from "./blocks/table";
import { Tab, TableOfContents } from "./blocks/navigation";
import { Callout, Divider, Equation, InlineEquation, Paragraph, Quote } from "./blocks/text";
import { defaultPageHref } from "./links";
import type { HostedFile } from "./files";
import { collectHeadings } from "./headings";
import type { BlockComponents, BlockProps, NotionBlock, RenderContext } from "./types";
import { cx, warnOnce } from "./utils";

export const defaultComponents: BlockComponents = {
  paragraph: Paragraph,
  heading_1: Heading,
  heading_2: Heading,
  heading_3: Heading,
  heading_4: Heading,
  bulleted_list_item: BulletedListItem,
  numbered_list_item: NumberedListItem,
  to_do: ToDo,
  quote: Quote,
  callout: Callout,
  toggle: Toggle,
  divider: Divider,
  equation: Equation,
  code: Code,
  table: Table,
  column_list: ColumnList,
  column: Column,
  synced_block: SyncedBlock,
  image: Image,
  video: Video,
  audio: Audio,
  file: File,
  pdf: Pdf,
  bookmark: Bookmark,
  embed: Embed,
  link_preview: LinkPreview,
  child_page: ChildPage,
  link_to_page: LinkToPage,
  table_of_contents: TableOfContents,
  tab: Tab,
  inline_equation: InlineEquation,
};

type ListKind = "bulleted" | "numbered" | "todo";

type BlockGroup =
  | { kind: "block"; block: NotionBlock }
  | { kind: ListKind; items: [NotionBlock, ...NotionBlock[]] };

const LIST_KINDS: Partial<Record<NotionBlock["type"], ListKind>> = {
  bulleted_list_item: "bulleted",
  numbered_list_item: "numbered",
  to_do: "todo",
};

/**
 * Merges consecutive list items of one kind into a group, since the API
 * returns each item as its own block. Other blocks stand alone.
 */
export function groupBlocks(blocks: NotionBlock[]): BlockGroup[] {
  const groups: BlockGroup[] = [];
  for (const block of blocks) {
    const kind = LIST_KINDS[block.type];
    const last = groups[groups.length - 1];
    if (!kind) groups.push({ kind: "block", block });
    else if (last && last.kind === kind) last.items.push(block);
    else groups.push({ kind, items: [block] });
  }
  return groups;
}

const NUMBER_FORMATS = {
  numbers: "list-decimal",
  letters: "list-[lower-alpha]",
  roman: "list-[lower-roman]",
} as const;

function List({
  kind,
  items,
  context,
}: {
  kind: ListKind;
  items: [NotionBlock, ...NotionBlock[]];
  context: RenderContext;
}) {
  const rendered = items.map((item) => <Block key={item.id} block={item} context={context} />);
  if (kind === "numbered") {
    const first = items[0].type === "numbered_list_item" ? items[0].numbered_list_item : undefined;
    return (
      <ol
        start={first?.list_start_index}
        className={cx("flex flex-col gap-2 pl-6", NUMBER_FORMATS[first?.list_format ?? "numbers"])}
      >
        {rendered}
      </ol>
    );
  }
  return (
    <ul className={cx("flex flex-col gap-2", kind === "bulleted" ? "list-disc pl-6" : "list-none")}>
      {rendered}
    </ul>
  );
}

/** Blocks in order, with list items grouped into lists. */
export function BlockList({
  blocks,
  context,
}: {
  blocks: NotionBlock[] | undefined;
  context: RenderContext;
}) {
  if (!blocks?.length) return null;
  return groupBlocks(blocks).map((group) =>
    group.kind === "block" ? (
      <Block key={group.block.id} block={group.block} context={context} />
    ) : (
      <List key={group.items[0].id} kind={group.kind} items={group.items} context={context} />
    ),
  );
}

/** One block, rendered by its component, with its nested blocks as children. */
export function Block({ block, context }: { block: NotionBlock; context: RenderContext }) {
  const Component = context.components[block.type] as
    | ComponentType<BlockProps<NotionBlock["type"]>>
    | undefined;
  if (!Component) {
    warnOnce(`Notion block type "${block.type}" is not rendered`);
    return null;
  }
  const children = block.children?.length ? (
    <BlockList blocks={block.children} context={context} />
  ) : undefined;
  return (
    <Component block={block} context={context}>
      {children}
    </Component>
  );
}

export type NotionRendererProps = {
  /** Blocks from the Notion API, with nested blocks as `children` (see `fetchBlocks`). */
  blocks: NotionBlock[];
  /** Replace the built-in component for any block type. */
  components?: BlockComponents;
  /**
   * Where links to Notion pages point, by page id (32 hex characters, no
   * dashes). Return null to render the text without a link. Defaults to the
   * page on notion.so.
   */
  pageHref?: (pageId: string) => string | null;
  /**
   * Rewrites the URL of each file uploaded to Notion (images, videos, files,
   * icons). Notion's signed URLs expire after an hour, so point them at a
   * route that re-signs them, e.g. `({ blockId }) => \`/api/notion/file/\${blockId}\``.
   * External URLs aren't passed through it.
   */
  transformFileUrl?: (file: HostedFile) => string;
  className?: string;
};

/** Renders Notion blocks. Works as a Server Component; it ships no client JavaScript. */
export function NotionRenderer({
  blocks,
  components,
  pageHref = defaultPageHref,
  transformFileUrl,
  className,
}: NotionRendererProps) {
  const context: RenderContext = {
    pageHref,
    transformFileUrl,
    headings: collectHeadings(blocks),
    components: { ...defaultComponents, ...components },
  };
  return (
    <div className={cx("notionic flex flex-col gap-4 leading-7 text-foreground", className)}>
      <BlockList blocks={blocks} context={context} />
    </div>
  );
}
