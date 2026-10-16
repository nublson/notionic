# notionic

Render blocks from the [official Notion API](https://developers.notion.com) as React Server Components, styled with Tailwind CSS and shadcn/ui's theme tokens.

- **Server-first.** Every block renders on the server; notionic ships no client JavaScript.
- **Follows your theme.** Components use shadcn/ui tokens (`foreground`, `muted`, `border`…), so they match your app, dark mode included.
- **Replaceable.** Swap the component for any block type.
- **Zero runtime dependencies** besides React.

> Early development. The API may change before 1.0.

## Install

```bash
pnpm add notionic @notionhq/client
```

`@notionhq/client` is only needed to fetch blocks with `notionic/fetch`.

## Set up Tailwind CSS

notionic needs Tailwind CSS v4. Import its styles after Tailwind:

```css
@import "tailwindcss";
@import "notionic/styles.css";
```

This one line tells Tailwind to scan notionic's components, and defines Notion's colors as `--notionic-*` variables, with dark values under `.dark`. Override any of them to change a color.

The components use shadcn/ui's color tokens. If you don't use shadcn/ui, define `--color-foreground`, `--color-muted`, `--color-muted-foreground`, `--color-border`, `--color-ring` and `--color-primary` in your theme.

## Render a page

```tsx
import { Client } from "@notionhq/client";
import { NotionRenderer } from "notionic";
import { fetchBlocks } from "notionic/fetch";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

export default async function Page() {
  const blocks = await fetchBlocks(notion, "your-page-id");
  return <NotionRenderer blocks={blocks} />;
}
```

`fetchBlocks` fetches every block of the page with its nested blocks, following pagination. It limits requests in flight (`concurrency`, default 3) and nesting depth (`maxDepth`, default 5). It doesn't cache: use your framework's cache, such as Next.js's `"use cache"`.

You can also pass blocks you fetched yourself: `NotionRenderer` takes the API's block objects with nested blocks attached as `children` (the `NotionBlock` type).

## Options

### Link Notion pages to your routes

Links to other Notion pages point to notion.so by default. Map them to your own routes with `pageHref`, or return `null` to render the text without a link:

```tsx
<NotionRenderer
  blocks={blocks}
  pageHref={(pageId) => routes.get(pageId) ?? null}
/>
```

`pageId` is 32 lowercase hex characters, without dashes.

### Replace a block's component

```tsx
import { NotionRenderer, RichText, type BlockProps } from "notionic";

function Callout({ block, context, children }: BlockProps<"callout">) {
  return (
    <aside className="rounded-lg border p-4">
      <RichText text={block.callout.rich_text} context={context} />
      {children}
    </aside>
  );
}

<NotionRenderer blocks={blocks} components={{ callout: Callout }} />;
```

`children` holds the block's nested blocks, already rendered.

## Supported blocks

Paragraph, headings 1–4 (including toggleable headings), bulleted, numbered and to-do lists, quote, callout, toggle, divider, equation, code, table, columns, synced block, image, video (YouTube or file), audio, file, PDF, bookmark, embed, link preview and child page.

Notion's heading 1 renders as `<h2>`, since your page title is the `<h1>`; heading 2 as `<h3>`, and so on. Headings get ids and anchor links.

Code renders as plain text. For syntax highlighting, use `notion-code` from the shadcn registry below.

Unsupported blocks render nothing, with a warning in development.

## shadcn/ui components

notionic's shadcn registry has versions of some blocks built on your own shadcn/ui components. The shadcn CLI copies them into your project, with the shadcn components they use, so you can edit them.

| Item | Built on |
| --- | --- |
| `notion-code` | Code Block, highlighted on the server with Shiki, with a copy button |
| `notion-callout` | Alert |
| `notion-table` | Table |
| `notion-toggle` | Collapsible |

Add the registry to your `components.json`:

```json
{
  "registries": {
    "@notionic": "https://notionic.dev/r/{name}.json"
  }
}
```

Then add the items you want, and pass them to `components`:

```bash
npx shadcn@latest add @notionic/notion-code @notionic/notion-callout @notionic/notion-table @notionic/notion-toggle
```

```tsx
import { NotionCallout } from "@/components/notion-callout";
import { NotionCode } from "@/components/notion-code";
import { NotionTable } from "@/components/notion-table";
import { NotionToggle } from "@/components/notion-toggle";

<NotionRenderer
  blocks={blocks}
  components={{
    code: NotionCode,
    callout: NotionCallout,
    table: NotionTable,
    toggle: NotionToggle,
  }}
/>;
```

`notion-code` highlights the languages listed in `lib/highlighter.tsx`, which comes with shadcn's Code Block. Add a language there to highlight it; others render as plain text.

## Uploaded files

Notion's URLs for uploaded files (images, videos, files) expire after an hour. If you cache rendered pages longer than that, host the files elsewhere or proxy them.

## License

MIT
