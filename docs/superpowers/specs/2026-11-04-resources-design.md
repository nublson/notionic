# Resources

Footnotes tie a note to words in the text. A resources list is different: the sources an article was written from, or any useful links, listed at the end with nothing in the text pointing at them. notionic adds it through the same kind of convention as footnotes: a "Resources" heading marks a section, and the links listed under it render as a compact list with each site's favicon.

## Goals

- Writers list resources in Notion as ordinary bulleted links, in their own words, and the page still reads well inside Notion.
- notionic renders each resource as one row: favicon, title, and a muted one-line description.
- Works with no configuration; the same option names the heading in `fetchBlocks`, `NotionRenderer` and `blocksToMarkdown`.
- Only links in the Resources section are fetched, with the bookmark preview machinery that already exists.

## Non-goals

- Bookmark blocks as resources. Items are list items that start with a link.
- A configurable or hidden title. The Notion heading renders as an ordinary heading.
- Auto-detecting link lists elsewhere on the page.
- Resources across pages.

## Writing resources in Notion

1. Add a heading, of any level, whose text is one of the resources headings (default "Resources").
2. Under it, write each resource as a bulleted or numbered item that starts with a link: `[font-smooth](https://developer.mozilla.org/…) - MDN on the non-standard smoothing properties`.

The section is the blocks after that heading, up to the next heading of the same or a higher level, or the end of the page. A toggleable heading holds its items as its children. Only top-level headings count. These are the footnotes rules, shared by one helper.

## Option

```ts
type ResourcesOptions = {
  /** Heading texts that start the resources section. Default ["Resources"]. [] turns resources off. */
  headings?: string[];
};
```

```tsx
const blocks = await fetchBlocks(notion, pageId, { resources: { headings: ["Resources", "Recursos"] } });

<NotionRenderer blocks={blocks} resources={{ headings: ["Resources", "Recursos"] }} />;

blocksToMarkdown(blocks, { resources: { headings: ["Resources", "Recursos"] } });
```

- Heading texts match ignoring case and surrounding whitespace. Accents count.
- If several headings match, the first in reading order starts the section.
- Passing the option is only needed to rename the heading or turn resources off.
- If the same heading would start both the footnotes and the resources section, footnotes win and resources are off.

## Items

A resource item is a `bulleted_list_item` or `numbered_list_item` in the section whose first non-blank rich-text segment has an `href`.

- **Title**: the consecutive rich-text segments sharing that first `href`.
- **Description**: the rich text after the title, kept as rich text. Leading whitespace and one leading separator (`-`, `–`, `—`, `:`, `|`) are trimmed. Empty after trimming means no description.
- Anything else in the section (a paragraph, an item that doesn't start with a link, an image, an empty item) renders as the ordinary block it is, in place.
- An item's children render under it as they would in a list.
- A link to a Notion page or block resolves through the existing link handling (`pageHref`, `/p/<id>`), like any other rich-text link.

## Fetching

`fetchBlocks` takes `resources?: ResourcesOptions`. After the page's blocks and children are loaded, it calls `collectResources` and fetches `fetchBookmarkPreview(href)` for each resource item, with the existing concurrency limit, timeout and private-host checks. The preview is attached to the item block as `resourcePreview?: BookmarkPreview`.

- `bookmarkPreviews: false` turns these fetches off too.
- Links outside the section are never fetched.
- Links that resolve to Notion pages, and non-http(s) links, aren't fetched.
- A failed fetch leaves the item without a preview.

## Rendering

The heading renders as an ordinary heading and stays in the table of contents. Each run of consecutive resource items renders, in place of the list they would have formed, through a new overridable component, `components.resources`:

```html
<ul data-resources>
  <li>
    <a href="https://developer.mozilla.org/…">
      <img src="…favicon" alt="" width="16" height="16" />
      <span>font-smooth</span>
      <span class="text-muted-foreground"> - MDN on the non-standard smoothing properties…</span>
    </a>
  </li>
</ul>
```

- The row is one link, rendered through `components.link` when it's set, so external links behave as elsewhere.
- No list marker; the favicon sits in its place. Without a favicon, a small generic link icon keeps rows aligned.
- Title in the foreground; description muted, with the component's own ` - ` before it, on one line, truncated with an ellipsis.
- Description: the writer's, or else the fetched `description`, or else none.
- If the description contains its own links, the row can't nest them: the title is the link and the description follows it as rich text, still on one line.
- Each row has a hit area at least 40px tall and a visible focus ring. Works at 320px and in dark mode.
- `components.resources` receives `{ items: ResourceItem[] }`:

```ts
type ResourceItem = {
  block: NotionBlock;
  href: string;
  title: RichText;
  description: RichText | null; // the writer's, after trimming
  preview: BookmarkPreview | null;
};
```

## Architecture

- **`sections.ts`**: the heading match and section boundaries move out of `footnotes.ts` into `findSection(blocks, names)`, returning the marker heading, its level, whether it's toggleable, the section's blocks and the item blocks. `collectFootnotes` uses it with no change in behavior.
- **`resources.ts`**: `collectResources(blocks, { resources, footnotes })` returns `{ headingBlockId, items: Map<blockId, ResourceItem> }` or null. Pure, tested on its own. It applies the footnotes-win rule, so the renderer and `blocksToMarkdown` agree. `fetchBlocks` doesn't know the footnotes headings, so in that rare conflict it may fetch previews that go unused, which is harmless.
- **`fetch.ts`**: the `resources` option and the section-only preview fetches.
- **Render context** gets the item map. Where `NotionRenderer` groups consecutive list items into a list, a run of resource items renders as `components.resources` instead.
- **`types.ts`**: `ResourcesOptions`, `ResourceItem`, `resourcePreview` on blocks, `resources` in the components map.
- **`markdown.ts`**: `blocksToMarkdown` takes `resources` and writes each item as `- [title](href) - description`, using the fetched description when the writer wrote none. Without one, just `- [title](href)`.

## Edge cases

| Case | Result |
| --- | --- |
| No resources heading, or `headings: []` | Nothing changes. |
| Section with no item that starts with a link | Ordinary content, as before. |
| Item that doesn't start with a link | An ordinary list item. |
| Item with several links | The first is the title; the rest stay links in the description. |
| Same heading as footnotes | Footnotes win; resources off. |
| Preview fetch fails, or `bookmarkPreviews: false` | The writer's description and the fallback icon. |
| No description written, none fetched | Title only. |
| Resource item mixed with other blocks | Each run of consecutive resource items is its own list; other blocks render between them. |
| Toggleable resources heading | Its children are the items. |

## Testing

- `findSection`: the existing footnote tests keep passing.
- `collectResources`: section boundaries, toggleable headings, custom and case-insensitive headings, first match winning, items that don't qualify, title spanning several segments, separator trimming.
- `fetchBlocks`: only section links fetched, `bookmarkPreviews: false`, Notion links skipped, preview attached.
- Rendering: markup, description and favicon fallbacks, runs split by other blocks, the several-links layout, `components.link`, `components.resources`, footnotes winning.
- Markdown: item output and the fetched-description fallback.
- A browser check at 320px and desktop: truncation, focus rings, hit area, dark mode.

## Docs

README and the Notion docs: a "Resources" guide covering the Notion steps, the option, and a supported-blocks row.
