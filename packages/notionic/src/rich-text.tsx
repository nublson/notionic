import type { ReactNode } from "react";
import type { RichTextItemResponse } from "@notionhq/client";
import { colorClass, isBackgroundColor } from "./colors";
import { resolveLink } from "./links";
import type { RenderContext, ResolvedLink, RichText as RichTextArray } from "./types";
import { cx } from "./utils";

export const CODE_CLASSES =
  "rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[0.875em] box-decoration-clone";

const LINK_CLASSES =
  "font-medium underline underline-offset-4 decoration-from-font decoration-muted-foreground/50 transition-[text-decoration-color] hover:decoration-foreground rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** An anchor with notionic's link styling; external links open in a new tab. */
export function NotionLink({
  link,
  className,
  children,
}: {
  link: ResolvedLink;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={link.href}
      {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={cx(LINK_CLASSES, className)}
    >
      {children}
      {link.external ? <span className="sr-only"> (opens in a new tab)</span> : null}
    </a>
  );
}

function RichTextItem({ item, context }: { item: RichTextItemResponse; context: RenderContext }) {
  const { annotations } = item;
  // Notion writes line breaks within a block (Shift+Enter) as "\n".
  let node: ReactNode = item.plain_text.includes("\n")
    ? // biome-ignore lint/suspicious/noArrayIndexKey: line breaks have no identity beyond their position
      item.plain_text.split("\n").flatMap((line, i) => (i === 0 ? [line] : [<br key={i} />, line]))
    : item.plain_text;

  // Shown as Notion writes it; `dateTime` gives the machine-readable start.
  if (item.type === "mention" && item.mention.type === "date") {
    node = <time dateTime={item.mention.date.start}>{node}</time>;
  }

  if (item.type === "equation") {
    const InlineEquation = context.components.inline_equation;
    if (InlineEquation) {
      node = <InlineEquation expression={item.equation.expression} context={context} />;
    }
  } else if (annotations.code) {
    node = <code className={CODE_CLASSES}>{node}</code>;
  }
  if (annotations.bold) node = <strong className="font-semibold">{node}</strong>;
  if (annotations.italic) node = <em>{node}</em>;
  if (annotations.strikethrough) node = <s>{node}</s>;
  if (annotations.underline)
    node = <u className="underline-offset-4 decoration-from-font">{node}</u>;

  const color = colorClass(annotations.color);
  if (color) {
    node = isBackgroundColor(annotations.color) ? (
      <mark className={cx("rounded-sm px-0.5 text-inherit box-decoration-clone", color)}>
        {node}
      </mark>
    ) : (
      <span className={color}>{node}</span>
    );
  }

  const link = resolveLink(item.href, context);
  if (link) node = <NotionLink link={link}>{node}</NotionLink>;

  return node;
}

/** A Notion rich text array: annotations, colors, links and mentions. */
export function RichText({ text, context }: { text: RichTextArray; context: RenderContext }) {
  // biome-ignore lint/suspicious/noArrayIndexKey: rich text items have no ID; Notion returns them in order
  return text.map((item, i) => <RichTextItem key={i} item={item} context={context} />);
}
