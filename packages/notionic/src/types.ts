import type {
  BlockObjectResponse,
  PageObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client";
import type { ComponentType, ReactNode } from "react";
import type { HostedFile } from "./files";
import type { PageHeading } from "./headings";

export type PageIcon = PageObjectResponse["icon"];

/** The page a `link_to_page` or `child_page` block points to, attached by `fetchBlocks`. */
export type LinkedPage = { id: string; title: string; icon: PageIcon };

/** What a linked page says about itself, attached by `fetchBlocks` to bookmarks, embeds and link previews. */
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
 * for `link_to_page` and `child_page` the linked page as `linkedPage`, for `bookmark`,
 * `embed` and `link_preview` the linked page's preview as `bookmarkPreview`, and
 * with `linkFavicons` the favicons of the sites its text links to.
 */
export type NotionBlock = BlockObjectResponse & {
  children?: NotionBlock[];
  linkedPage?: LinkedPage;
  bookmarkPreview?: BookmarkPreview;
  /**
   * The favicon of each site the block's text links to, by host, as a data
   * URL, or null for a site without one. Attached by `fetchBlocks` with
   * `linkFavicons: true`; hosts it couldn't look up are left out.
   */
  linkFavicons?: Record<string, string | null>;
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

/** Footnotes from a "Footnotes" section (see `NotionRendererProps`). */
export type FootnotesOptions = {
  /** Heading texts that start the footnotes section, matched ignoring case. Default ["Footnotes"]; [] turns footnotes off. */
  headings?: string[];
  /** Show a title above the footnote list instead of a separator. Default false. */
  showTitle?: boolean;
  /** The title, instead of the Notion heading's text. Also names the list for screen readers. */
  title?: string;
};

/** One block of the footnotes section. */
export type Footnote = {
  block: NotionBlock;
  /** 1-based, by first reference in reading order; null when nothing references it. */
  number: number | null;
  /** One anchor id per reference, in reading order: "fnref-1", "fnref-1-2"… */
  refIds: string[];
};

/** A page's footnotes, from `collectFootnotes`. */
export type PageFootnotes = {
  /** The heading that starts the section. It marks the section and never renders. */
  heading: { blockId: string; level: 1 | 2 | 3 | 4; text: string };
  showTitle: boolean;
  /** `title`, or the heading's text. */
  title: string;
  /** The heading and the top-level blocks after it that the section replaces, by id without dashes. */
  sectionBlockIds: Set<string>;
  /** Numbered notes by number, then unreferenced notes in page order. */
  notes: Footnote[];
  /** Each referencing rich text item, by identity: its footnote's number and anchor id. */
  refs: Map<object, { number: number; id: string }>;
};

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
  /** Your demo components, by name (see `NotionRendererProps`). */
  demos?: Demos;
  /** Which embeds load in an iframe (see `NotionRendererProps`). */
  embeds?: EmbedPolicy;
  /** The page's footnotes, when it has a footnotes section (see `collectFootnotes`). */
  footnotes?: PageFootnotes;
  /**
   * The favicons of linked sites by host, when `NotionRenderer` shows them
   * (see `collectLinkFavicons`). Absent when favicons are off.
   */
  linkFavicons?: ReadonlyMap<string, string | null>;
};

/** Props of a demo component: what its embed's URL says. */
export type DemoProps = {
  /** The demo's name, from the embed's URL: `…/demos/<name>`. */
  name: string;
  /** The URL's query parameters: `?speed=slow` is `{ speed: "slow" }`. */
  params: Record<string, string>;
};

/** Demo components by name, rendered in place of embeds of `…/demos/<name>`. */
export type Demos = Record<string, ComponentType<DemoProps>>;

/**
 * Which embeds load in an iframe: all (`true`), those whose host is one of
 * these hosts or a subdomain of one, or those the function accepts (it gets
 * the embed's URL). Only http(s) URLs are ever embedded.
 */
export type EmbedPolicy = boolean | readonly string[] | ((url: string) => boolean);

/** Props of the frame around a demo. */
export type DemoFrameProps = {
  name: string;
  /** The embed's caption. */
  caption: RichText;
  /** The frame's height in pixels, from the URL's `?height=`; undefined fits the demo. */
  height?: number;
  context: RenderContext;
  /** The demo, rendered. */
  children: ReactNode;
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

/** Props of the component that renders a link inside text. */
export type LinkProps = {
  /** Where the link goes, and whether it opens in a new tab. */
  link: ResolvedLink;
  /** The linked text, already formatted. */
  children: ReactNode;
  context: RenderContext;
  /**
   * The linked site's favicon as a data URL, or null for a site without one,
   * when `NotionRenderer` shows favicons and the link goes to another site.
   * Undefined otherwise. `LinkFavicon` renders it: the icon, a globe, or nothing.
   */
  favicon?: string | null;
};

/**
 * Replacements for the built-in components: one per block type, plus
 * `inline_equation` for equations inside text, `link` for links inside text,
 * and `demo` for the frame around demos.
 */
export type BlockComponents = {
  [T in NotionBlockType]?: ComponentType<BlockProps<T>>;
} & {
  inline_equation?: ComponentType<InlineEquationProps>;
  link?: ComponentType<LinkProps>;
  demo?: ComponentType<DemoFrameProps>;
  footnotes?: ComponentType<FootnotesProps>;
};

/** Props of the component that renders the footnote list, in place of the footnotes section. */
export type FootnotesProps = {
  /** Numbered notes by number, then unreferenced notes. */
  notes: Footnote[];
  /** `title`, or the footnotes heading's text. */
  title: string;
  /** Whether the title shows; otherwise a separator does, and the title is only read by screen readers. */
  showTitle: boolean;
  /** The footnotes heading's level in Notion: 1 for heading 1. */
  level: 1 | 2 | 3 | 4;
  context: RenderContext;
};
