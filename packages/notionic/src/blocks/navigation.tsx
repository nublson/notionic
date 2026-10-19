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
      <ul className="flex flex-col">
        {headings.map((heading) => (
          <li key={heading.blockId} className={INDENT[heading.level - top]}>
            <a
              href={`#${heading.id}`}
              // A block with padding: each row is a 28px tap target, with no gaps between.
              // The underline is always drawn, transparent until hover, so it can fade in.
              className="block rounded-sm py-1 text-muted-foreground underline decoration-transparent underline-offset-4 transition-[color,text-decoration-color] duration-150 hover:text-foreground hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// "Show panel n while radio n is checked", one rule per tab. Tailwind only
// generates classes it finds written out, so the list is literal: tabs past
// the 20th have no panel rule.
const SHOW_PANEL = [
  "[&:has([data-tab='0']:checked)_[data-panel='0']]:flex",
  "[&:has([data-tab='1']:checked)_[data-panel='1']]:flex",
  "[&:has([data-tab='2']:checked)_[data-panel='2']]:flex",
  "[&:has([data-tab='3']:checked)_[data-panel='3']]:flex",
  "[&:has([data-tab='4']:checked)_[data-panel='4']]:flex",
  "[&:has([data-tab='5']:checked)_[data-panel='5']]:flex",
  "[&:has([data-tab='6']:checked)_[data-panel='6']]:flex",
  "[&:has([data-tab='7']:checked)_[data-panel='7']]:flex",
  "[&:has([data-tab='8']:checked)_[data-panel='8']]:flex",
  "[&:has([data-tab='9']:checked)_[data-panel='9']]:flex",
  "[&:has([data-tab='10']:checked)_[data-panel='10']]:flex",
  "[&:has([data-tab='11']:checked)_[data-panel='11']]:flex",
  "[&:has([data-tab='12']:checked)_[data-panel='12']]:flex",
  "[&:has([data-tab='13']:checked)_[data-panel='13']]:flex",
  "[&:has([data-tab='14']:checked)_[data-panel='14']]:flex",
  "[&:has([data-tab='15']:checked)_[data-panel='15']]:flex",
  "[&:has([data-tab='16']:checked)_[data-panel='16']]:flex",
  "[&:has([data-tab='17']:checked)_[data-panel='17']]:flex",
  "[&:has([data-tab='18']:checked)_[data-panel='18']]:flex",
  "[&:has([data-tab='19']:checked)_[data-panel='19']]:flex",
];

/**
 * Notion tabs, with no JavaScript: each tab is a radio button drawn as a pill,
 * in a row that scrolls sideways when the tabs don't fit, and CSS shows the
 * panel of the checked one. The first tab starts selected. Radios give
 * keyboard support for free (arrow keys switch tabs), and screen readers
 * announce "pnpm, radio button, 2 of 3". Each tab is a paragraph (its title
 * and icon) whose children are the tab's content.
 */
export function Tab({ block, context }: BlockProps<"tab">) {
  const tabs = (block.children ?? [])
    .filter((child) => child.type === "paragraph")
    .slice(0, SHOW_PANEL.length);
  if (tabs.length === 0) return null;
  const name = `notionic-tabs-${block.id}`;
  return (
    <div
      className={cx(
        "group/tabs rounded-xl border border-border p-2",
        ...SHOW_PANEL.slice(0, tabs.length),
      )}
    >
      <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab, index) => {
          if (tab.type !== "paragraph") return null;
          const { rich_text, icon } = tab.paragraph;
          const id = `${name}-${index}`;
          return (
            // The radio covers its pill, invisible and click-through, so
            // focusing it with the arrow keys scrolls the whole pill into view.
            <span key={tab.id} className="relative flex shrink-0">
              <input
                type="radio"
                name={name}
                id={id}
                data-tab={index}
                defaultChecked={index === 0}
                className="pointer-events-none absolute inset-0 appearance-none opacity-0"
              />
              {/* Styled from its own radio, right before it. */}
              <label
                htmlFor={id}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 font-medium whitespace-nowrap text-muted-foreground transition-[color,background-color] duration-150 hover:text-foreground motion-reduce:transition-none [:checked+&]:bg-muted [:checked+&]:text-foreground [:focus-visible+&]:outline-2 [:focus-visible+&]:-outline-offset-2 [:focus-visible+&]:outline-ring"
              >
                {icon?.type === "emoji" ? <span aria-hidden="true">{icon.emoji}</span> : null}
                <RichText text={rich_text} context={context} />
              </label>
            </span>
          );
        })}
      </div>
      {tabs.map((tab, index) => (
        // Fades in when shown (@starting-style), so switching tabs doesn't snap;
        // only with focus inside the tabs, so the first panel doesn't fade in on load.
        <div
          key={tab.id}
          data-panel={index}
          className="hidden flex-col gap-4 px-3 pt-3 pb-2 transition-opacity duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] group-focus-within/tabs:starting:opacity-0"
        >
          <BlockList blocks={tab.children} context={context} />
        </div>
      ))}
    </div>
  );
}
