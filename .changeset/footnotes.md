---
"notionic": minor
---

Footnotes: links to blocks under a "Footnotes" heading render as numbered superscripts, and the section renders as a footnote list with back-links. Configure the heading names, show a title, or replace the list with the `footnotes` option and `components.footnotes`. `collectHeadings` leaves the footnotes heading out, and `blocksToMarkdown` writes GFM footnotes. A "Footnotes" section nothing links to renders as before; pass `footnotes={{ headings: [] }}` to turn footnotes off.
