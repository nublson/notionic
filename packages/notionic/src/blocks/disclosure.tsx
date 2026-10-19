/**
 * The chevron of a disclosure (toggle, toggleable heading): one line tall, so
 * it lines up with the first line of text, and rotated while open. Put it in a
 * `<summary>` inside a `<details className="group/toggle">`.
 */
export function DisclosureChevron() {
  return (
    <span aria-hidden="true" className="flex h-[1lh] shrink-0 items-center text-muted-foreground">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4 transition-transform duration-150 ease-out group-open/toggle:rotate-90 motion-reduce:transition-none"
      >
        <path d="m9 18 6-6-6-6" />
      </svg>
    </span>
  );
}

/** Summary classes: a row with the chevron, and no native marker. */
export const SUMMARY_CLASSES =
  "flex cursor-pointer list-none gap-1.5 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden";

/**
 * `<details>` classes: the content grows from zero height and fades in, and
 * shrinks back when closed. Browsers without `::details-content` or
 * `interpolate-size` open instantly; reduced motion keeps only the fade.
 */
export const DISCLOSURE_CLASSES =
  "[interpolate-size:allow-keywords] details-content:h-0 details-content:overflow-x-visible details-content:overflow-y-clip details-content:opacity-0 details-content:transition-[height,opacity,content-visibility] details-content:transition-discrete details-content:duration-200 details-content:ease-[cubic-bezier(0.23,1,0.32,1)] open:details-content:h-auto open:details-content:opacity-100 motion-reduce:details-content:transition-[opacity,content-visibility]";

/** Indent for a disclosure's content: the chevron's width plus the gap, so it lines up with the summary's text. */
export const DISCLOSURE_CONTENT_INDENT = "ps-5.5";
