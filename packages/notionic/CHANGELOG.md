# notionic

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
