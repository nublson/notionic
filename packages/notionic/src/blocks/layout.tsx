import { blockColorClass } from "../colors";
import { RichText } from "../rich-text";
import {
  DISCLOSURE_CLASSES,
  DISCLOSURE_CONTENT_INDENT,
  DisclosureChevron,
  SUMMARY_CLASSES,
} from "./disclosure";
import type { BlockProps } from "../types";
import { cx } from "../utils";

export function Toggle({ block, context, children }: BlockProps<"toggle">) {
  const { rich_text, color } = block.toggle;
  return (
    <details className={cx("group/toggle", DISCLOSURE_CLASSES, blockColorClass(color))}>
      <summary className={SUMMARY_CLASSES}>
        <DisclosureChevron />
        {/* Its own box, so a wrapped summary keeps the text edge. */}
        <span className="min-w-0">
          <RichText text={rich_text} context={context} />
        </span>
      </summary>
      {children ? (
        <div className={cx("mt-2 flex flex-col gap-4", DISCLOSURE_CONTENT_INDENT)}>{children}</div>
      ) : null}
    </details>
  );
}

/**
 * Columns sit side by side once the space they're in is 36rem wide, whatever
 * the screen: a renderer in a sidebar or card stacks them. The container is a
 * wrapper inside the block flow, where its width is always defined; on the
 * renderer's root, size containment would collapse it inside a flex row.
 */
export function ColumnList({ children }: BlockProps<"column_list">) {
  return (
    <div className="@container">
      <div className="flex flex-col gap-4 @xl:flex-row @xl:gap-6">{children}</div>
    </div>
  );
}

export function Column({ block, children }: BlockProps<"column">) {
  const ratio = block.column.width_ratio;
  return (
    <div
      className={cx("flex min-w-0 flex-col gap-4", !ratio && "@xl:flex-1")}
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
