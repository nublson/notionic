import type { ReactNode } from "react";
import { blockColorClass } from "../colors";
import { RichText } from "../rich-text";
import type { BlockProps } from "../types";
import { cx } from "../utils";

function Nested({ children }: { children?: ReactNode }) {
  return children ? <div className="mt-2 flex flex-col gap-2">{children}</div> : null;
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
        <input
          type="checkbox"
          checked={checked}
          disabled
          readOnly
          className="mt-1.5 size-4 shrink-0 accent-primary"
        />
        <span className={cx(checked && "text-muted-foreground line-through")}>{text}</span>
      </label>
      <Nested>{children}</Nested>
    </li>
  );
}
