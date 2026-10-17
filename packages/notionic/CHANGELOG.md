# notionic

## 0.1.0

### Minor Changes

- [#10](https://github.com/nublson/notionic/pull/10) [`3ed98f2`](https://github.com/nublson/notionic/commit/3ed98f27cde1d25544c1b8f31a0dbd6cc523c9ff) Thanks [@nublson](https://github.com/nublson)! - Render table of contents, tabs, line breaks within text and date mentions, found by rendering a real Notion page. `collectHeadings` returns the page's headings with their anchor ids, for outlines. Equations inside text can be replaced with the new `inline_equation` component, which the registry's `notion-equation` (KaTeX) uses. The registry also adds `notion-tabs` (shadcn Tabs) and `notion-mermaid` (diagrams).

## 0.0.1

- First release: `NotionRenderer` for Notion API blocks as React Server Components, styled with Tailwind CSS and shadcn/ui tokens; `fetchBlocks` in `notionic/fetch`; and `notionic/styles.css`.
