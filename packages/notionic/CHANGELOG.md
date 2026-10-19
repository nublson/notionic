# notionic

## 0.8.3

### Patch Changes

- [#42](https://github.com/nublson/notionic/pull/42) [`7d202c2`](https://github.com/nublson/notionic/commit/7d202c2bd121d6d6ca94cd0f951ee6ffb72f8cdd) Thanks [@nublson](https://github.com/nublson)! - Adds npm search keywords (`notion-api`, `notion-renderer`, `nextjs`) and a link to GitHub issues to the package metadata.

## 0.8.2

### Patch Changes

- [#39](https://github.com/nublson/notionic/pull/39) [`2d6256c`](https://github.com/nublson/notionic/commit/2d6256c46055aa99c61e7e786a7c3dd03542cad1) Thanks [@nublson](https://github.com/nublson)! - Inline code of up to 24 characters no longer breaks across lines, so short names like `notion-callout` stay whole instead of splitting at a hyphen in narrow columns. Longer code still wraps.

- [#39](https://github.com/nublson/notionic/pull/39) [`2d6256c`](https://github.com/nublson/notionic/commit/2d6256c46055aa99c61e7e786a7c3dd03542cad1) Thanks [@nublson](https://github.com/nublson)! - On touch screens, where heading anchors are always shown, the `#` is smaller and regular weight, so it reads apart from the heading instead of as part of it.

## 0.8.1

### Patch Changes

- [#38](https://github.com/nublson/notionic/pull/38) [`32e56af`](https://github.com/nublson/notionic/commit/32e56afcbfec9ae5c7c1906cfc0d5c80797d8354) Thanks [@nublson](https://github.com/nublson)! - File, PDF, bookmark, embed and link preview cards press in slightly (scale 0.99, 150ms) when clicked; reduced motion keeps only the hover fill. Page link titles fade their underline on hover (150ms) like other links.

- [#38](https://github.com/nublson/notionic/pull/38) [`32e56af`](https://github.com/nublson/notionic/commit/32e56afcbfec9ae5c7c1906cfc0d5c80797d8354) Thanks [@nublson](https://github.com/nublson)! - Heading anchors fade in on hover (150ms) instead of popping in, and toggleable headings grow open and shrink closed with a fade (200ms) in browsers that support `::details-content` and `interpolate-size`; others open instantly as before. Reduced motion keeps only the fade.

- [#38](https://github.com/nublson/notionic/pull/38) [`32e56af`](https://github.com/nublson/notionic/commit/32e56afcbfec9ae5c7c1906cfc0d5c80797d8354) Thanks [@nublson](https://github.com/nublson)! - Links fade their underline to the text color on hover (150ms) instead of switching instantly.

- [#38](https://github.com/nublson/notionic/pull/38) [`32e56af`](https://github.com/nublson/notionic/commit/32e56afcbfec9ae5c7c1906cfc0d5c80797d8354) Thanks [@nublson](https://github.com/nublson)! - Switching tabs fades the new panel in (150ms) instead of swapping it instantly; the first panel still shows at once on page load. The registry's `notion-tabs` does the same.

- [#38](https://github.com/nublson/notionic/pull/38) [`32e56af`](https://github.com/nublson/notionic/commit/32e56afcbfec9ae5c7c1906cfc0d5c80797d8354) Thanks [@nublson](https://github.com/nublson)! - Table of contents entries fade their text and underline in on hover (150ms) instead of switching instantly.

- [#38](https://github.com/nublson/notionic/pull/38) [`32e56af`](https://github.com/nublson/notionic/commit/32e56afcbfec9ae5c7c1906cfc0d5c80797d8354) Thanks [@nublson](https://github.com/nublson)! - Toggles grow open and shrink closed with a fade (200ms), like toggleable headings, in browsers that support `::details-content` and `interpolate-size`. The registry's `notion-toggle` animates its Collapsible panel the same way, and a closed panel no longer leaves an 8px gap.

## 0.8.0

### Minor Changes

- [#37](https://github.com/nublson/notionic/pull/37) [`c2161d2`](https://github.com/nublson/notionic/commit/c2161d22c411df042ea3ec3d3224c602a2e8d1c6) Thanks [@nublson](https://github.com/nublson)! - Tabs render as real tabs instead of an accordion: a row of pills that scrolls sideways when the tabs don't fit, and the selected tab's content below. Still no JavaScript: each tab is a radio button, so the arrow keys switch tabs and scroll the selected one into view. Up to 20 tabs per block.

- [#37](https://github.com/nublson/notionic/pull/37) [`c2161d2`](https://github.com/nublson/notionic/commit/c2161d22c411df042ea3ec3d3224c602a2e8d1c6) Thanks [@nublson](https://github.com/nublson)! - Code blocks name their language as people write it ("TypeScript", "Plain text", "CSS") instead of Notion's lowercase API value, in the label and the accessible name. `languageName` is exported for custom code components; the registry's `notion-code` uses it.

- [#37](https://github.com/nublson/notionic/pull/37) [`c2161d2`](https://github.com/nublson/notionic/commit/c2161d22c411df042ea3ec3d3224c602a2e8d1c6) Thanks [@nublson](https://github.com/nublson)! - Child pages and links to pages render as rows with the page's icon (emoji, custom emoji or image, or a page icon without one) and a hover surface, and rows that follow each other sit close together, like subpages in Notion. `fetchBlocks` now fetches each subpage to attach its icon as `linkedPage`. Image icons on linked pages, dropped before, now render.

- [#37](https://github.com/nublson/notionic/pull/37) [`c2161d2`](https://github.com/nublson/notionic/commit/c2161d22c411df042ea3ec3d3224c602a2e8d1c6) Thanks [@nublson](https://github.com/nublson)! - Embeds and link previews get preview cards like bookmarks: `fetchBlocks` now fetches the page behind each one and attaches its title, description and image as `bookmarkPreview`. Without a preview, they render as a one-line card with a link icon instead of a bare URL that wraps. `bookmarkPreviews: false` turns all of these requests off.

- [#37](https://github.com/nublson/notionic/pull/37) [`c2161d2`](https://github.com/nublson/notionic/commit/c2161d22c411df042ea3ec3d3224c602a2e8d1c6) Thanks [@nublson](https://github.com/nublson)! - Videos: external links to video files (.mp4, .webm, .mov, .m4v, .ogv) play in a video player, as in Notion, instead of rendering as links. Players and YouTube embeds share the image outline and get a muted fill, so they keep their shape while loading.

### Patch Changes

- [#37](https://github.com/nublson/notionic/pull/37) [`c2161d2`](https://github.com/nublson/notionic/commit/c2161d22c411df042ea3ec3d3224c602a2e8d1c6) Thanks [@nublson](https://github.com/nublson)! - Native audio and video players turn dark with the page under the `dark` class, `data-theme="dark"` or `data-mode="dark"`, and are named by their caption for screen readers.

- [#37](https://github.com/nublson/notionic/pull/37) [`c2161d2`](https://github.com/nublson/notionic/commit/c2161d22c411df042ea3ec3d3224c602a2e8d1c6) Thanks [@nublson](https://github.com/nublson)! - Bookmarks without a preview render as a one-line card with a link icon instead of a bare URL that wraps. Preview cards show the URL without its protocol, let the title wrap to two lines on narrow cards, and give the image a muted surface while it loads.

- [#37](https://github.com/nublson/notionic/pull/37) [`c2161d2`](https://github.com/nublson/notionic/commit/c2161d22c411df042ea3ec3d3224c602a2e8d1c6) Thanks [@nublson](https://github.com/nublson)! - Refined callouts: icons sit in a fixed slot centered on the first line, so text lines up across callouts; callouts with a text color keep the default surface, and those with a background color drop the border; custom emoji icons now render.

- [#37](https://github.com/nublson/notionic/pull/37) [`c2161d2`](https://github.com/nublson/notionic/commit/c2161d22c411df042ea3ec3d3224c602a2e8d1c6) Thanks [@nublson](https://github.com/nublson)! - Columns go side by side based on the space they're in (36rem), not the screen width, so a renderer in a sidebar or a card stacks them instead of squeezing them.

- [#37](https://github.com/nublson/notionic/pull/37) [`c2161d2`](https://github.com/nublson/notionic/commit/c2161d22c411df042ea3ec3d3224c602a2e8d1c6) Thanks [@nublson](https://github.com/nublson)! - Refined dividers: twice the usual space on each side, so they read as section breaks; a heading right after a divider drops its own top margin.

- [#37](https://github.com/nublson/notionic/pull/37) [`c2161d2`](https://github.com/nublson/notionic/commit/c2161d22c411df042ea3ec3d3224c602a2e8d1c6) Thanks [@nublson](https://github.com/nublson)! - Embeds render as a one-line card with the URL and the caption below, instead of a bare link labelled by the caption or the raw URL.

- [#37](https://github.com/nublson/notionic/pull/37) [`c2161d2`](https://github.com/nublson/notionic/commit/c2161d22c411df042ea3ec3d3224c602a2e8d1c6) Thanks [@nublson](https://github.com/nublson)! - The plain equation block shares the code block's surface and type, and tells screen readers it's an equation's LaTeX source.

- [#37](https://github.com/nublson/notionic/pull/37) [`c2161d2`](https://github.com/nublson/notionic/commit/c2161d22c411df042ea3ec3d3224c602a2e8d1c6) Thanks [@nublson](https://github.com/nublson)! - Files render as cards: an icon, the file name on one line (the full name as a tooltip when it truncates), its type, and the caption below, which was dropped before when a file had a name.

- [#37](https://github.com/nublson/notionic/pull/37) [`c2161d2`](https://github.com/nublson/notionic/commit/c2161d22c411df042ea3ec3d3224c602a2e8d1c6) Thanks [@nublson](https://github.com/nublson)! - Refined headings: the anchor link follows the last word when a heading wraps, with a larger hit area; headings balance their lines and use a tighter line height; every level keeps twice as much space above as below; colored headings span the full width; toggleable headings use a chevron that rotates when open, with their content aligned to the heading text.

- [#37](https://github.com/nublson/notionic/pull/37) [`c2161d2`](https://github.com/nublson/notionic/commit/c2161d22c411df042ea3ec3d3224c602a2e8d1c6) Thanks [@nublson](https://github.com/nublson)! - Images get an inset 1px outline, black at 10% (white at 10% in dark mode), so light images keep their edge against the page. It's the `--notionic-image-outline` variable, to change or turn off.

- [#37](https://github.com/nublson/notionic/pull/37) [`c2161d2`](https://github.com/nublson/notionic/commit/c2161d22c411df042ea3ec3d3224c602a2e8d1c6) Thanks [@nublson](https://github.com/nublson)! - Refined lists: nested bullets go disc, circle, square and nested numbers 1., a., i., as in Notion; bullets use the muted color; to-do checkboxes are drawn like shadcn's Checkbox instead of a dimmed disabled control, centered on the first line; nested to-dos are indented under their parent's text. The theme now also uses `primary-foreground` (see "Use your own theme tokens").

- [#37](https://github.com/nublson/notionic/pull/37) [`c2161d2`](https://github.com/nublson/notionic/commit/c2161d22c411df042ea3ec3d3224c602a2e8d1c6) Thanks [@nublson](https://github.com/nublson)! - Refined text rendering: long words, URLs and inline code wrap instead of overflowing narrow screens; body line height is 1.6; colored backgrounds bleed past the text so it stays aligned with the blocks around it; inline code and highlights keep their padding and corners across line breaks; underlines use the font's thickness; indents and borders use logical properties, so they mirror in right-to-left languages.

- [#37](https://github.com/nublson/notionic/pull/37) [`c2161d2`](https://github.com/nublson/notionic/commit/c2161d22c411df042ea3ec3d3224c602a2e8d1c6) Thanks [@nublson](https://github.com/nublson)! - PDFs render as file cards, named after the file and typed "PDF", with the caption below, instead of a bare link showing the caption or the raw URL. Uploaded files keep their name when `transformFileUrl` returns a URL without one.

- [#37](https://github.com/nublson/notionic/pull/37) [`c2161d2`](https://github.com/nublson/notionic/commit/c2161d22c411df042ea3ec3d3224c602a2e8d1c6) Thanks [@nublson](https://github.com/nublson)! - Refined quotes: emphasis inside a quote turns roman so it still stands out against the italic, and quotes with a background color get padding on their open sides and rounded end corners.

- [#37](https://github.com/nublson/notionic/pull/37) [`c2161d2`](https://github.com/nublson/notionic/commit/c2161d22c411df042ea3ec3d3224c602a2e8d1c6) Thanks [@nublson](https://github.com/nublson)! - Refined tables: columns size to their content, up to 16rem before text wraps, and a table wider than the page scrolls sideways instead of squeezing every column to its narrowest; cells align to the start edge and numbers use tabular figures.

- [#37](https://github.com/nublson/notionic/pull/37) [`c2161d2`](https://github.com/nublson/notionic/commit/c2161d22c411df042ea3ec3d3224c602a2e8d1c6) Thanks [@nublson](https://github.com/nublson)! - Table of contents entries are 28px tap targets with no gaps between them.

- [#37](https://github.com/nublson/notionic/pull/37) [`c2161d2`](https://github.com/nublson/notionic/commit/c2161d22c411df042ea3ec3d3224c602a2e8d1c6) Thanks [@nublson](https://github.com/nublson)! - Refined toggles: the same chevron as toggleable headings replaces the browser's triangle, and a wrapped summary and the toggle's content line up on one edge.

## 0.7.0

### Minor Changes

- [#32](https://github.com/nublson/notionic/pull/32) [`df7d4ec`](https://github.com/nublson/notionic/commit/df7d4ecbab5eec6ee7a32eef50adb2881cfa9ea7) Thanks [@nublson](https://github.com/nublson)! - Interactive demos: pass your own React components as `demos={{ "morph-button": MorphButton }}`, and an embed of a URL ending in `/demos/<name>` renders that component in its place, in a frame with the embed's caption below. The URL's query reaches the demo as `params`. Replace the frame with `components.demo`.

## 0.6.0

### Minor Changes

- [#31](https://github.com/nublson/notionic/pull/31) [`74ce1db`](https://github.com/nublson/notionic/commit/74ce1db5d931342e0b4f0525d51337d6049f1c80) Thanks [@nublson](https://github.com/nublson)! - Bookmarks render as cards with the bookmarked page's title, description, image and favicon, like in Notion. `fetchBlocks` reads them from the page's Open Graph tags and attaches them as `bookmarkPreview`; pass `bookmarkPreviews: false` to make no requests outside Notion. Bookmarks without a preview still render as links.

## 0.5.0

### Minor Changes

- [#28](https://github.com/nublson/notionic/pull/28) [`0dfca00`](https://github.com/nublson/notionic/commit/0dfca00345d8233b850794246b144a54d460e42c) Thanks [@nublson](https://github.com/nublson)! - Follow any dark mode setup and renamed theme tokens

- [#27](https://github.com/nublson/notionic/pull/27) [`ba01dfd`](https://github.com/nublson/notionic/commit/ba01dfdf42934715ffa8a2e9d0597058e5047443) Thanks [@nublson](https://github.com/nublson)! - Notion's background colors (`--notionic-*-bg`) are now mixed from their text color and your theme's `--background`, so overriding the nine text colors (for example `--notionic-red: var(--destructive)`) themes the backgrounds too, in light and dark mode. `--notionic-bg-mix` sets their strength.

## 0.4.0

### Minor Changes

- [#22](https://github.com/nublson/notionic/pull/22) [`ed4a20a`](https://github.com/nublson/notionic/commit/ed4a20a0ecddb51efb507a618cb133c0cb452682) Thanks [@nublson](https://github.com/nublson)! - Add `notionic/markdown` with `blocksToMarkdown(blocks, options)`, which turns Notion blocks into GitHub-flavored Markdown for feeds and `llms.txt`. It supports every block `NotionRenderer` does, and takes the same `pageHref` and `transformFileUrl` options.

## 0.3.0

### Minor Changes

- [#18](https://github.com/nublson/notionic/pull/18) [`106aa72`](https://github.com/nublson/notionic/commit/106aa72d6903a8e6a622b8e5a67c4cdbd7a89010) Thanks [@nublson](https://github.com/nublson)! - **Breaking:** notionic now requires React 19. The peer dependency changes from `^18.0.0 || ^19.0.0` to `^19.0.0`. React 18 was never tested, and the package only targets React Server Components frameworks, which run React 19. If you're on React 18, stay on notionic 0.2.

- [#17](https://github.com/nublson/notionic/pull/17) [`8e279be`](https://github.com/nublson/notionic/commit/8e279bedc56421ad3fd280a99dec8795f0bab0e9) Thanks [@nublson](https://github.com/nublson)! - Add `transformFileUrl` to `NotionRenderer`, which rewrites the URLs of files uploaded to Notion (images, videos, files, PDFs, audio and callout icons), so they can point at a route that re-signs them before Notion's one-hour expiry. `resolveFileUrl` applies it in custom components.

### Patch Changes

- [#16](https://github.com/nublson/notionic/pull/16) [`63119a9`](https://github.com/nublson/notionic/commit/63119a996698fa551a9827d24a72447201b99ea3) Thanks [@nublson](https://github.com/nublson)! - Lint and format with Biome

## 0.2.0

### Minor Changes

- [#12](https://github.com/nublson/notionic/pull/12) [`05c92ea`](https://github.com/nublson/notionic/commit/05c92ea7365d60784063c01d1d07b9ade8e32eca) Thanks [@nublson](https://github.com/nublson)! - Add `fetchPage`, which returns a page's title, icon, cover, last edited time and properties with its blocks. `fetchBlocks` now attaches the linked page's title and icon to `link_to_page` blocks, which render as links through `pageHref`.

## 0.1.0

### Minor Changes

- [#10](https://github.com/nublson/notionic/pull/10) [`3ed98f2`](https://github.com/nublson/notionic/commit/3ed98f27cde1d25544c1b8f31a0dbd6cc523c9ff) Thanks [@nublson](https://github.com/nublson)! - Render table of contents, tabs, line breaks within text and date mentions, found by rendering a real Notion page. `collectHeadings` returns the page's headings with their anchor ids, for outlines. Equations inside text can be replaced with the new `inline_equation` component, which the registry's `notion-equation` (KaTeX) uses. The registry also adds `notion-tabs` (shadcn Tabs) and `notion-mermaid` (diagrams).

## 0.0.1

- First release: `NotionRenderer` for Notion API blocks as React Server Components, styled with Tailwind CSS and shadcn/ui tokens; `fetchBlocks` in `notionic/fetch`; and `notionic/styles.css`.
