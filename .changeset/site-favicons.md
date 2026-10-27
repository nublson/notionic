---
"notionic": patch
---

Link favicons now use the icon a site declares for itself first: an SVG, or the smallest PNG of 32px or more, read from its home page, or else its `/favicon.ico`. Google's favicon service and DuckDuckGo's are only the fallback. Their stored copies can be stale or re-encoded; Purl's came back as a white-cornered JPEG. Each hop is checked for private hosts, and a site's own icon is capped at 100 KB. Image blocks and link favicons get a soft hairline that follows the image's own shape (`--notionic-image-edge`: 25% black, or 25% white in dark mode) instead of a square outline, so a light, dark, round or transparent image keeps an edge without a box around it. Video and embed frames keep the square outline. Fetching also refuses host names that resolve to private addresses (where the runtime has DNS), for bookmark previews and favicons alike.
