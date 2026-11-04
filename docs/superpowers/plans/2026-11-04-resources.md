# Resources Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the bulleted links under a "Resources" heading as a compact list: one link per row, with favicon, title and a muted one-line description.

**Architecture:** The section finder moves out of `footnotes.ts` into a shared `sections.ts`. A pure pre-pass, `collectResources`, finds the resource items. `fetchBlocks` uses it to fetch a preview for each resource link, and `NotionRenderer` puts the items in the render context. There, `groupBlocks` groups runs of resource items into an overridable `resources` component. `blocksToMarkdown` adds the fetched description when the writer wrote none.

**Tech Stack:** TypeScript, React 19 Server Components, Tailwind v4, Vitest (`block`, `richText`, `renderToHtml` from `src/test-utils.ts`), Biome. All paths below are relative to `packages/notionic/`.

**Spec:** `docs/superpowers/specs/2026-11-04-resources-design.md`

## Global Constraints

- No client JavaScript and no new runtime dependencies.
- Option: `resources?: { headings?: string[] }`. The default is `["Resources"]`, and `[]` turns resources off. The same option goes to `fetchBlocks`, `NotionRenderer` and `blocksToMarkdown`.
- Heading match is shared with footnotes: case and surrounding whitespace are ignored, accents count, and the first top-level match wins. The section runs to the next top-level heading of the same or a higher level; under a toggleable heading, the section is its children.
- The resources heading renders as an ordinary heading and stays in the table of contents.
- If the heading that matched the resources names is also a footnotes heading, footnotes win and resources are off.
- Separators trimmed from the start of a description: whitespace, then one of `-` `–` `—` `:` `|`, then whitespace.
- Theme tokens only (`foreground`, `muted-foreground`, `muted`, `ring`).
- Public API changes stay additive. `groupBlocks(blocks)` with one argument returns exactly what it returns today.
- No hand-written changeset: `auto-changeset.yml` writes one from the PR title (`feat: resources`).

## Review Focus

- A resource whose title link is bold or split across several rich-text items (Notion splits text when the formatting changes partway through). It should be one title. Pinned by the Task 2 test `joins title segments that share the first link`.
- A Resources section that also contains an intro paragraph or a non-link item between links. Each run of links is its own list, and the other blocks render in place. Pinned by the Task 4 test `splits resource runs around other blocks`.
- With `linkFavicons` on, the title link must not draw a second inline favicon inside the row. Pinned by the Task 4 test `draws one favicon per row with linkFavicons`.
- A long unbreakable title or description at 320px. The row truncates and never scrolls sideways. Checked in the Task 6 browser check.
- Footnotes on the same page keep working after the section finder moves. Pinned by the existing `footnotes.test.ts` and `renderer.test.tsx` passing unchanged in Task 1.

---

### Task 1: Shared section finder

**Files:**
- Create: `src/sections.ts`, `src/sections.test.ts`
- Modify: `src/footnotes.ts` (use `findSection`, behavior unchanged)

**Interfaces:**
- Produces:

```ts
export type Section = {
  marker: NotionBlock;
  heading: { level: 1 | 2 | 3 | 4; text: string };
  /** Index of the marker in `blocks`, and the index after the section's last top-level block. */
  start: number;
  end: number;
  /** The top-level blocks after the marker that the section spans (empty for a toggleable marker). */
  blocks: NotionBlock[];
  /** The section's content: the marker's children when toggleable, else `blocks`. */
  items: NotionBlock[];
};
/** The first top-level heading whose text is one of `names` (case-insensitive, trimmed), and its section. */
export function findSection(blocks: NotionBlock[], names: readonly string[]): Section | null;
/** The heading level and trimmed text of a heading block, else null. */
export function headingOf(block: NotionBlock): { level: 1 | 2 | 3 | 4; text: string } | null;
```

- [ ] **Step 1: Write the failing tests** in `src/sections.test.ts`:
  - `finds the first matching top-level heading`: `[p, H2 "Resources", item, item, H2 "Next", p]` with `["resources"]` gives `start 1`, `end 4`, `items.length 2`, `heading { level: 2, text: "Resources" }`.
  - `ends at a heading of the same or higher level, not a lower one`: an H3 inside an H2 section stays in it; a following H1 ends it.
  - `runs to the end of the page`: `end === blocks.length`.
  - `reads a toggleable heading's children`: `items` are the children, `blocks` is `[]`, and `end === start + 1`.
  - `ignores a heading nested in a toggle`, and `returns null with no names or no match`.
  - `matches ignoring case and surrounding whitespace but not accents`: `"  RESOURCES "` matches `["Resources"]`; `"Referencias"` doesn't match `["Referências"]`.
- [ ] **Step 2: Run** `pnpm --filter notionic exec vitest run src/sections.test.ts`. Expected: FAIL, the module isn't found.
- [ ] **Step 3: Implement `src/sections.ts`** by moving `LEVELS`, `heading()` (renamed `headingOf`, exported) and the start/end logic out of `collectFootnotes`. Then make `collectFootnotes` call `findSection(blocks, options.headings ?? ["Footnotes"])` and use `section.items` as the note blocks, `section.blocks` for `sectionBlockIds`, and `start`/`end` for the reference walk.
- [ ] **Step 4: Run** `pnpm --filter notionic exec vitest run src/sections.test.ts src/footnotes.test.ts src/renderer.test.tsx src/markdown.test.ts`. Expected: PASS, with no footnote test edited.
- [ ] **Step 5: Commit** `refactor: share the footnotes section finder`.

### Task 2: `collectResources`

**Files:**
- Create: `src/resources.ts`, `src/resources.test.ts`
- Modify: `src/types.ts`, `src/index.ts` (export `collectResources` and the new types)

**Interfaces:**
- Consumes: `findSection`, `headingOf` (Task 1); `normalizePageId` from `links.ts`; `plainText` from `utils.ts`.
- Produces, in `types.ts`:

```ts
/** A Resources section (see `NotionRendererProps`). */
export type ResourcesOptions = {
  /** Heading texts that start the resources section, matched ignoring case. Default ["Resources"]; [] turns resources off. */
  headings?: string[];
};
export type ResourceItem = {
  block: NotionBlock;
  href: string;
  /** The rich text sharing the first link. */
  title: RichText;
  /** The writer's text after the title, separator trimmed; null when empty. */
  description: RichText | null;
  /** What `fetchBlocks` read from the linked page, or null. */
  preview: BookmarkPreview | null;
};
/** A page's resources, from `collectResources`. */
export type PageResources = {
  headingBlockId: string;
  /** Resource items by block id without dashes. */
  items: Map<string, ResourceItem>;
};
// On NotionBlock:
/** What the linked page says about itself, attached by `fetchBlocks` to resource items. */
resourcePreview?: BookmarkPreview;
```

- In `resources.ts`: `export function collectResources(blocks: NotionBlock[], options: { resources?: ResourcesOptions; footnotes?: FootnotesOptions } = {}): PageResources | null`.

- [ ] **Step 1: Write the failing tests** in `src/resources.test.ts`. Use helpers in the style of `footnotes.test.ts`, with `item(...text)` returning a `bulleted_list_item`:
  - `returns null without a resources heading`, `with headings: []`, and `when no item starts with a link`.
  - `reads title, href and description`: `[link("font-smooth", URL), text(" - MDN on smoothing")]` gives `href === URL`, `plainText(title) === "font-smooth"`, and `plainText(description) === "MDN on smoothing"`.
  - `trims each separator`: for each of `" - "`, `" – "`, `" — "`, `": "`, `" | "`, the description is `"MDN"`. A description that's only `" - "` is `null`.
  - `joins title segments that share the first link`: `[link("Font ", URL, bold), link("smooth", URL), text(" - d")]` gives a title of 2 items, `"Font smooth"`.
  - `skips leading blank segments`: `[text(" "), link("a", URL)]` is a resource.
  - `keeps later links in the description`: `[link("a", U1), text(" - see "), link("b", U2)]` gives `description[1].href === U2`.
  - `ignores items that don't start with a link, and non-list blocks`: `[text("See "), link("MDN", URL)]` and a paragraph aren't in `items`.
  - `accepts numbered items`, `reads a toggleable heading's children`, and `stops at the next same-level heading`.
  - `attaches the fetched preview`: `resourcePreview` on the block is `item.preview`.
  - `defers to footnotes on the same heading`: `{ resources: { headings: ["Notes"] }, footnotes: { headings: ["Notes"] } }` gives `null`, and with no `footnotes` option the heading "Footnotes" plus `resources: { headings: ["Footnotes"] }` also gives `null`, because the default footnotes heading wins.
- [ ] **Step 2: Run** `pnpm --filter notionic exec vitest run src/resources.test.ts`. Expected: FAIL, the module isn't found.
- [ ] **Step 3: Implement `collectResources`**. The footnotes check compares the matched heading text (lowercased) with the footnotes names, defaulting to `["Footnotes"]`. To trim a separator, return copies of the leading items with `plain_text` and `text.content` edited. Never mutate the input.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat: collect resources from a Resources section`.

### Task 3: Fetch previews for resource links

**Files:**
- Modify: `src/fetch.ts`
- Test: `src/fetch.test.ts`

**Interfaces:**
- Consumes: `collectResources` (Task 2), `fetchBookmarkPreview`, `externalLinkHost`, `mapPool`.
- Produces: `FetchBlocksOptions.resources?: ResourcesOptions`. After `fetchTree`, `fetchBlocks` returns blocks whose resource items carry `resourcePreview`.

- [ ] **Step 1: Write the failing tests** in `src/fetch.test.ts`, mocking `fetch` the way the bookmark preview tests there do:
  - `fetches a preview for each resource link only`: the page has a paragraph linking to `https://a.example`, then H2 "Resources" and an item linking to `https://b.example`. Only `b.example` is requested, and that item gets `resourcePreview.title` from the mocked HTML.
  - `reads a renamed heading`: with `resources: { headings: ["Recursos"] }`.
  - `fetches nothing with bookmarkPreviews: false`.
  - `skips links to Notion pages`: an item linking to `/<32-hex>` gets no request.
  - `keeps the item when the fetch fails`: no `resourcePreview`, and no throw.
  - `fetches inside a toggleable resources heading`.
- [ ] **Step 2: Run** `pnpm --filter notionic exec vitest run src/fetch.test.ts`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement** `withResourcePreviews(blocks: NotionBlock[], options: ResourcesOptions | undefined, concurrency: number): Promise<NotionBlock[]>` in `fetch.ts`, and call it from `fetchBlocks` when `bookmarkPreviews` is true. It maps over the items of `collectResources(blocks, { resources: options })` whose `externalLinkHost(href)` isn't null, using `mapPool`. It returns new blocks with `resourcePreview` set, rebuilding the top level and, for a toggleable marker, its `children`. Document `resources` on `FetchBlocksOptions` in the style of its neighbors.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat: fetch previews for resource links`.

### Task 4: Render the resource list

**Files:**
- Create: `src/blocks/resources.tsx`
- Modify: `src/renderer.tsx`, `src/types.ts`, `src/index.ts` (export `Resources`, `ResourcesProps`)
- Test: `src/renderer.test.tsx`

**Interfaces:**
- Consumes: `collectResources` and `PageResources` (Task 2); `resolveLink`, `externalLinkHost`; `RichText`, `NotionLink`, `LinkFavicon` from `rich-text.tsx`.
- Produces:
  - `RenderContext.resources?: PageResources`
  - `NotionRendererProps.resources?: ResourcesOptions`
  - `BlockComponents.resources?: ComponentType<ResourcesProps>`
  - `export type ResourcesProps = { items: [ResourceItem, ...ResourceItem[]]; context: RenderContext }`
  - `groupBlocks(blocks: NotionBlock[], resources?: PageResources)` gains the group `{ kind: "resources"; items: [ResourceItem, ...ResourceItem[]] }`, for consecutive blocks found in `resources.items`. With no second argument, nothing changes.
  - `export function Resources(props: ResourcesProps)` in `blocks/resources.tsx`.

- [ ] **Step 1: Write the failing tests** in `src/renderer.test.tsx`:
  - `renders resource items as one list of row links`: the output has a `ul[data-resources]` with two `li`. Each `li` holds one `<a href=URL>` containing the title text and a `text-muted-foreground` span with ` - ` plus the description. There's no `list-disc`.
  - `keeps the heading visible and in the table of contents`: the H2 "Resources" renders, and a `table_of_contents` block lists it.
  - `uses the preview's favicon, then a link icon`: with a `resourcePreview.favicon` the row has `<img src=favicon>`, and without one it has an `svg[aria-hidden]`.
  - `falls back to the fetched description`: an item with no description and `resourcePreview.description: "From the site"` shows that text. With neither, the row has no ` - ` span.
  - `draws one favicon per row with linkFavicons`: with `linkFavicons` on and `block.linkFavicons = { "b.example": "data:image/png;base64,AA" }`, the row has exactly one `<img>`, using the data URL.
  - `splits resource runs around other blocks`: item, paragraph, item renders as two `ul[data-resources]` with the paragraph between them.
  - `lays out the title as the link when the description has links`: no `<a>` inside another `<a>`, and both hrefs are present.
  - `renders toggleable resources inside the toggle`.
  - `uses components.resources`: a custom component gets `items.length === 2`.
  - `uses a custom components.link for the row`: a custom link component receives the row's `link.href`.
  - `leaves pages without a Resources heading unchanged`: same HTML as before, for a page with a bulleted list.
- [ ] **Step 2: Run** `pnpm --filter notionic exec vitest run src/renderer.test.tsx`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement**:
  - `NotionRenderer` sets `context.resources = collectResources(blocks, { resources, footnotes }) ?? undefined`.
  - `BlockList` passes `context.resources` to `groupBlocks`, and renders a `"resources"` group with `context.components.resources ?? Resources`.
  - Row layout in `Resources`:
    - `<ul data-resources className="flex flex-col">`, and each `<li>` has a `min-h-10 flex items-center` link.
    - Link contents: the favicon (16px), the title in `text-foreground`, then the description in `text-muted-foreground` with ` - ` before it. Title and description sit in one `min-w-0 truncate` span.
    - A visible `focus-visible` ring with `ring`, and a hover color.
    - Favicon order: `context.linkFavicons?.get(host)` when it's a string, then `preview.favicon`, then `LinkFavicon`'s globe (`favicon={null}`).
    - The title is rendered from the item's text without its link (pass copies with `href: null`), so it draws no nested link or inline favicon.
  - Row link: `context.components.link` when it isn't the built-in `NotionLink`, else an `<a>` with `resolveLink`'s target and rel and the row classes. When the description has its own links, only the title is the link, and the description follows as `<RichText>`, still truncated on one line.
- [ ] **Step 4: Run** `pnpm --filter notionic exec vitest run`. Expected: all tests PASS, including `theme-tokens.test.ts`.
- [ ] **Step 5: Commit** `feat: render resources`.

### Task 5: Markdown

**Files:**
- Modify: `src/markdown.ts`
- Test: `src/markdown.test.ts`

**Interfaces:**
- Consumes: `collectResources` (Task 2).
- Produces: `MarkdownOptions.resources?: ResourcesOptions`.

- [ ] **Step 1: Write the failing tests**:
  - `writes resources as the list items they are`: the output contains `- [font-smooth](https://developer.mozilla.org/x) - MDN`.
  - `adds the fetched description when none was written`: an item with only a link and `resourcePreview.description: "From the site"` gives `- [a](URL) - From the site`.
  - `leaves the heading as a heading`: `## Resources`.
- [ ] **Step 2: Run** `pnpm --filter notionic exec vitest run src/markdown.test.ts`. Expected: the second test FAILS.
- [ ] **Step 3: Implement**: `blocksToMarkdown` computes `collectResources(blocks, { resources: options.resources, footnotes: options.footnotes })`, and `listItems` appends ` - ${preview.description}` to a resource item whose `description` is null and whose preview has one. Document `resources` on `MarkdownOptions`.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat: resources in the Markdown export`.

### Task 6: Docs and browser check

**Files:**
- Modify: `packages/notionic/README.md` (a "Resources" section after "Footnotes", and `resources` in the props and options lists), and `apps/web` sample blocks (if the landing page's sample page lists supported features, add a Resources section to it)

- [ ] **Step 1: Write the README section**, in the style of "Footnotes":
  - The Notion steps.
  - The `resources` option with its default and `[]`.
  - Passing it to `fetchBlocks` and `blocksToMarkdown`.
  - That `bookmarkPreviews: false` turns the fetches off.
  - `components={{ resources: MyResources }}`.
  - That footnotes win on a shared heading.
- [ ] **Step 2: Run** `pnpm typecheck && pnpm test && pnpm build` from the repo root. Expected: all pass, and `biome check` is clean.
- [ ] **Step 3: Browser check.** Start the web app with `preview_start`, on a page with a Resources section (the sample blocks, or the docs page in Notion if the user adds one).
  - Check at 320px and at desktop width: rows truncate with an ellipsis, there's no horizontal scroll, the focus ring shows when tabbing, rows are at least 40px tall, and dark mode works.
  - Take a screenshot to show the user.
- [ ] **Step 4: Commit** `docs: resources`.
