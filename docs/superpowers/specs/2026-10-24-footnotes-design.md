# Footnotes

Notion has no footnote block. notionic adds footnotes through a convention that needs no extra API requests: links to blocks in a "Footnotes" section become numbered references, and that section becomes the footnote list.

## Goals

- Writers add footnotes in Notion with features Notion already has, and the convention still reads well inside Notion.
- notionic renders numbered superscript references and a footnote list, linked both ways, with no client JavaScript.
- No extra requests: everything comes from the blocks `fetchBlocks` already returns.

## Non-goals

- Footnotes made of several blocks. A footnote is one block; nested blocks under it are a later improvement.
- Comments as footnotes. The API can't say which words a comment is on, needs one request per block, and would publish review comments.
- Footnotes across pages. References and notes are on the same page.

## Writing footnotes in Notion

1. At the end of the page, add a heading, of any level, whose text is one of the footnote headings (default "Footnotes").
2. Under it, write each note as its own block: a paragraph, bulleted item or numbered item.
3. In the text, select the word and link it to the note's block (⋯ on the note → Copy link to block, then paste it as the link).

The footnotes section is the blocks after that heading, up to the next heading of the same or a higher level (a smaller or equal heading number), or the end of the page. Only top-level blocks count: the heading must be a top-level block of the page, not inside a toggle or column.

## Option

```tsx
<NotionRenderer
  blocks={blocks}
  footnotes={{
    headings: ["Footnotes", "Referências", "Références"],
    showTitle: true,
    title: "Notes",
  }}
/>
```

```ts
type FootnotesOptions = {
  /** Heading texts that start the footnotes section. Default ["Footnotes"]. [] turns footnotes off. */
  headings?: string[];
  /** Show a title above the footnote list instead of a separator. Default false. */
  showTitle?: boolean;
  /** The title, instead of the Notion heading's text. */
  title?: string;
};
```

- Heading texts match ignoring case and surrounding whitespace. Accents count: "Referências" doesn't match "Referencias".
- If several headings match, the first one in reading order starts the section.
- The Notion heading itself never renders. It's a marker.
- `title` also names the section for screen readers when `showTitle` is false.

## Rendering

### References in the text

A link whose target is a block in the footnotes section renders as the linked text, unchanged and not a link, followed by a superscript:

```html
nested<sup><a href="#fn-1" id="fnref-1" aria-describedby="footnotes-label">1</a></sup>
```

- Footnotes are numbered by their first reference in reading order (blocks in document order, including nested blocks such as toggles and columns, and rich text left to right).
- A note referenced again keeps its number; each further reference gets its own id: `fnref-1-2`, `fnref-1-3`.
- Style: muted, tabular numbers, a pseudo-element extending the hit area, a visible focus ring, and `scroll-margin-top` so returning to it doesn't land under a sticky header. `:target` gives it a subtle muted background.
- Links to any other block (outside the section, or on another page) keep today's behavior.

### The footnote list

The section's blocks render as one list, in place of the section:

```html
<section data-footnotes aria-labelledby="footnotes-label">
  <hr />                                              <!-- showTitle: false -->
  <h2 id="footnotes-label" class="sr-only">Footnotes</h2>
  <ol>
    <li id="fn-1">The note's rich text <a href="#fnref-1" aria-label="Back to reference 1">↩</a></li>
  </ol>
</section>
```

- The heading text is `title`, or the Notion heading's text. With `showTitle: false` it's visually hidden and a separator sits above the list, styled like the divider block (`border-border`, the same as shadcn's `Separator`). With `showTitle: true` it's visible, at the Notion heading's level, styled like other headings, with no separator.
- Items are ordered by footnote number. Notes with no reference come after, unnumbered by the list's counter (a `<ul>` after the `<ol>`), with no back-link, so no content disappears.
- A note referenced more than once gets one back-link per reference, labelled "↩ a b c" (each with an `aria-label` "Back to reference 1a"…).
- Each item is the note block's rich text. A note that isn't a paragraph, bulleted or numbered item (an image, a code block…) renders as that block inside the item.
- Type: a step smaller than body text and muted, the same line height; `scroll-margin-top` and a `:target` background as for references.
- The list renders through a new overridable component, `components.footnotes`, receiving the numbered notes, the unreferenced notes, the title, `showTitle` and the heading level.

### Ids

`fn-<n>`, `fnref-<n>`, `fnref-<n>-<k>` and `footnotes-label`. Like heading anchors, they assume one `NotionRenderer` per page.

## Architecture

- **`collectFootnotes(blocks, options)`** in a new `footnotes.ts`: finds the section, maps note block ids to their position, walks the rich text in reading order to number the references, and returns `{ sectionBlockIds, notes, refs }`. It's pure and tested on its own, like `collectHeadings`.
- **Block-link matching**: a helper in `links.ts` returns the block id a rich-text link points to on the same page. The exact URL Notion stores for "Copy link to block" is to be confirmed against a real page (expected `/<pageId>#<blockId>` or a notion.so URL with `#<blockId>`) before implementing, with a fixture added to the tests.
- **Render context** gets the footnote map. `RichText` renders a matching link as a reference. `NotionRenderer` skips the section's blocks and the marker heading, and renders `components.footnotes` where the section was.
- **Table of contents**: the marker heading is left out of the built-in table of contents when `showTitle` is false. `collectHeadings(blocks, { footnotes })` accepts the same option for custom outlines.
- **Markdown**: `blocksToMarkdown` takes the same `footnotes` option and writes GFM footnotes: `nested[^1]` in the text and `[^1]: The note` at the end, replacing the section.

## Edge cases

| Case | Result |
| --- | --- |
| No footnotes heading | Nothing changes. |
| `headings: []` | Footnotes are off. |
| Heading with no blocks under it | Nothing renders for the section. |
| Note with no reference | Listed after the numbered notes, without a back-link. |
| Link to a block outside the section | An ordinary link, as today. |
| Note referenced twice | One number, two back-links. |
| Empty note block | Skipped. |
| Reference inside a footnote | Rendered as plain text, not a nested reference. |

## Testing

- `collectFootnotes`: numbering by first reference, repeated references, unreferenced notes, references in nested blocks, section boundaries, no heading, custom and case-insensitive headings, the first match winning.
- Rendering: the superscript markup and ids, the list order and back-links, `showTitle` false and true, `title`, the hidden marker heading, the table of contents, and `components.footnotes`.
- Markdown: GFM footnote output.
- A browser check at 320px and desktop: the jump to a note and back, `:target`, focus rings, and both title modes.

## Docs

README and the Notion docs: a "Footnotes" guide covering the Notion steps, the option, and a supported-blocks row.
