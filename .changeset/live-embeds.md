---
"notionic": minor
---

Live embeds: `<NotionRenderer embeds={["codepen.io", "figma.com"]}>` renders embeds of the listed hosts (subdomains included) in a sandboxed iframe with the caption below, instead of a preview card. `embeds` also takes `true` for every embed or a function of the URL. Only http(s) URLs are embedded, demos take precedence, and it's off by default. Exports the `EmbedPolicy` type.
