import { resolveLink, resolvePageLink } from "../links";
import { NotionLink, RichText } from "../rich-text";
import type { BlockProps, RenderContext, RichText as RichTextArray } from "../types";
import { plainText } from "../utils";

type FilePayload =
  | { type: "external"; external: { url: string } }
  | { type: "file"; file: { url: string } };

/** The URL of a Notion file payload, uploaded or external. Uploaded files' URLs expire after an hour. */
function fileUrl(payload: FilePayload): string {
  return payload.type === "external" ? payload.external.url : payload.file.url;
}

function isHttpUrl(url: string): boolean {
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
function UrlLine({
  url,
  label,
  context,
}: {
  url: string;
  label: string;
  context: RenderContext;
}) {
  const link = resolveLink(url, context);
  if (!link) return null;
  return (
    <p className="break-words">
      <NotionLink link={link}>{label || url}</NotionLink>
    </p>
  );
}

export function Image({ block, context }: BlockProps<"image">) {
  const src = fileUrl(block.image);
  if (!isHttpUrl(src)) return null;
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
  return id && /^[\w-]{6,}$/.test(id)
    ? `https://www.youtube-nocookie.com/embed/${id}`
    : null;
}

export function Video({ block, context }: BlockProps<"video">) {
  const src = fileUrl(block.video);
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
  if (block.video.type === "file" && isHttpUrl(src)) {
    return (
      <figure>
        <video src={src} controls preload="metadata" className="w-full rounded-lg" />
        <Caption caption={caption} context={context} />
      </figure>
    );
  }
  return <UrlLine url={src} label={label} context={context} />;
}

export function Audio({ block, context }: BlockProps<"audio">) {
  const src = fileUrl(block.audio);
  if (!isHttpUrl(src)) return null;
  return (
    <figure>
      <audio src={src} controls preload="metadata" className="w-full" />
      <Caption caption={block.audio.caption} context={context} />
    </figure>
  );
}

export function File({ block, context }: BlockProps<"file">) {
  return (
    <UrlLine
      url={fileUrl(block.file)}
      label={block.file.name || plainText(block.file.caption)}
      context={context}
    />
  );
}

export function Pdf({ block, context }: BlockProps<"pdf">) {
  return <UrlLine url={fileUrl(block.pdf)} label={plainText(block.pdf.caption)} context={context} />;
}

export function Bookmark({ block, context }: BlockProps<"bookmark">) {
  return (
    <UrlLine url={block.bookmark.url} label={plainText(block.bookmark.caption)} context={context} />
  );
}

export function Embed({ block, context }: BlockProps<"embed">) {
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
