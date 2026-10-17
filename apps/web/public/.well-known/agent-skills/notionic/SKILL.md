---
name: notionic
description: Add notionic to a React or Next.js project to use Notion as a CMS. Fetches Notion pages with the official API and renders their blocks as React Server Components, styled with Tailwind CSS v4 and shadcn/ui tokens. Use when a project needs to render Notion pages, a Notion-backed blog or docs, or replace react-notion-x.
---

# notionic

notionic renders blocks from the official Notion API as React Server Components. Full docs: https://notionic.dev/llms.txt (each doc is also Markdown at `https://notionic.dev/docs/<slug>.md`).

## Install

```bash
pnpm add notionic @notionhq/client
```

Needs React 19 and Tailwind CSS v4. Import the styles after Tailwind, in the global CSS:

```css
@import "tailwindcss";
@import "notionic/styles.css";
```

## Render a page

```tsx
import { Client } from "@notionhq/client";
import { NotionRenderer } from "notionic";
import { fetchBlocks } from "notionic/fetch";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

export default async function Page() {
  const blocks = await fetchBlocks(notion, process.env.NOTION_PAGE_ID!);
  return <NotionRenderer blocks={blocks} />;
}
```

- The Notion integration behind `NOTION_TOKEN` must be connected to the page (in Notion: ••• › Connections).
- `fetchPage(notion, pageId)` returns `{ page, blocks }`, with the title, icon, cover and properties.
- `fetchBlocks` doesn't cache. Cache with the framework, e.g. `export const revalidate = 3600` in Next.js.

## Common options

- `pageHref={(pageId) => "/blog/" + slugs.get(pageId)}`: point links between Notion pages at your routes; return `null` for no link.
- `transformFileUrl={({ blockId }) => "/api/notion/file/" + blockId}`: Notion's file URLs expire after an hour, so route uploaded files through an endpoint that re-signs them.
- `components={{ callout: MyCallout }}`: replace the component for any block type.
- `demos={{ "morph-button": MorphButton }}`: an embed of `…/demos/<name>` renders your own component.

## shadcn/ui components

Add the registry to `components.json`, then the components you want:

```json
{ "registries": { "@notionic": "https://notionic.dev/r/{name}.json" } }
```

```bash
npx shadcn@latest add @notionic/notion-code @notionic/notion-callout @notionic/notion-table @notionic/notion-toggle @notionic/notion-tabs @notionic/notion-equation @notionic/notion-mermaid
```

Pass them through `components`, e.g. `components={{ code: NotionCode, callout: NotionCallout }}`.

## Other helpers

- `collectHeadings(blocks)`: the page's headings with anchor ids, for a table of contents.
- `blocksToMarkdown(blocks)` from `notionic/markdown`: the page as Markdown, for feeds or llms.txt.
