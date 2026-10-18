import { blockColorClass } from "../colors";
import { RichText } from "../rich-text";
import { DISCLOSURE_CONTENT_INDENT, DisclosureChevron, SUMMARY_CLASSES } from "./disclosure";
import type { BlockProps } from "../types";
import { cx, plainText } from "../utils";

type HeadingType = "heading_1" | "heading_2" | "heading_3" | "heading_4";
type HeadingProps = { [T in HeadingType]: BlockProps<T> }[HeadingType];

// A page's title is its h1, so Notion's heading 1 renders as h2, and so on.
const LEVELS = {
  heading_1: { Tag: "h2", className: "mt-6 text-2xl leading-tight font-semibold tracking-tight" },
  heading_2: { Tag: "h3", className: "mt-4 text-xl leading-tight font-semibold tracking-tight" },
  heading_3: { Tag: "h4", className: "mt-4 text-lg leading-snug font-semibold tracking-tight" },
  heading_4: { Tag: "h5", className: "mt-4 text-base leading-snug font-semibold" },
} as const;

// Inline after the heading, so it follows the last word when the heading
// wraps. The pseudo-element widens its hit area past the narrow "#".
const ANCHOR =
  "relative ms-2 rounded-sm text-muted-foreground no-underline opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring pointer-coarse:opacity-100 after:absolute after:-inset-2 after:content-['']";

export function Heading({ block, context, children }: HeadingProps) {
  const data =
    block.type === "heading_1"
      ? block.heading_1
      : block.type === "heading_2"
        ? block.heading_2
        : block.type === "heading_3"
          ? block.heading_3
          : block.heading_4;
  const text = plainText(data.rich_text);
  // A blank heading would get an empty id and an unnamed anchor.
  const id = context.headings.find((heading) => heading.blockId === block.id)?.id;
  if (!id) return children ?? null;
  const { Tag, className } = LEVELS[block.type];
  const heading = (
    <Tag id={id} className="inline scroll-mt-8">
      <RichText text={data.rich_text} context={context} />
    </Tag>
  );

  if (data.is_toggleable) {
    return (
      <details className={cx("group/toggle text-balance", className)}>
        <summary className={cx(SUMMARY_CLASSES, blockColorClass(data.color))}>
          <DisclosureChevron />
          {heading}
        </summary>
        {children ? (
          <div
            className={cx(
              "mt-2 flex flex-col gap-4 text-base leading-[1.6] font-normal tracking-normal text-wrap",
              DISCLOSURE_CONTENT_INDENT,
            )}
          >
            {children}
          </div>
        ) : null}
      </details>
    );
  }

  // The anchor sits beside the heading, not inside it, so the heading's
  // accessible name is only its text.
  return (
    <>
      <div className={cx("group text-balance", className, blockColorClass(data.color))}>
        {heading}
        {/* biome-ignore lint/a11y/useAnchorContent: aria-label gives the link its accessible name */}
        <a href={`#${id}`} aria-label={`Link to section: ${text}`} className={ANCHOR}>
          <span aria-hidden="true">#</span>
        </a>
      </div>
      {children}
    </>
  );
}
