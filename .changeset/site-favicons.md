---
"notionic": patch
---

Link favicons now use the icon a site declares for itself first: an SVG, or the smallest PNG of 32px or more, read from its home page, or else its `/favicon.ico`. Google's favicon service and DuckDuckGo's are only the fallback. Their stored copies can be stale or re-encoded; Purl's came back as a white-cornered JPEG. Each hop is checked for private hosts, and a site's own icon is capped at 100 KB.
