# Footnotes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render footnotes from a Notion "Footnotes" section: links to its blocks become numbered superscripts, and the section becomes a footnote list linked both ways.

**Architecture:** A pure pre-pass, `collectFootnotes`, finds the section and numbers the references. Its result goes into the render context. `RichText` renders matching links as references, and `NotionRenderer` swaps the section for an overridable `footnotes` component. `collectHeadings` and `blocksToMarkdown` take the same option.

**Tech Stack:** TypeScript, React 19 Server Components, Tailwind v4, Vitest (`renderToHtml` from `src/test-utils.ts`), Biome.

**Spec:** `docs/superpowers/specs/2026-10-24-footnotes-design.md`

## Global Constraints

- No client JavaScript and no new runtime dependencies; no extra Notion requests.
- Option shape: `footnotes?: { headings?: string[]; showTitle?: boolean; title?: string }`. The default `headings` is `["Footnotes"]`, and `[]` turns footnotes off.
- Heading match: ignore case and surrounding whitespace; accents count; first match in reading order wins; only a top-level heading counts.
- The section is the top-level blocks after the marker heading, up to the next top-level heading with a level ≤ the marker's, or the end.
- Ids: `fn-<n>`, `fnref-<n>` (first reference), `fnref-<n>-<k>` (k ≥ 2), `footnotes-label`.
- Theme tokens only (`muted-foreground`, `muted`, `border`, `ring`). New tokens must be added to the README token list (the theme-token test enforces it).
- Every package change gets a changeset (`.changeset/*.md`, `"notionic": minor` for this feature).

## Review Focus

- A link to a footnote block written in Notion's real URL format (unconfirmed): Task 1 pins it with a fixture from the API before anything depends on it.
- A footnote referenced from inside a toggle, column or table cell is numbered in reading order: Task 2 test `numbers references inside nested blocks and table cells`.
- A "Footnotes" heading nested inside a toggle doesn't start a section: Task 2 test `ignores a footnotes heading that is not top-level`.
- Two sections on one page: only the first counts, and the second renders as normal content. Task 2 test `uses the first matching heading`.
- Content after the section (a later H1, for example) still renders, in place: Task 3 test `renders blocks after the section`.

---

### Task 1: Block links

**Files:**
- Modify: `packages/notionic/src/links.ts`
- Test: `packages/notionic/src/links.test.ts`, `packages/notionic/src/fixtures/` (only if the format differs from the expectations below)

**Interfaces:**
- Produces: `linkedBlockId(href: string | null | undefined): string | null`. It returns the block id (32 lowercase hex, no dashes) in a link's `#fragment` when the link points to a Notion page (a `/<id>` path or a notion.so, notion.com or notion.site URL). Otherwise it returns null.

- [ ] **Step 1: Confirm the URL format.** Ask the user to add a "Copy link to block" link to the notionic test page (in Notion, under Testing). Then fetch the page with a throwaway script that prints only that rich-text item's `href`. Never print `NOTION_TOKEN`. Record the format in the test below. If it differs from both cases below, add the real one as a third case.

- [ ] **Step 2: Write the failing tests**

```ts
describe("linkedBlockId", () => {
  const block = "1a2b3c4d5e6f40718293a4b5c6d7e8f9";
  it("reads the block id from a workspace path", () => {
    expect(linkedBlockId(`/3fcb17268ab381d995c6ff3f97dc741b#${block}`)).toBe(block);
  });
  it("reads a dashed block id from a notion.so URL", () => {
    expect(
      linkedBlockId("https://www.notion.so/Title-3fcb17268ab381d995c6ff3f97dc741b#1a2b3c4d-5e6f-4071-8293-a4b5c6d7e8f9"),
    ).toBe(block);
  });
  it("is null without a fragment, for other sites, and for empty links", () => {
    expect(linkedBlockId("/3fcb17268ab381d995c6ff3f97dc741b")).toBeNull();
    expect(linkedBlockId(`https://example.com/page#${block}`)).toBeNull();
    expect(linkedBlockId(null)).toBeNull();
  });
});
```

- [ ] **Step 3: Run** `pnpm --filter notionic exec vitest run src/links.test.ts`. Expected: FAIL, `linkedBlockId` is not exported.
- [ ] **Step 4: Implement `linkedBlockId` in `links.ts`**, reusing `linkedPageId` for the page part and `matchPageId` on the fragment.
- [ ] **Step 5: Run** the same command. Expected: PASS.
- [ ] **Step 6: Commit** `feat: read block ids from Notion block links`.

### Task 2: `collectFootnotes`

**Files:**
- Create: `packages/notionic/src/footnotes.ts`
- Modify: `packages/notionic/src/types.ts` (types below), `packages/notionic/src/index.ts` (export `collectFootnotes` and the types)
- Test: `packages/notionic/src/footnotes.test.ts`

**Interfaces:**
- Consumes: `linkedBlockId` (Task 1), `plainText` from `utils.ts`, `normalizePageId` from `links.ts`.
- Produces, in `types.ts`:

```ts
export type FootnotesOptions = { headings?: string[]; showTitle?: boolean; title?: string };
export type Footnote = {
  block: NotionBlock;
  /** 1-based, by first reference; null when nothing references it. */
  number: number | null;
  /** One id per reference, in reading order: "fnref-1", "fnref-1-2"… */
  refIds: string[];
};
export type PageFootnotes = {
  heading: { blockId: string; level: 1 | 2 | 3 | 4; text: string };
  showTitle: boolean;
  /** title ?? heading.text */
  title: string;
  /** The marker heading and every note block, by normalized id. */
  sectionBlockIds: Set<string>;
  /** Numbered notes by number, then unreferenced notes in page order. Empty note blocks are left out. */
  notes: Footnote[];
  /** Each referencing rich-text item (by object identity) → its footnote number and ref id. */
  refs: Map<object, { number: number; id: string }>;
};
```

- `collectFootnotes(blocks: NotionBlock[], options?: FootnotesOptions): PageFootnotes | null`. It returns null with no matching heading or `headings: []`.
- Rich text walked per block, in this order: `block[block.type].rich_text`, then `.caption`, then `table_row.cells` row by row, then `children`. Blocks in the section are not walked for references, so a link inside a note stays plain text.

- [ ] **Step 1: Write the failing tests** in `footnotes.test.ts`, using `block` and `richText` from `test-utils.ts`. Write a helper `ref(text, noteId)` that makes a rich-text item with `href: "/<pageId>#<noteId>"`:
  - `returns null without a footnotes heading` and `returns null with headings: []`.
  - `numbers notes by first reference`: notes A, B written in that order; the text references B, then A. Expect `notes.map(n => [n.block.id, n.number])` to equal `[[B, 1], [A, 2]]`.
  - `gives a repeated reference its own id`: A is referenced twice. Expect `refIds` to equal `["fnref-1", "fnref-1-2"]`, and each item maps to number 1 in `refs`.
  - `lists unreferenced notes last, without a number`.
  - `numbers references inside nested blocks and table cells`: a reference in a toggle's child comes before one in a later paragraph.
  - `matches headings ignoring case and spaces, not accents`: `headings: ["Referências"]` matches " referências ", and `["Referencias"]` returns null.
  - `ends the section at the next heading of the same or a higher level`: an H3 inside an H2 section stays in the section, and the next H2 ends it.
  - `ignores a footnotes heading that is not top-level` (inside a toggle).
  - `uses the first matching heading`: a second "Footnotes" heading after the section is not part of it.
  - `uses title over the heading text`, and `showTitle` defaults to false.
  - `skips empty note blocks`, and `ignores links inside notes`.
- [ ] **Step 2: Run** `pnpm --filter notionic exec vitest run src/footnotes.test.ts`. Expected: FAIL, the module doesn't exist.
- [ ] **Step 3: Implement** `collectFootnotes`, and export it and the types from `index.ts`.
- [ ] **Step 4: Run** the same command. Expected: PASS. Then run `pnpm --filter notionic exec tsc --noEmit`, which should be clean.
- [ ] **Step 5: Commit** `feat: collect footnotes from a Footnotes section`.

### Task 3: Render references and the footnote list

**Files:**
- Create: `packages/notionic/src/blocks/footnotes.tsx` (default `Footnotes` component, exported from `index.ts`)
- Modify: `packages/notionic/src/types.ts` (`RenderContext.footnotes`, `BlockComponents.footnotes`, `FootnotesProps`), `packages/notionic/src/rich-text.tsx`, `packages/notionic/src/renderer.tsx`, `packages/notionic/src/headings.ts`
- Test: `packages/notionic/src/renderer.test.tsx`

**Interfaces:**
- Consumes: `collectFootnotes`, `PageFootnotes`, `Footnote`, `FootnotesOptions` (Task 2).
- Produces:
  - `RenderContext.footnotes?: PageFootnotes`.
  - `NotionRendererProps.footnotes?: FootnotesOptions`.
  - `BlockComponents.footnotes?: ComponentType<FootnotesProps>`, where `FootnotesProps = { notes: Footnote[]; title: string; showTitle: boolean; level: 1 | 2 | 3 | 4; context: RenderContext }`.
  - `collectHeadings(blocks, options?: { footnotes?: FootnotesOptions })`.

Markup to produce, per the spec:
- **Reference:** the item's text without its link, then `<sup><a href="#fn-N" id="<ref id>" aria-describedby="footnotes-label" class="…">N</a></sup>`. Classes: muted text, `tabular-nums`, a hit area from `relative after:absolute after:-inset-1 after:content-['']`, the focus-visible outline used elsewhere (`focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring`), `scroll-mt-8`, and `target:bg-muted`.
- **List:**
  - `<section data-footnotes aria-labelledby="footnotes-label">`.
  - With `showTitle` false, an `<hr className="border-border">`, then `<hN id="footnotes-label" className="sr-only">title</hN>`. With `showTitle` true, the visible heading styled like `Heading` at `level`, with no `<hr>`. `hN` is the `h2`–`h5` mapping `Heading` uses.
  - Then `<ol>` of numbered notes (`<li id="fn-N" className="scroll-mt-8 target:bg-muted …">`), then a `<ul>` of unreferenced notes when there are any.
  - The list is a step smaller and muted (`text-sm text-muted-foreground`).
  - A note's content is `RichText` for paragraph, bulleted and numbered items, and `<Block>` otherwise.
  - Back-links: one ref gets `↩` with `aria-label="Back to reference N"`. Several refs get `↩` followed by links `a`, `b`… with `aria-label="Back to reference Na"`.

- [ ] **Step 1: Write the failing tests** in `renderer.test.tsx`, with a page fixture of: a paragraph referencing note A twice and note B once, an H2 "Footnotes", notes A and B, and an unreferenced note C.
  - `renders references as numbered superscripts`: matches `/nested<sup><a href="#fn-1" id="fnref-1" aria-describedby="footnotes-label"[^>]*>1<\/a><\/sup>/` and contains `id="fnref-1-2"`.
  - `renders the footnote list with back-links, ordered by number`: `id="fn-1"` comes before `id="fn-2"`. It contains `aria-label="Back to reference 1a"` and `aria-label="Back to reference 1b"`. C appears after the `</ol>`.
  - `hides the marker heading behind a separator by default`: contains `<hr` and `class="sr-only"` with the text "Footnotes", and the text "Footnotes" appears in no visible heading.
  - `shows the title with showTitle, and uses title`: `footnotes={{ showTitle: true, title: "Notes" }}` renders a visible `<h3 id="footnotes-label"…>Notes</h3>` and no `<hr`.
  - `renders blocks after the section`: an H2 "Appendix" after the notes still renders, after the footnotes section.
  - `keeps links to other blocks as links`, and `renders nothing new without a footnotes heading` (output equals the render without the option).
  - `uses components.footnotes`.
  - `leaves the marker out of the table of contents unless showTitle`: a `table_of_contents` block plus the fixture has no "Footnotes" entry by default, and has one linking `#footnotes-label` with `showTitle: true`.
- [ ] **Step 2: Run** `pnpm --filter notionic exec vitest run src/renderer.test.tsx`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement.**
  - **`NotionRenderer`:** calls `collectFootnotes(blocks, footnotes)` and puts it on the context. It renders the top-level blocks before the section, then `context.components.footnotes ?? Footnotes`, then the blocks after.
  - **`RichTextItem`:** looks up `context.footnotes?.refs.get(item)` before the link step, and renders the reference instead of the link.
  - **`collectHeadings`:** skips the marker heading. With `showTitle`, it keeps the marker as `{ id: "footnotes-label", text: title }`.
- [ ] **Step 4: Run** `pnpm --filter notionic test` and `pnpm --filter notionic exec tsc --noEmit`. Expected: all tests PASS, including the theme-token test (add any new token to the README list if it fails).
- [ ] **Step 5: Commit** `feat: render footnotes`.

### Task 4: Markdown footnotes

**Files:**
- Modify: `packages/notionic/src/markdown.ts`
- Test: `packages/notionic/src/markdown.test.ts`

**Interfaces:**
- Consumes: `collectFootnotes`, `PageFootnotes` (Task 2).
- Produces: `MarkdownOptions.footnotes?: FootnotesOptions`.

- [ ] **Step 1: Write the failing test** `writes GFM footnotes`. Use the Task 3 fixture: `blocksToMarkdown(blocks)` contains `nested[^1]` and ends with `"[^1]: Note A\n[^2]: Note B\n\nNote C"`, with no "## Footnotes" line. Also write `leaves Markdown unchanged without a footnotes heading`.
- [ ] **Step 2: Run** `pnpm --filter notionic exec vitest run src/markdown.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - **`inline()`:** writes `text[^N]` for items in `refs`, with no link.
  - **`render`:** at the top level, drops the section and appends the definitions at the end: one `[^N]: <inline note>` per numbered note, then the unreferenced notes as plain paragraphs.
  - **Notes that aren't text** use `block()`, indented by 4 spaces after the `[^N]:` line.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat: footnotes in the Markdown export`.

### Task 5: Docs, changeset and browser check

**Files:**
- Modify: `packages/notionic/README.md` (a "Footnotes" section with the Notion steps and the option; footnotes added to the supported-blocks line)
- Create: `.changeset/footnotes.md` (`"notionic": minor`)
- Create (uncommitted): `apps/web/app/qa/footnotes/page.tsx`, a QA fixture like the other `qa/` pages

- [ ] **Step 1: Build and run the check.** Run `pnpm --filter notionic build`. Open `http://localhost:3100/qa/footnotes` with `preview_start {name: "web"}`.
  - Check at 320px and at desktop width.
  - Clicking a superscript scrolls to the note, which gets the `:target` background. The back-link returns to the right reference, including the second one.
  - Focus rings show when tabbing, in both `showTitle` modes and in dark mode.
  - Send the user screenshots.
- [ ] **Step 2: Run** `pnpm lint`, `pnpm --filter notionic test` and `pnpm typecheck`. Expected: clean; the only infos are the 2 known `useTemplate` ones.
- [ ] **Step 3: Commit** `docs: footnotes`. Then, when the user says so, push `feat/footnotes` and open a PR into `develop`. After it merges, add a Footnotes guide and a supported-blocks row to the Notion docs.
