---
"notionic": minor
---

Demo embeds take a height: `…/demos/<name>?height=320` makes the demo's frame 320px tall, border included, with the demo centered and no vertical padding, so short frames stay as short as asked. Notion's API doesn't send the size an embed is given in Notion, so the URL carries it. Custom frames get it as the `height` prop (undefined without one); the default frame still fits the demo when there's none.
