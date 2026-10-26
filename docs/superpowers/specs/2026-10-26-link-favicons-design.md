# Favicons on links

Links to other sites can show the site's favicon before their text, as Notion does. Off by default at both ends: `fetchBlocks(notion, id, { linkFavicons: true })` fetches the icons, `<NotionRenderer linkFavicons>` shows them.

## Goals

- Icons come with the blocks: fetched once, cached with them by whatever caches `fetchBlocks` (for example `revalidate`), and in the initial HTML with no requests when the page renders.
- No dependencies. The icon bytes are inlined as they come (Google's PNG, DuckDuckGo's ICO), a few KB each, which browsers show either way.
- A site without a favicon still reads as a link to another site: a muted globe.
- Paths on your site, anchors, mailto links and Notion pages never get one, whatever `pageHref` turns them into. notionic has no notion of your site's origin, so a link to your own site by its full URL is a link to another site, as it is for new-tab behavior.
- A link whose text mixes formatting is several items sharing one href; only the first gets the icon.

## Non-goals

- Resizing or converting icons (that would need sharp or an ICO decoder).
- Icons for the URLs of media blocks (a video link, a file card). Only links inside text: block text, captions and table cells.
- Caching inside notionic. As with bookmark previews, it's left to the framework.

## Fetching

`fetchBlocks` collects the hosts of the links in each block's rich text (`externalLinkHost`: an http(s) URL that isn't a Notion page) and looks each up at most once per call, through a map of in-flight lookups shared across the whole tree. `fetchLinkFavicon(host)` asks Google's favicon service (`s2/favicons?domain=…&sz=32`) and, when it has none, DuckDuckGo's (`icons.duckduckgo.com/ip3/<host>.ico`), with a 3 second timeout each and a 512 KB cap, like nublson.com. The bytes' signature decides the type (PNG, ICO, GIF, JPEG, WebP); anything else, such as an HTML error page, counts as no icon from that provider. A provider that fails or times out is skipped; a host neither provider has an icon for gets none.

The icons attach to the block as `linkFavicons`, by host, as data URLs. Hosts without one are left out, and a block with no icons gets no record. Lookups per block run in parallel; blocks are already limited by `concurrency`.

## Rendering

`NotionRenderer` with `linkFavicons` collects the attached icons from every block (`collectLinkFavicons`) into `context.linkFavicons`, a map by host. For each link in text, `RichTextItem` passes the `link` component a `favicon` prop:

- a data URL for a site with an icon;
- `null` for a link to another site whose host has none: the globe;
- `undefined` for links that get none (paths, anchors, mailto, Notion pages), or when favicons are off.

`LinkFavicon` renders that prop, so a custom `link` component can pass it through. The icon is an inline-block square sized from the text (`0.8em`, so it fits headings), on the baseline, with a small gap before the text, hidden from screen readers. The `img` has a muted square behind it (`BROKEN_IMAGE`'s `::before`), so the icon's place is held until it paints and stays if it can't. The globe is a stroke icon in `text-muted-foreground`.

## Tests

- `link-favicons.test.ts`: provider order, ICO kept as ICO, null when both say none, fallback when Google fails, non-image bodies skipped, size cap by length and by header.
- `fetch.test.ts`: icons by host on top-level, nested and caption text; one lookup per host; hosts without an icon left out; Notion pages never looked up; no requests by default.
- `renderer.test.tsx`: nothing by default; icon, globe or nothing per link kind; nested icons found; the `favicon` prop reaches `components.link`.
