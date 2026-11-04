# Examples

notionic.dev gets an Examples section in its docs: pages that show each supported block rendered live by notionic, next to the code that customizes it. The examples are Notion pages in the docs database, like every other doc, so they're written and edited in Notion.

## Goals

- For every supported block, readers see what notionic renders from npm, and how to change it.
- The rendered example can't drift from the renderer: it's the real Notion block, rendered by the current package.
- Every recipe compiles against the current package.
- The code change to the site is small; the rest is content.

## Non-goals

- A separate `/examples` route, or examples defined in the repo.
- Showing every block both built-in and in its registry version.
- Hiding example headings from the page outline.
- Automated checks of recipes inside Notion (they're type-checked once, when written).

## Where

A new **Examples** option in the docs database's Section property. In the sidebar it comes between Guides and Reference: Getting started, Guides, Examples, Reference, Registry.

## Pages

About ten pages, grouped by family. Each has a Slug, a Description, an Order and Published checked.

| Page | Slug | Blocks |
| --- | --- | --- |
| Text | `examples-text` | Paragraph and rich text: bold, italic, strikethrough, underline, inline code, colors and backgrounds, links, inline math, page mentions, dates |
| Headings | `examples-headings` | Headings 1–4, toggleable headings, table of contents |
| Lists | `examples-lists` | Bulleted, numbered (numbers, letters, roman), to-dos, nesting |
| Callouts, quotes and toggles | `examples-callouts` | Callout, quote, toggle, divider |
| Code and math | `examples-code` | Code with a caption and a language, equations, Mermaid |
| Tables and layout | `examples-layout` | Table, columns, tabs, synced block |
| Media | `examples-media` | Image, video, audio, file, PDF |
| Links and embeds | `examples-links` | Bookmark, link preview, embed (card, demo, live iframe), child page, link to page |
| Footnotes and Resources | `examples-footnotes-resources` | Both conventions, each demonstrated once |

## Each example

Each block on a page has the same four parts, in this order:

1. **In Notion**: one line on how to create it, for example ``Type `/callout`.``
2. **The block**: the real Notion block, rendered live.
3. **Renders as**: one line naming the HTML element, linking to Supported blocks.
4. **Customize**: a short TSX recipe in a code block captioned `Customize · <file>`. It's usually a `components.<type>` override that wraps or restyles the built-in component. When a prop or option is what you'd change (for example `embeds`, `demos`, `linkFavicons`, `footnotes` or `resources`), the recipe uses that instead.

Recipes are type-checked against the current `notionic` package in a scratch file before they go into Notion.

## Rendering

On a doc whose Section is Examples, `app/docs/[slug]/page.tsx` renders with `examplesComponents` instead of `notionComponents`:

```ts
/** The built-in components, except recipes (code captioned "Customize…"), which keep the site's highlighting. */
export const examplesComponents: BlockComponents = { code: ExampleCode };
```

- `ExampleCode` renders a code block whose caption's plain text starts with `Customize` with the site's `NotionCode`, and any other code block with notionic's built-in `Code`.
- Every other block uses notionic's built-in component.
- Mermaid and highlighted code come from the registry. On the Code and math page, the built-in Mermaid example shows its source, and a recipe shows `withMermaid(NotionCode)`.

Every docs page also gets `embeds={["codepen.io"]}`, so the live-iframe example on Links and embeds loads in a frame. Demos keep using the existing `demos`.

`NOTION_DOCS_DRAFTS=1` lists unpublished docs in development, never in production, so the pages can be checked before they go live.

`SECTIONS` in `apps/web/lib/docs.ts` gets `"Examples"` between `"Guides"` and `"Reference"`.

## Edge cases

| Case | Result |
| --- | --- |
| Example headings on the Headings page | They show in the page outline and table of contents. |
| Footnotes and Resources page | One footnotes section and one resources section, each under its own heading. |
| A recipe's caption doesn't start with `Customize` | It renders as a built-in code block, without highlighting. |
| A doc in another section | Renders exactly as today, with `notionComponents`. |
| Uploaded media | Through the existing file route; external URLs where possible. |
| An Examples page with no published pages | The section doesn't show in the sidebar, as for any section. |

## Testing

- A unit test for `ExampleCode`: a code block captioned `Customize · x.tsx` renders the site's code component, and one with another caption, or none, renders the built-in one.
- A test that `SECTIONS` orders Examples between Guides and Reference, if `groupBySection` has tests; otherwise a check in the browser.
- Every recipe type-checked against the current package before it goes into Notion.
- A browser check of each Examples page at 320px and desktop width, in light and dark mode: no block renders nothing, recipes are highlighted, the live iframe loads.

## Content order

1. The site change (section, `examplesComponents`, `embeds`), behind no flag: with no published Examples pages, nothing changes on the site.
2. The pages in Notion, created unpublished, filled, type-checked and checked in the browser on a preview.
3. Publish them together.
