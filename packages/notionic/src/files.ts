import type { RenderContext } from "./types";

/** A file uploaded to Notion, whose signed URL expires after an hour. */
export type HostedFile = {
  /** The block the file belongs to: an image, video, file… or a block with an icon. */
  blockId: string;
  url: string;
};

type FileObject =
  | { type: "external"; external: { url: string } }
  | { type: "file"; file: { url: string } }
  | { type: string };

/**
 * The URL to render for a Notion file object (a media block's payload, or a
 * callout's icon). Files uploaded to Notion go through `transformFileUrl`;
 * external URLs are returned as they are. Null for other kinds.
 */
export function resolveFileUrl(
  file: FileObject | null | undefined,
  blockId: string,
  context: RenderContext,
): string | null {
  if (!file) return null;
  if ("external" in file) return file.external.url;
  if ("file" in file) {
    const { url } = file.file;
    return context.transformFileUrl ? context.transformFileUrl({ blockId, url }) : url;
  }
  return null;
}
