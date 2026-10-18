import { blockColorClass, colorClass, isBackgroundColor } from "../colors";
import { resolveFileUrl } from "../files";
import { CODE_CLASSES, RichText } from "../rich-text";
import type { BlockProps, InlineEquationProps } from "../types";
import { cx } from "../utils";

export function Paragraph({ block, context, children }: BlockProps<"paragraph">) {
  const { rich_text, color } = block.paragraph;
  const empty = rich_text.length === 0;
  if (empty && !children) return null;
  return (
    <>
      {empty ? null : (
        <p className={blockColorClass(color)}>
          <RichText text={rich_text} context={context} />
        </p>
      )}
      {children ? <div className="flex flex-col gap-4 ps-6">{children}</div> : null}
    </>
  );
}

export function Quote({ block, context, children }: BlockProps<"quote">) {
  const { rich_text, color } = block.quote;
  return (
    // Emphasis inside the italic quote turns roman, so it still stands out.
    // A background gets padding on its open sides; the bar stays at the start.
    <blockquote
      className={cx(
        "border-s-2 border-border ps-4 italic [&_em]:not-italic",
        colorClass(color),
        isBackgroundColor(color) && "rounded-e-md py-1 pe-3",
      )}
    >
      <RichText text={rich_text} context={context} />
      {children ? <div className="mt-4 flex flex-col gap-4">{children}</div> : null}
    </blockquote>
  );
}

export function Callout({ block, context, children }: BlockProps<"callout">) {
  const { icon, rich_text, color } = block.callout;
  const iconUrl =
    icon?.type === "emoji"
      ? null
      : icon?.type === "custom_emoji"
        ? icon.custom_emoji.url
        : resolveFileUrl(icon, block.id, context);
  return (
    <div
      className={cx(
        "flex gap-3 rounded-lg p-4",
        // A background color replaces the default surface and hides its border; a
        // text color keeps them, as in Notion.
        isBackgroundColor(color)
          ? cx("border border-transparent", colorClass(color))
          : cx("border border-border bg-muted/50", colorClass(color)),
      )}
    >
      {icon?.type === "emoji" || iconUrl ? (
        // A fixed slot, one line tall: icons center on the first line, and the
        // text starts at the same place whatever the icon.
        <span aria-hidden="true" className="flex h-[1lh] w-5 shrink-0 items-center justify-center">
          {icon?.type === "emoji" ? (
            icon.emoji
          ) : (
            <img src={iconUrl ?? ""} alt="" className="size-5 rounded-sm object-contain" />
          )}
        </span>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        {rich_text.length > 0 ? (
          <p>
            <RichText text={rich_text} context={context} />
          </p>
        ) : null}
        {children}
      </div>
    </div>
  );
}

// A section break: twice the space of the gap between blocks on each side.
export function Divider(_: BlockProps<"divider">) {
  return <hr className="my-4 border-border" />;
}

/** An equation's LaTeX source. For formatted math, use `notion-equation` from the shadcn registry. */
export function Equation({ block }: BlockProps<"equation">) {
  // The same surface and type as code blocks. The source wraps rather than
  // scrolls, and the label tells screen readers what they're hearing.
  return (
    <figure
      aria-label="Equation, LaTeX source"
      className="rounded-lg border border-border bg-muted px-4 py-3 font-mono text-[0.8125rem] leading-relaxed"
    >
      <code>{block.equation.expression}</code>
    </figure>
  );
}

/** An equation inside text, as its LaTeX source. */
export function InlineEquation({ expression }: InlineEquationProps) {
  return <code className={CODE_CLASSES}>{expression}</code>;
}
