# notionic

## 0.2.0

### Minor Changes

- [#12](https://github.com/nublson/notionic/pull/12) [`05c92ea`](https://github.com/nublson/notionic/commit/05c92ea7365d60784063c01d1d07b9ade8e32eca) Thanks [@nublson](https://github.com/nublson)! - Add `fetchPage`, which returns a page's title, icon, cover, last edited time and properties with its blocks. `fetchBlocks` now attaches the linked page's title and icon to `link_to_page` blocks, which render as links through `pageHref`.

## 0.1.0

### Minor Changes

- [#10](https://github.com/nublson/notionic/pull/10) [`3ed98f2`](https://github.com/nublson/notionic/commit/3ed98f27cde1d25544c1b8f31a0dbd6cc523c9ff) Thanks [@nublson](https://github.com/nublson)! - Render table of contents, tabs, line breaks within text and date mentions, found by rendering a real Notion page. `collectHeadings` returns the page's headings with their anchor ids, for outlines. Equations inside text can be replaced with the new `inline_equation` component, which the registry's `notion-equation` (KaTeX) uses. The registry also adds `notion-tabs` (shadcn Tabs) and `notion-mermaid` (diagrams).

## 0.0.1

- First release: `NotionRenderer` for Notion API blocks as React Server Components, styled with Tailwind CSS and shadcn/ui tokens; `fetchBlocks` in `notionic/fetch`; and `notionic/styles.css`.
