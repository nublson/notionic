import { blockColorClass } from "../colors";
import { BlockList } from "../renderer";
import { RichText } from "../rich-text";
import type { BlockProps } from "../types";
import { cx } from "../utils";

// Indent each heading by its level, relative to the page's top level.
const INDENT = ["", "ps-4", "ps-8", "ps-12"];

/** Links to every heading on the page, indented by level. */
export function TableOfContents({ block, context }: BlockProps<"table_of_contents">) {
  const { headings } = context;
  if (headings.length === 0) return null;
  const top = Math.min(...headings.map((heading) => heading.level));
  return (
    <nav
      aria-label="Table of contents"
      className={cx("text-sm", blockColorClass(block.table_of_contents.color))}
    >
      <ul className="flex flex-col gap-1">
        {headings.map((heading) => (
          <li key={heading.blockId} className={INDENT[heading.level - top]}>
            <a
              href={`#${heading.id}`}
              className="rounded-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Notion tabs, as an exclusive accordion: one `<details>` per tab sharing a
 * `name`, so opening one closes the others, with no JavaScript. The first tab
 * starts open. Each tab is a paragraph (its title and icon) whose children
 * are the tab's content.
 */
export function Tab({ block, context }: BlockProps<"tab">) {
  const tabs = (block.children ?? []).filter((child) => child.type === "paragraph");
  if (tabs.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {tabs.map((tab, index) => {
        if (tab.type !== "paragraph") return null;
        const { rich_text, icon } = tab.paragraph;
        return (
          <details
            key={tab.id}
            name={`notionic-tabs-${block.id}`}
            open={index === 0}
            className="rounded-lg border border-border"
          >
            <summary className="cursor-pointer px-4 py-2 font-medium">
              {icon?.type === "emoji" ? (
                <span aria-hidden="true" className="me-2">
                  {icon.emoji}
                </span>
              ) : null}
              <RichText text={rich_text} context={context} />
            </summary>
            {tab.children?.length ? (
              <div className="flex flex-col gap-4 border-t border-border px-4 py-3">
                <BlockList blocks={tab.children} context={context} />
              </div>
            ) : null}
          </details>
        );
      })}
    </div>
  );
}
