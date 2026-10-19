---
"notionic": patch
---

Heading anchors fade in on hover (150ms) instead of popping in, and toggleable headings grow open and shrink closed with a fade (200ms) in browsers that support `::details-content` and `interpolate-size`; others open instantly as before. Reduced motion keeps only the fade.
