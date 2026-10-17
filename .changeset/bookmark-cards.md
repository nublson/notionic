---
"notionic": minor
---

Bookmarks render as cards with the bookmarked page's title, description, image and favicon, like in Notion. `fetchBlocks` reads them from the page's Open Graph tags and attaches them as `bookmarkPreview`; pass `bookmarkPreviews: false` to make no requests outside Notion. Bookmarks without a preview still render as links.
