import { Block, BlockList } from "../renderer";
import { RichText } from "../rich-text";
import type { Footnote, FootnotesProps, RenderContext, RichText as RichTextArray } from "../types";
import { cx } from "../utils";
import { HEADING_LEVELS } from "./heading";

const TEXT_TYPES = new Set(["paragraph", "bulleted_list_item", "numbered_list_item"]);

// A short lift on the note or reference the reader jumped to, so the eye
// finds it; CSS only.
export const FOOTNOTE_TARGET = "-mx-1 scroll-mt-8 rounded-sm px-1 target:bg-muted";

const BACK_LINK =
  "relative ms-1 rounded-sm text-muted-foreground no-underline hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring after:absolute after:-inset-1 after:content-['']";

function NoteContent({ note, context }: { note: Footnote; context: RenderContext }) {
  const { block } = note;
  if (TEXT_TYPES.has(block.type)) {
    const data = (block as unknown as Record<string, { rich_text: RichTextArray }>)[block.type];
    return (
      <>
        <RichText text={data?.rich_text ?? []} context={context} />
        {block.children?.length ? (
          <div className="mt-1.5 flex flex-col gap-1.5">
            <BlockList blocks={block.children} context={context} />
          </div>
        ) : null}
      </>
    );
  }
  return <Block block={block} context={context} />;
}

/** Links back to each reference: "↩" for one, "↩ a b" for several. */
function BackLinks({ note }: { note: Footnote }) {
  const [first, ...more] = note.refIds;
  if (!first) return null;
  if (!more.length) {
    return (
      <a href={`#${first}`} aria-label={`Back to reference ${note.number}`} className={BACK_LINK}>
        ↩
      </a>
    );
  }
  return (
    <span className="ms-1">
      <span aria-hidden="true">↩</span>
      {note.refIds.map((id, i) => {
        const letter = String.fromCharCode(97 + i);
        return (
          <a
            key={id}
            href={`#${id}`}
            aria-label={`Back to reference ${note.number}${letter}`}
            className={BACK_LINK}
          >
            {letter}
          </a>
        );
      })}
    </span>
  );
}

/**
 * The footnote list, in place of the footnotes section: a separator (or the
 * title, with `showTitle`), the numbered notes, then any note nothing
 * references.
 */
export function Footnotes({ notes, title, showTitle, level, context }: FootnotesProps) {
  if (!notes.length) return null;
  const { Tag, className } = HEADING_LEVELS[`heading_${level}`];
  const numbered = notes.filter((note) => note.number !== null);
  const unreferenced = notes.filter((note) => note.number === null);
  return (
    <section
      data-footnotes=""
      aria-labelledby="footnotes-label"
      className="flex flex-col gap-3 text-sm text-muted-foreground"
    >
      {showTitle ? null : <hr className="my-4 border-border" />}
      <Tag
        id="footnotes-label"
        className={showTitle ? cx(className, "scroll-mt-8 text-foreground") : "sr-only"}
      >
        {title}
      </Tag>
      {numbered.length ? (
        <ol className="flex list-decimal flex-col gap-1.5 ps-6 marker:tabular-nums">
          {numbered.map((note) => (
            <li key={note.block.id} id={`fn-${note.number}`} className={FOOTNOTE_TARGET}>
              <NoteContent note={note} context={context} />
              <BackLinks note={note} />
            </li>
          ))}
        </ol>
      ) : null}
      {unreferenced.length ? (
        <ul className="flex flex-col gap-1.5">
          {unreferenced.map((note) => (
            <li key={note.block.id}>
              <NoteContent note={note} context={context} />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
