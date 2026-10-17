import { matchDemo } from "../demos";
import { resolveFileUrl } from "../files";
import { resolveLink, resolvePageLink } from "../links";
import { NotionLink, RichText } from "../rich-text";
import type {
  BlockProps,
  DemoFrameProps,
  RenderContext,
  RichText as RichTextArray,
} from "../types";
import { plainText } from "../utils";

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
  return (
    <p className="break-words">
      <NotionLink link={link}>{label || url}</NotionLink>
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
        className="h-auto max-w-full rounded-lg"
      />
      <Caption caption={block.image.caption} context={context} />
    </figure>
  );
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
          className="aspect-video w-full rounded-lg"
        />
        <Caption caption={caption} context={context} />
      </figure>
    );
  }
  if (block.video.type === "file" && isUrl(src)) {
    return (
      <figure>
        {/* biome-ignore lint/a11y/useMediaCaption: Notion has no caption tracks to render; the caption is shown in <figcaption> */}
        <video src={src} controls preload="metadata" className="w-full rounded-lg" />
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
      <audio src={src} controls preload="metadata" className="w-full" />
      <Caption caption={block.audio.caption} context={context} />
    </figure>
  );
}

export function File({ block, context }: BlockProps<"file">) {
  return (
    <UrlLine
      url={resolveFileUrl(block.file, block.id, context) ?? ""}
      label={block.file.name || plainText(block.file.caption)}
      context={context}
    />
  );
}

export function Pdf({ block, context }: BlockProps<"pdf">) {
  return (
    <UrlLine
      url={resolveFileUrl(block.pdf, block.id, context) ?? ""}
      label={plainText(block.pdf.caption)}
      context={context}
    />
  );
}

/**
 * A bookmark as a card with the page's title, description and image, as in
 * Notion: the image sits on the right, or on top when the card is narrow (a
 * phone, a column). Without a preview from `fetchBlocks`, a plain link.
 */
export function Bookmark({ block, context }: BlockProps<"bookmark">) {
  const { url, caption } = block.bookmark;
  const preview = block.bookmarkPreview;
  const link = resolveLink(url, context);
  if (!preview || !link) return <UrlLine url={url} label={plainText(caption)} context={context} />;
  return (
    <figure className="@container">
      <a
        href={link.href}
        {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="flex flex-col-reverse overflow-hidden rounded-lg border border-border transition-[background-color] @md:min-h-26 @md:flex-row hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1 p-3.5">
          <span className="truncate text-sm font-medium">{preview.title}</span>
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
                className="size-4 shrink-0 rounded-sm"
              />
            ) : null}
            <span className="truncate">{url}</span>
          </span>
        </span>
        {preview.image ? (
          <img
            src={preview.image}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="aspect-[1.91/1] w-full border-b border-border object-cover @md:aspect-auto @md:w-1/3 @md:max-w-60 @md:shrink-0 @md:border-b-0 @md:border-l"
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
      <div className="flex min-h-48 flex-col items-center justify-center gap-6 overflow-hidden rounded-xl border border-border px-6 py-10">
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
 * An embed, as a link. An embed of `…/demos/<name>` whose name is one of
 * `demos` renders that demo component instead, in the `demo` frame.
 */
export function Embed({ block, context }: BlockProps<"embed">) {
  const demo = matchDemo(block.embed.url, context.demos);
  if (demo) {
    const Frame = context.components.demo ?? DemoFrame;
    return (
      <Frame name={demo.name} caption={block.embed.caption} context={context}>
        <demo.Component name={demo.name} params={demo.params} />
      </Frame>
    );
  }
  return <UrlLine url={block.embed.url} label={plainText(block.embed.caption)} context={context} />;
}

export function LinkPreview({ block, context }: BlockProps<"link_preview">) {
  return <UrlLine url={block.link_preview.url} label="" context={context} />;
}

export function ChildPage({ block, context }: BlockProps<"child_page">) {
  const link = resolvePageLink(block.id, context);
  const title = block.child_page.title || "Untitled";
  return <p>{link ? <NotionLink link={link}>{title}</NotionLink> : title}</p>;
}

/** A link to another page, titled by `fetchBlocks`. Without a title, nothing renders. */
export function LinkToPage({ block, context }: BlockProps<"link_to_page">) {
  const page = block.linkedPage;
  if (!page) return null;
  const link = resolvePageLink(page.id, context);
  const label = (
    <>
      {page.icon?.type === "emoji" ? (
        <span aria-hidden="true" className="mr-1.5">
          {page.icon.emoji}
        </span>
      ) : null}
      {page.title || "Untitled"}
    </>
  );
  return <p>{link ? <NotionLink link={link}>{label}</NotionLink> : label}</p>;
}
