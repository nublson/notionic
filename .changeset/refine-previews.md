---
"notionic": minor
---

Embeds and link previews get preview cards like bookmarks: `fetchBlocks` now fetches the page behind each one and attaches its title, description and image as `bookmarkPreview`. Without a preview, they render as a one-line card with a link icon instead of a bare URL that wraps. `bookmarkPreviews: false` turns all of these requests off.
