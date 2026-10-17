---
"notionic": minor
---

Add `transformFileUrl` to `NotionRenderer`, which rewrites the URLs of files uploaded to Notion (images, videos, files, PDFs, audio and callout icons), so they can point at a route that re-signs them before Notion's one-hour expiry. `resolveFileUrl` applies it in custom components.
