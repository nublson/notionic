---
"notionic": minor
---

Favicons on links to other sites: `fetchBlocks(notion, id, { linkFavicons: true })` looks each linked host up once (Google's favicon service, then DuckDuckGo's) and attaches the icons to the blocks as data URLs, and `<NotionRenderer linkFavicons>` shows them before the link text, with a muted globe for a site without one. Both are off by default. Paths, anchors, mailto links and Notion pages get none. `LinkProps` gets `favicon`, which the new `LinkFavicon` component renders; `notionic/fetch` exports `fetchLinkFavicon(host)`.
