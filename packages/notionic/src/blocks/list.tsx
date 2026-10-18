import type { ReactNode } from "react";
import { blockColorClass } from "../colors";
import { RichText } from "../rich-text";
import type { BlockProps } from "../types";
import { cx } from "../utils";

function Nested({ children, className }: { children?: ReactNode; className?: string }) {
  return children ? (
    <div className={cx("mt-2 flex flex-col gap-2", className)}>{children}</div>
  ) : null;
}

export function BulletedListItem({ block, context, children }: BlockProps<"bulleted_list_item">) {
  const { rich_text, color } = block.bulleted_list_item;
  return (
    <li className={blockColorClass(color)}>
      <RichText text={rich_text} context={context} />
      <Nested>{children}</Nested>
    </li>
  );
}

export function NumberedListItem({ block, context, children }: BlockProps<"numbered_list_item">) {
  const { rich_text, color } = block.numbered_list_item;
  return (
    <li className={blockColorClass(color)}>
      <RichText text={rich_text} context={context} />
      <Nested>{children}</Nested>
    </li>
  );
}

export function ToDo({ block, context, children }: BlockProps<"to_do">) {
  const { rich_text, checked, color } = block.to_do;
  const text = <RichText text={rich_text} context={context} />;
  return (
    <li className={blockColorClass(color)}>
      <label className="flex items-start gap-2">
        {/* A real, read-only checkbox, drawn like shadcn's Checkbox rather than
            dimmed like a disabled control; one line tall, so it centers on the
            first line of text. */}
        <span className="relative flex h-[1lh] shrink-0 items-center">
          <input
            type="checkbox"
            checked={checked}
            disabled
            readOnly
            className="peer size-4 appearance-none rounded-[4px] border border-muted-foreground/80 bg-background checked:border-primary checked:bg-primary"
          />
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none absolute inset-x-0.5 size-3 text-primary-foreground opacity-0 peer-checked:opacity-100"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <span className={cx(checked && "text-muted-foreground line-through")}>{text}</span>
      </label>
      {/* Nested to-dos line up with this one's text, past the checkbox. */}
      <Nested className="ps-6">{children}</Nested>
    </li>
  );
}
