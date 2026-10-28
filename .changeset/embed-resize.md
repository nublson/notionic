---
"notionic": minor
---

Live embeds resize to the height their page reports via `notionic:resize`: a framed page that posts `{ type: "notionic:resize", height }` to its parent gets a frame that many pixels tall (rounded, up to 9999). A message counts only from one of the renderer's live frames and from an origin `embeds` allows (with a function policy, the frame's own origin). `?height=`, or 16:9, is the starting size. A page with live embeds ships a small client listener for this; pages without ship nothing new.
