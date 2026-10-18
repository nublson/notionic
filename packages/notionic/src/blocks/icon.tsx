import type { ReactNode } from "react";
import { resolveFileUrl } from "../files";
import type { PageIcon, RenderContext } from "../types";
import { cx } from "../utils";

// Covers the browser's broken-image icon with a muted surface. Browsers draw
// an image's ::before only when it fails to load.
export const BROKEN_IMAGE =
  "relative before:absolute before:inset-0 before:rounded-[inherit] before:bg-muted before:content-['']";

/**
 * A Notion icon (an emoji, a custom emoji or an image) in a fixed slot one
 * line tall, so it centers on the first line of the text beside it and the
 * text starts at the same place whatever the icon. Without an icon, the
 * fallback, or nothing.
 */
export function IconSlot({
  icon,
  blockId,
  context,
  fallback,
}: {
  icon: PageIcon | undefined;
  blockId: string;
  context: RenderContext;
  fallback?: ReactNode;
}) {
  const url =
    icon?.type === "custom_emoji"
      ? icon.custom_emoji.url
      : icon?.type === "emoji"
        ? null
        : resolveFileUrl(icon, blockId, context);
  const content =
    icon?.type === "emoji" ? (
      icon.emoji
    ) : url ? (
      <img src={url} alt="" className={cx("size-5 rounded-sm object-contain", BROKEN_IMAGE)} />
    ) : (
      fallback
    );
  if (!content) return null;
  return (
    <span aria-hidden="true" className="flex h-[1lh] w-5 shrink-0 items-center justify-center">
      {content}
    </span>
  );
}
