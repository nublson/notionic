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
  const iconUrl = icon?.type === "emoji" ? null : resolveFileUrl(icon, block.id, context);
  return (
    <div
      className={cx(
        "flex gap-3 rounded-lg border border-border p-4",
        colorClass(color) ?? "bg-muted/50",
      )}
    >
      {icon?.type === "emoji" ? (
        <span aria-hidden="true" className="shrink-0">
          {icon.emoji}
        </span>
      ) : iconUrl ? (
        <img src={iconUrl} alt="" className="mt-1 size-5 shrink-0" />
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

export function Divider(_: BlockProps<"divider">) {
  return <hr className="border-border" />;
}

/** An equation's LaTeX source. For formatted math, use `notion-equation` from the shadcn registry. */
export function Equation({ block }: BlockProps<"equation">) {
  return (
    <div className="overflow-x-auto rounded-md bg-muted px-4 py-3">
      <code className="font-mono text-sm">{block.equation.expression}</code>
    </div>
  );
}

/** An equation inside text, as its LaTeX source. */
export function InlineEquation({ expression }: InlineEquationProps) {
  return <code className={CODE_CLASSES}>{expression}</code>;
}
