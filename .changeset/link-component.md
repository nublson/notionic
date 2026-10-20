---
"notionic": minor
---

Add a `link` key to `components` for links inside text, such as adding a favicon to external links. Its component gets `link`, `children` and `context`; the default is `NotionLink`. `LinkProps` is exported. `notionic/fetch` exports `fetchBookmarkPreview(url)`, to preview any link the way bookmarks are.
