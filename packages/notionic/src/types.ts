import type {
  BlockObjectResponse,
  PageObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client";
import type { ComponentType, ReactNode } from "react";
import type { HostedFile } from "./files";
import type { PageHeading } from "./headings";

export type PageIcon = PageObjectResponse["icon"];

/** The page a `link_to_page` block points to, attached by `fetchBlocks`. */
export type LinkedPage = { id: string; title: string; icon: PageIcon };

/** What a bookmarked page says about itself, attached by `fetchBlocks`. */
export type BookmarkPreview = {
  title: string;
  description?: string;
  /** The page's Open Graph image. */
  image?: string;
  favicon?: string;
  siteName?: string;
};

/**
 * A block from the Notion API, with its nested blocks attached as `children`,
 * for `link_to_page` the linked page as `linkedPage`, and for `bookmark` the
 * bookmarked page's preview as `bookmarkPreview`.
 */
export type NotionBlock = BlockObjectResponse & {
  children?: NotionBlock[];
  linkedPage?: LinkedPage;
  bookmarkPreview?: BookmarkPreview;
};

/** A Notion page's metadata, from `fetchPage`. */
export type NotionPage = {
  id: string;
  url: string;
  title: string;
  icon: PageIcon;
  cover: PageObjectResponse["cover"];
  lastEditedTime: string;
  properties: PageObjectResponse["properties"];
};

export type NotionBlockType = NotionBlock["type"];

/** A Notion block of one type, with its typed payload. */
export type BlockOf<T extends NotionBlockType> = Extract<NotionBlock, { type: T }>;

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
  /** The page's headings, with their anchor ids (see `collectHeadings`). */
  headings: PageHeading[];
  components: BlockComponents;
  /** Rewrites URLs of files uploaded to Notion (see `NotionRendererProps`). */
  transformFileUrl?: (file: HostedFile) => string;
};

export type BlockProps<T extends NotionBlockType> = {
  block: BlockOf<T>;
  context: RenderContext;
  /** The block's nested blocks, rendered; undefined when it has none. */
  children?: ReactNode;
};

export type InlineEquationProps = {
  /** The equation's LaTeX source. */
  expression: string;
  context: RenderContext;
};

/**
 * Replacements for the built-in components: one per block type, plus
 * `inline_equation` for equations inside text.
 */
export type BlockComponents = {
  [T in NotionBlockType]?: ComponentType<BlockProps<T>>;
} & {
  inline_equation?: ComponentType<InlineEquationProps>;
};
