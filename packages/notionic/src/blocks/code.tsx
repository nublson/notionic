import { RichText } from "../rich-text";
import type { BlockProps } from "../types";
import { plainText } from "../utils";

/**
 * Plain code, no highlighting. For syntax highlighting and a copy button,
 * install the shadcn version: `npx shadcn add @notionic/notion-code`.
 */
export function Code({ block, context }: BlockProps<"code">) {
  const { language, rich_text, caption } = block.code;
  const code = plainText(rich_text);
  return (
    <figure className="overflow-hidden rounded-lg border border-border bg-muted">
      <div className="border-b border-border px-4 py-2 text-xs text-muted-foreground">
        {language}
      </div>
      {/* biome-ignore lint/a11y/useAriaPropsSupportedByRole: names the focusable scroll container for screen readers */}
      <pre
        // biome-ignore lint/a11y/noNoninteractiveTabindex: scrollable code must be keyboard-focusable to scroll (WCAG 2.1.1)
        tabIndex={0}
        aria-label={`Code, ${language}`}
        className="overflow-x-auto px-4 py-3 font-mono text-[0.8125rem] leading-relaxed focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <code>{code}</code>
      </pre>
      {caption.length > 0 ? (
        <figcaption className="border-t border-border px-4 py-2 text-sm text-muted-foreground">
          <RichText text={caption} context={context} />
        </figcaption>
      ) : null}
    </figure>
  );
}
