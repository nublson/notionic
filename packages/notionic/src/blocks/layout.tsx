import { blockColorClass } from "../colors";
import { RichText } from "../rich-text";
import type { BlockProps } from "../types";
import { cx } from "../utils";

export function Toggle({ block, context, children }: BlockProps<"toggle">) {
  const { rich_text, color } = block.toggle;
  return (
    <details className={blockColorClass(color)}>
      <summary className="cursor-pointer">
        <RichText text={rich_text} context={context} />
      </summary>
      {children ? <div className="mt-2 flex flex-col gap-4 ps-5">{children}</div> : null}
    </details>
  );
}

export function ColumnList({ children }: BlockProps<"column_list">) {
  return <div className="flex flex-col gap-4 md:flex-row md:gap-6">{children}</div>;
}

export function Column({ block, children }: BlockProps<"column">) {
  const ratio = block.column.width_ratio;
  return (
    <div
      className={cx("flex min-w-0 flex-col gap-4", !ratio && "md:flex-1")}
      style={ratio ? { flex: `${ratio} 1 0%` } : undefined}
    >
      {children}
    </div>
  );
}

/** Synced blocks: their content flows into the page. */
export function SyncedBlock({ children }: BlockProps<"synced_block">) {
  return children ?? null;
}
