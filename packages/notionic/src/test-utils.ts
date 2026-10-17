import type { ReactNode } from "react";
import { PassThrough } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";
import type { NotionBlock, RichText } from "./types";

let counter = 0;

/** A Notion block fixture of the given type. */
export function block(
  type: string,
  data: Record<string, unknown> = {},
  extra: { children?: NotionBlock[]; id?: string } = {},
): NotionBlock {
  counter += 1;
  return {
    object: "block",
    id: extra.id ?? `00000000-0000-0000-0000-${String(counter).padStart(12, "0")}`,
    type,
    has_children: Boolean(extra.children?.length),
    [type]: data,
    ...(extra.children ? { children: extra.children } : {}),
  } as unknown as NotionBlock;
}

/** One rich text item. */
export function richText(
  text: string,
  opts: {
    href?: string | null;
    annotations?: Partial<{
      bold: boolean;
      italic: boolean;
      strikethrough: boolean;
      underline: boolean;
      code: boolean;
      color: string;
    }>;
  } = {},
): RichText[number] {
  return {
    type: "text",
    text: { content: text, link: opts.href ? { url: opts.href } : null },
    annotations: {
      bold: false,
      italic: false,
      strikethrough: false,
      underline: false,
      code: false,
      color: "default",
      ...opts.annotations,
    },
    plain_text: text,
    href: opts.href ?? null,
  } as RichText[number];
}

/**
 * Renders a React node to an HTML string, as a server would. Uses an API that
 * React 18 and 19 both have, since the package supports both.
 */
export function renderToHtml(node: ReactNode): Promise<string> {
  return new Promise((resolve, reject) => {
    const { pipe } = renderToPipeableStream(node, {
      onAllReady() {
        const chunks: Buffer[] = [];
        const sink = new PassThrough();
        sink.on("data", (chunk: Buffer) => chunks.push(chunk));
        sink.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        pipe(sink);
      },
      onShellError: reject,
      onError: reject,
    });
  });
}
