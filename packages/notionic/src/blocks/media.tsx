import type { ReactNode } from "react";
import { DemoBoundary } from "../demo-boundary";
import { matchDemo } from "../demos";
import { resolveFileUrl } from "../files";
import { resolveLink, resolvePageLink } from "../links";
import { NotionLink, RichText } from "../rich-text";
import type {
  BlockProps,
  BookmarkPreview,
  PageIcon,
  DemoFrameProps,
  EmbedPolicy,
  RenderContext,
  RichText as RichTextArray,
} from "../types";
import { cx, plainText } from "../utils";
import { BROKEN_IMAGE, IconSlot, IMAGE_EDGE, IMAGE_OUTLINE } from "./icon";

/** An http(s) URL, or a same-site path such as a file proxy route. */
function isUrl(url: string): boolean {
  if (/^\/(?![/\\])/.test(url)) return true;
  try {
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

function Caption({ caption, context }: { caption: RichTextArray; context: RenderContext }) {
  if (caption.length === 0) return null;
  return (
    <figcaption className="mt-2 text-sm text-muted-foreground">
      <RichText text={caption} context={context} />
    </figcaption>
  );
}

/** A line linking to a URL, labelled by the caption or the URL itself. */
function UrlLine({ url, label, context }: { url: string; label: string; context: RenderContext }) {
  const link = resolveLink(url, context);
  if (!link) return null;
  const Link = context.components.link ?? NotionLink;
  return (
    <p>
      <Link link={link} context={context}>
        {label || url}
      </Link>
    </p>
  );
}

export function Image({ block, context }: BlockProps<"image">) {
  const src = resolveFileUrl(block.image, block.id, context);
  if (!src || !isUrl(src)) return null;
  return (
    <figure>
      <img
        src={src}
        alt={plainText(block.image.caption)}
        loading="lazy"
        decoding="async"
        className={cx("h-auto max-w-full rounded-lg", IMAGE_EDGE)}
      />
      <Caption caption={block.image.caption} context={context} />
    </figure>
  );
}

// An inset hairline (--notionic-image-outline) so light media keep an edge.
const MEDIA_OUTLINE = `rounded-lg ${IMAGE_OUTLINE}`;
// Players and embeds also get a muted fill, so they have a shape while they
// load. Images don't: it would show through transparent ones.
const MEDIA_SURFACE = `${MEDIA_OUTLINE} bg-muted`;

// External links to video files play like uploaded ones, as in Notion.
const VIDEO_FILE = /\.(mp4|webm|mov|m4v|ogv)$/i;

function isVideoFile(url: string): boolean {
  try {
    return VIDEO_FILE.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

/** The embed URL for a YouTube link, or null. */
export function youTubeEmbedUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^(www\.|m\.)/, "");
  let id: string | null = null;
  if (host === "youtu.be") id = parsed.pathname.slice(1);
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id =
      parsed.searchParams.get("v") ??
      parsed.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1] ??
      null;
  }
  return id && /^[\w-]{6,}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}

export function Video({ block, context }: BlockProps<"video">) {
  const src = resolveFileUrl(block.video, block.id, context) ?? "";
  const caption = block.video.caption;
  const label = plainText(caption);
  const embed = youTubeEmbedUrl(src);
  if (embed) {
    return (
      <figure>
        <iframe
          src={embed}
          title={label || "YouTube video"}
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          loading="lazy"
          className={cx("aspect-video w-full", MEDIA_SURFACE)}
        />
        <Caption caption={caption} context={context} />
      </figure>
    );
  }
  if (isUrl(src) && (block.video.type === "file" || isVideoFile(src))) {
    return (
      <figure>
        {/* biome-ignore lint/a11y/useMediaCaption: Notion has no caption tracks to render; the caption is shown in <figcaption> */}
        <video
          src={src}
          controls
          preload="metadata"
          aria-label={label || "Video"}
          className={cx("w-full", MEDIA_SURFACE)}
        />
        <Caption caption={caption} context={context} />
      </figure>
    );
  }
  return <UrlLine url={src} label={label} context={context} />;
}

export function Audio({ block, context }: BlockProps<"audio">) {
  const src = resolveFileUrl(block.audio, block.id, context);
  if (!src || !isUrl(src)) return null;
  return (
    <figure>
      {/* biome-ignore lint/a11y/useMediaCaption: Notion has no caption tracks to render; the caption is shown in <figcaption> */}
      <audio
        src={src}
        controls
        preload="metadata"
        aria-label={plainText(block.audio.caption) || "Audio"}
        className="w-full"
      />
      <Caption caption={block.audio.caption} context={context} />
    </figure>
  );
}

/** The extension of a file name or URL path, upper-cased ("report.pdf" is "PDF"), or null. */
function fileExtension(name: string): string | null {
  const match = name.match(/\.([a-z0-9]{1,8})$/i);
  return match?.[1] ? match[1].toUpperCase() : null;
}

/** The last segment of a URL's path, decoded: "…/files/report.pdf?X=1" is "report.pdf". */
function fileNameFromUrl(url: string): string {
  try {
    return decodeURIComponent(new URL(url, "https://notionic.dev").pathname.split("/").pop() ?? "");
  } catch {
    return "";
  }
}

/** The URL Notion gave for a file, before `transformFileUrl`. */
function sourceUrl(file: { external: { url: string } } | { file: { url: string } }) {
  return "external" in file ? file.external.url : file.file.url;
}

/** A URL without its protocol, `www.` or a trailing slash: "github.com/vercel/next.js". */
function displayUrl(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}

/**
 * A link as a one-line bordered row: an icon, a title that truncates (the full
 * title as a tooltip), an optional detail at the end, and the caption below.
 */
function CardRow({
  url,
  title,
  icon,
  detail,
  caption,
  context,
}: {
  url: string;
  title: string;
  icon: ReactNode;
  detail?: string | null;
  caption: RichTextArray;
  context: RenderContext;
}) {
  const link = resolveLink(url, context);
  if (!link) return null;
  return (
    <figure>
      <a
        href={link.href}
        title={title}
        {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 transition-[background-color,scale] hover:bg-muted/50 active:scale-[0.99] motion-reduce:active:scale-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5 shrink-0 text-muted-foreground"
        >
          {icon}
        </svg>
        <span className="min-w-0 flex-1 truncate font-medium">{title}</span>
        {detail ? <span className="shrink-0 text-xs text-muted-foreground">{detail}</span> : null}
        {link.external ? <span className="sr-only"> (opens in a new tab)</span> : null}
      </a>
      <Caption caption={caption} context={context} />
    </figure>
  );
}

const FILE_ICON = (
  <>
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
  </>
);

const LINK_ICON = (
  <>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </>
);

const EMBED_ICON = (
  <>
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="M10 4v4" />
    <path d="M2 8h20" />
    <path d="M6 4v4" />
  </>
);

/** A file as a card: its name, its type ("PDF"), and the caption below. */
function FileCard({
  url,
  name,
  caption,
  context,
}: {
  url: string;
  name: string;
  caption: RichTextArray;
  context: RenderContext;
}) {
  return (
    <CardRow
      url={url}
      title={name || url}
      icon={FILE_ICON}
      detail={fileExtension(name)}
      caption={caption}
      context={context}
    />
  );
}

export function File({ block, context }: BlockProps<"file">) {
  return (
    <FileCard
      url={resolveFileUrl(block.file, block.id, context) ?? ""}
      name={block.file.name || fileNameFromUrl(sourceUrl(block.file))}
      caption={block.file.caption}
      context={context}
    />
  );
}

// A card rather than an inline viewer, which most phones don't support. The
// name comes from Notion's URL, since a transformed one may not carry it.
export function Pdf({ block, context }: BlockProps<"pdf">) {
  return (
    <FileCard
      url={resolveFileUrl(block.pdf, block.id, context) ?? ""}
      name={fileNameFromUrl(sourceUrl(block.pdf))}
      caption={block.pdf.caption}
      context={context}
    />
  );
}

export function Bookmark({ block, context }: BlockProps<"bookmark">) {
  const { url, caption } = block.bookmark;
  return (
    <PreviewCard
      url={url}
      preview={block.bookmarkPreview}
      icon={LINK_ICON}
      caption={caption}
      context={context}
    />
  );
}

/**
 * A link with the linked page's title, description and image, as in Notion's
 * bookmarks: the image sits on the right, or on top when the card is narrow (a
 * phone, a column). Without a preview from `fetchBlocks` (none fetched, or the
 * page had no title), a one-line card.
 */
function PreviewCard({
  url,
  preview,
  icon,
  caption,
  context,
}: {
  url: string;
  preview: BookmarkPreview | undefined;
  icon: ReactNode;
  caption: RichTextArray;
  context: RenderContext;
}) {
  const link = resolveLink(url, context);
  if (!preview || !link) {
    return (
      <CardRow url={url} title={displayUrl(url)} icon={icon} caption={caption} context={context} />
    );
  }
  return (
    <figure className="@container">
      <a
        href={link.href}
        {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="flex flex-col-reverse overflow-hidden rounded-lg border border-border transition-[background-color,scale] @md:min-h-26 @md:flex-row hover:bg-muted/50 active:scale-[0.99] motion-reduce:active:scale-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1 p-3.5">
          <span className="line-clamp-2 text-sm font-medium @md:line-clamp-1">{preview.title}</span>
          {preview.description ? (
            <span className="line-clamp-2 text-xs text-muted-foreground">
              {preview.description}
            </span>
          ) : null}
          <span className="mt-auto flex min-w-0 items-center gap-1.5 pt-1.5 text-xs text-muted-foreground">
            {preview.favicon ? (
              <img
                src={preview.favicon}
                alt=""
                width={16}
                height={16}
                loading="lazy"
                referrerPolicy="no-referrer"
                className={cx("size-4 shrink-0 rounded-sm", BROKEN_IMAGE)}
              />
            ) : null}
            <span className="truncate">{displayUrl(url)}</span>
          </span>
        </span>
        {preview.image ? (
          <img
            src={preview.image}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className={cx(
              "aspect-[1.91/1] w-full border-b border-border bg-muted object-cover @md:aspect-auto @md:w-1/3 @md:max-w-60 @md:shrink-0 @md:border-b-0 @md:border-s",
              BROKEN_IMAGE,
            )}
          />
        ) : null}
        {link.external ? <span className="sr-only"> (opens in a new tab)</span> : null}
      </a>
      <Caption caption={caption} context={context} />
    </figure>
  );
}

/** The default frame around a demo: a bordered stage with the caption below. */
export function DemoFrame({ caption, context, children }: DemoFrameProps) {
  return (
    <figure>
      <div className="flex box-content min-h-56 flex-col items-center justify-center gap-6 overflow-hidden rounded-xl border border-border px-6 py-10">
        {children}
      </div>
      {caption.length ? (
        <figcaption className="mt-3 text-center text-sm text-muted-foreground">
          <RichText text={caption} context={context} />
        </figcaption>
      ) : null}
    </figure>
  );
}

/**
 * Whether `embeds` lets this URL load in an iframe: only http(s) URLs, and of
 * those all (`true`), the ones whose host is a listed host or a subdomain of
 * one, or the ones the function accepts.
 */
function allowsEmbed(url: string, embeds: EmbedPolicy | undefined): boolean {
  if (!embeds) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  if (embeds === true) return true;
  if (typeof embeds === "function") return embeds(parsed.href);
  const host = parsed.hostname.toLowerCase();
  return embeds.some((allowed) => {
    const listed = allowed.toLowerCase();
    return host === listed || host.endsWith(`.${listed}`);
  });
}

/**
 * An embed, as a preview card linking to it: embedding any site in an iframe
 * is unsafe, and most refuse it. A site `embeds` allows loads in a sandboxed
 * iframe instead. An embed of `…/demos/<name>` whose name is one of `demos`
 * renders that demo component, in the `demo` frame. A demo that throws leaves
 * its frame empty.
 */
export function Embed({ block, context }: BlockProps<"embed">) {
  const demo = matchDemo(block.embed.url, context.demos);
  if (demo) {
    const Frame = context.components.demo ?? DemoFrame;
    return (
      <Frame name={demo.name} caption={block.embed.caption} context={context}>
        <DemoBoundary>
          <demo.Component name={demo.name} params={demo.params} />
        </DemoBoundary>
      </Frame>
    );
  }
  if (allowsEmbed(block.embed.url, context.embeds)) {
    const caption = block.embed.caption;
    return (
      <figure>
        <iframe
          src={block.embed.url}
          title={plainText(caption) || block.bookmarkPreview?.title || "Embedded content"}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
          allow="clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          loading="lazy"
          className={cx("aspect-video w-full", MEDIA_SURFACE)}
        />
        <Caption caption={caption} context={context} />
      </figure>
    );
  }
  return (
    <PreviewCard
      url={block.embed.url}
      preview={block.bookmarkPreview}
      icon={EMBED_ICON}
      caption={block.embed.caption}
      context={context}
    />
  );
}

export function LinkPreview({ block, context }: BlockProps<"link_preview">) {
  return (
    <PreviewCard
      url={block.link_preview.url}
      preview={block.bookmarkPreview}
      icon={LINK_ICON}
      caption={[]}
      context={context}
    />
  );
}

const PAGE_ICON = (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-5 text-muted-foreground"
  >
    {FILE_ICON}
  </svg>
);

/**
 * A page as a row: its icon (or a page icon), then its title. Rows that
 * follow each other sit close together, like a list of subpages in Notion.
 */
function PageRow({
  pageId,
  title,
  icon,
  blockId,
  context,
}: {
  pageId: string;
  title: string;
  icon: PageIcon | undefined;
  blockId: string;
  context: RenderContext;
}) {
  const link = resolvePageLink(pageId, context);
  const row = "flex flex-1 gap-2 rounded-md px-2 py-1";
  const content = (
    <>
      <IconSlot icon={icon} blockId={blockId} context={context} fallback={PAGE_ICON} />
      <span className="min-w-0 font-medium underline decoration-muted-foreground/50 decoration-from-font underline-offset-4 transition-[text-decoration-color] group-hover:decoration-foreground">
        {title || "Untitled"}
      </span>
    </>
  );
  return (
    // The row's padding bleeds past the text, so titles align with the text around them.
    <p data-page-row="" className="-mx-2 flex [[data-page-row]+&]:-mt-3">
      {link ? (
        <a
          href={link.href}
          {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className={cx(
            "group transition-[background-color] hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            row,
          )}
        >
          {content}
          {link.external ? <span className="sr-only"> (opens in a new tab)</span> : null}
        </a>
      ) : (
        <span className={row}>{content}</span>
      )}
    </p>
  );
}

/** A subpage, with its icon when `fetchBlocks` attached it. */
export function ChildPage({ block, context }: BlockProps<"child_page">) {
  return (
    <PageRow
      pageId={block.id}
      title={block.child_page.title}
      icon={block.linkedPage?.icon}
      blockId={block.id}
      context={context}
    />
  );
}

/** A link to another page, titled by `fetchBlocks`. Without a title, nothing renders. */
export function LinkToPage({ block, context }: BlockProps<"link_to_page">) {
  const page = block.linkedPage;
  if (!page) return null;
  return (
    <PageRow
      pageId={page.id}
      title={page.title}
      icon={page.icon}
      blockId={block.id}
      context={context}
    />
  );
}
