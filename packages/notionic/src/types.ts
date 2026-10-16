import type {
  BlockObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client";
import type { ComponentType, ReactNode } from "react";

/** A block from the Notion API, with its nested blocks attached as `children`. */
export type NotionBlock = BlockObjectResponse & { children?: NotionBlock[] };

export type NotionBlockType = NotionBlock["type"];

/** A Notion block of one type, with its typed payload. */
export type BlockOf<T extends NotionBlockType> = Extract<
  NotionBlock,
  { type: T }
>;

export type RichText = RichTextItemResponse[];

/** A link as it should render: same tab, or a new tab for another site. */
export type ResolvedLink = { href: string; external: boolean };

/**
 * Per-render state, passed down explicitly: Server Components can't read
 * React context.
 */
export type RenderContext = {
  /** Where a Notion page links to, or null to render its text without a link. */
  pageHref: (pageId: string) => string | null;
  /** Unique heading ids across the whole page. */
  slug: (text: string) => string;
  components: BlockComponents;
};

export type BlockProps<T extends NotionBlockType> = {
  block: BlockOf<T>;
  context: RenderContext;
  /** The block's nested blocks, rendered; undefined when it has none. */
  children?: ReactNode;
};

/** Replacements for the built-in components, by block type. */
export type BlockComponents = {
  [T in NotionBlockType]?: ComponentType<BlockProps<T>>;
};
