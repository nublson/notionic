# notionic

[![npm](https://img.shields.io/npm/v/notionic)](https://www.npmjs.com/package/notionic)
[![CI](https://github.com/nublson/notionic/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/nublson/notionic/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/npm/l/notionic)](https://github.com/nublson/notionic/blob/main/LICENSE)

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

notionic needs React 19. `@notionhq/client` is only needed to fetch blocks with `notionic/fetch`.

## Set up Tailwind CSS

notionic needs Tailwind CSS v4. Import its styles after Tailwind:

```css
@import "tailwindcss";
@import "notionic/styles.css";
```

This one line tells Tailwind to scan notionic's components, and defines Notion's nine colors as `--notionic-*` variables. Their dark values apply under the `dark` class, `data-theme="dark"` or `data-mode="dark"`, and on pages whose [`color-scheme`](https://developer.mozilla.org/docs/Web/CSS/color-scheme) is dark, so a page that follows `prefers-color-scheme` gets them by declaring `color-scheme: light dark`.

### Match Notion's colors to your brand

Override the text colors after the import. Each background color (`--notionic-red-bg`…) is mixed from its text color and your `--background`, so it follows on its own:

```css
:root,
.dark {
  --notionic-red: var(--destructive);
  --notionic-blue: var(--primary);
}
```

Mapping to tokens that already switch in dark mode, like shadcn's, keeps both modes right. To make every background stronger or subtler, set `--notionic-bg-mix` (default `14%`, `22%` in dark mode); to set one background directly, override its `--notionic-*-bg`.

### Use your own theme tokens

The components use shadcn/ui's color tokens, and Tailwind only generates their classes if your theme defines them. If your design system names them differently, map yours to these eight, after importing notionic:

```css
@theme inline {
  --color-background: var(--color-page);
  --color-foreground: var(--color-text);
  --color-muted: var(--color-surface);
  --color-muted-foreground: var(--color-text-subtle);
  --color-border: var(--color-line);
  --color-ring: var(--color-focus);
  --color-primary: var(--color-brand);
  --color-primary-foreground: var(--color-on-brand);
}
```

Replace each right-hand side with your own token. notionic needs no others.

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

To also get the page's title, icon, cover and properties, use `fetchPage(notion, pageId)`, which returns `{ page, blocks }`.

`fetchBlocks` fetches every block of the page with its nested blocks, following pagination. It limits requests in flight (`concurrency`, default 3) and nesting depth (`maxDepth`, default 5). It doesn't cache: use your framework's cache, such as Next.js's `"use cache"`.

For bookmarks, embeds and link previews, `fetchBlocks` also fetches the linked page and reads its title, description, image and favicon, so the block renders as a card like a Notion bookmark. A page that's slow (over 5 seconds), unreachable or untitled renders as a one-line card with the URL, and private network addresses are never fetched. Pass `bookmarkPreviews: false` to make no requests outside Notion.

To preview any other link the same way, use `fetchBookmarkPreview(url)` from `notionic/fetch`. It returns the page's `title`, `description`, `image`, `favicon` and `siteName`, or `null`, under the same rules. It doesn't cache either.

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

`notion-mermaid` loads Mermaid in the browser only on pages with a diagram, follows the `dark` class, and keeps showing the code until the diagram draws, or if its source doesn't parse. Wrap the code component you use: `withMermaid(NotionCode)`, or `withMermaid(defaultComponents.code)`.

Equations inside text have their own key, `inline_equation`, whose component gets the equation's LaTeX as `expression`.

Links inside text have their own key too, `link`. Its component gets the resolved `link` (`href`, and `external` for other sites), the formatted text as `children`, and `context`. Wrap `NotionLink` to keep notionic's styling and new-tab behavior:

```tsx
import { NotionLink, type LinkProps } from "notionic";

function Link({ link, children }: LinkProps) {
  return (
    <NotionLink link={link}>
      {link.external ? <Favicon href={link.href} /> : null}
      {children}
    </NotionLink>
  );
}

<NotionRenderer blocks={blocks} components={{ link: Link }} />;
```

### Interactive demos

Put your own React components in a page, like the demos in a design engineering blog. Each demo is a component in your project, so it can use anything you install (Motion, Sonner, charts, 3D). In Notion, an embed of a URL ending in `/demos/<name>` marks where it goes, and its caption goes below it.

```tsx
// components/demos/morph-button.tsx
"use client";
export function MorphButton({ params }: DemoProps) { /* … */ }

// app/page.tsx
<NotionRenderer blocks={blocks} demos={{ "morph-button": MorphButton }} />;
```

In Notion, add `/embed` with `https://your-site.com/demos/morph-button`. Only the path counts, so the same embed renders on localhost and previews. The URL's query reaches the demo as `params`: `?speed=slow` is `{ speed: "slow" }`. Unknown names render as links.

To see the demo inside Notion while you write, add a page at `/demos/[name]` that renders the demo alone:

```tsx
// app/demos/[name]/page.tsx
export default async function DemoPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const Demo = Object.hasOwn(demos, name) ? demos[name] : undefined;
  if (!Demo) notFound();
  return <main className="grid min-h-svh place-items-center"><Demo name={name} params={{}} /></main>;
}
```

Demos render in `DemoFrame`, a bordered stage with the caption centered below. Replace it with `components={{ demo: MyFrame }}`; it gets the demo as `children`, plus `name`, `caption` and `context`. Only the demos a page uses send JavaScript to the browser.

### Footnotes

Notion has no footnote block, so notionic reads them from a section:

1. At the end of the page, add a heading named "Footnotes", at any level.
2. Under it, write each note as its own paragraph or list item.
3. In the text, select the word and link it to its note: on the note, ⋯ › Copy link to block, then paste it as the link.

Links into that section render as numbered superscripts, in reading order. The section renders as a footnote list with links back to each reference. Clicking a footnote in Notion still jumps to the note.

```tsx
<NotionRenderer
  blocks={blocks}
  footnotes={{
    headings: ["Footnotes", "Referências", "Références"], // default ["Footnotes"]; [] turns footnotes off
    showTitle: true, // show the heading above the list instead of a separator
    title: "Notes", // instead of the heading's text
  }}
/>
```

Headings match ignoring case. The section runs to the next heading of the same or a higher level. Notes nothing links to are listed after the numbered ones. Replace the list through `components={{ footnotes: MyFootnotes }}`. Pass the same option to `collectHeadings` and `blocksToMarkdown`, which writes GFM footnotes.

## Supported blocks

Paragraph (with line breaks), headings 1–4 (including toggleable headings), bulleted, numbered and to-do lists, quote, callout, toggle, divider, equation, code, table, columns, tabs, table of contents, synced block, image, video (YouTube or file), audio, file, PDF, bookmark (a card with the page's title, description and image, from `fetchBlocks`), embed and link preview (cards like bookmarks, or for an embed one of your demos), and child page and link to page (with their icons and titles, from `fetchBlocks`). Date mentions render as `<time>`.

Notion's heading 1 renders as `<h2>`, since your page title is the `<h1>`; heading 2 as `<h3>`, and so on. Headings get ids and anchor links.

Tabs render as real tabs with no JavaScript: a row of pills that scrolls sideways, and one panel at a time. To use shadcn's Tabs component instead, add `notion-tabs` from the shadcn registry.

Code renders as plain text. For syntax highlighting, use `notion-code` from the shadcn registry below. Equations, in blocks and inside text, show their LaTeX source; `notion-equation` typesets them with KaTeX.

Unsupported blocks render nothing, with a warning in development.

### Page outline

`collectHeadings(blocks)` returns the page's headings in reading order, with the same anchor ids the rendered headings get, for a sidebar outline:

```tsx
import { collectHeadings } from "notionic";

const outline = collectHeadings(blocks); // [{ id: "intro", text: "Intro", level: 1, blockId }]
```

## shadcn/ui components

notionic's shadcn registry has versions of some blocks built on your own shadcn/ui components. The shadcn CLI copies them into your project, with the shadcn components they use, so you can edit them.

| Item | Built on |
| --- | --- |
| `notion-code` | Code Block, highlighted on the server with Shiki, with a copy button |
| `notion-callout` | Alert |
| `notion-table` | Table |
| `notion-toggle` | Collapsible |
| `notion-tabs` | Tabs, with every panel kept in the HTML |
| `notion-equation` | KaTeX, rendered on the server: equation blocks and equations inside text |
| `notion-mermaid` | Mermaid: draws `mermaid` code blocks as diagrams, wrapping your code component |

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
npx shadcn@latest add @notionic/notion-code @notionic/notion-callout @notionic/notion-table @notionic/notion-toggle @notionic/notion-tabs @notionic/notion-equation @notionic/notion-mermaid
```

```tsx
import { NotionCallout } from "@/components/notion-callout";
import { NotionCode } from "@/components/notion-code";
import { NotionTable } from "@/components/notion-table";
import { NotionToggle } from "@/components/notion-toggle";
import { NotionTabs } from "@/components/notion-tabs";
import { NotionEquation, NotionInlineEquation } from "@/components/notion-equation";
import { withMermaid } from "@/components/notion-mermaid";

<NotionRenderer
  blocks={blocks}
  components={{
    code: withMermaid(NotionCode),
    callout: NotionCallout,
    table: NotionTable,
    toggle: NotionToggle,
    tab: NotionTabs,
    equation: NotionEquation,
    inline_equation: NotionInlineEquation,
  }}
/>;
```

`notion-code` highlights the languages listed in `lib/highlighter.tsx`, which comes with shadcn's Code Block. Add a language there to highlight it; others render as plain text.

## Markdown

`notionic/markdown` turns the same blocks into GitHub-flavored Markdown, for RSS feeds, `llms.txt` and other plain-text uses:

```ts
import { blocksToMarkdown } from "notionic/markdown";

const markdown = `# ${page.title}\n\n${blocksToMarkdown(blocks, { pageHref, transformFileUrl })}`;
```

It takes the same `pageHref` and `transformFileUrl` as `NotionRenderer`, so links and files match the HTML. Notion's heading 1 becomes `##`, so add the page title yourself. Toggles become `<details>`, equations `$…$` and `$$…$$`.

## Uploaded files

Notion's URLs for uploaded files (images, videos, files, icons) expire after an hour, which is shorter than most pages are cached. Pass `transformFileUrl` to point them at a route of yours that fetches a fresh URL:

```tsx
<NotionRenderer
  blocks={blocks}
  transformFileUrl={({ blockId }) => `/api/notion/file/${blockId}`}
/>
```

The route retrieves the block with the Notion API (`notion.blocks.retrieve`) and redirects to its file's current URL. notionic.dev's route is a working example: `apps/web/app/api/notion/file/[blockId]/route.ts`. External URLs never go through `transformFileUrl`.

## License

MIT
