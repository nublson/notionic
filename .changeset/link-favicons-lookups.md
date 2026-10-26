---
"notionic": patch
---

Link favicons:
- **No icon vs. not looked up.** A site without a favicon is now recorded as `null` and shows a globe. A site that wasn't looked up shows nothing, so `<NotionRenderer linkFavicons>` alone no longer puts a globe on every link.
- **Outages aren't cached.** A host the favicon services couldn't answer for (a timeout, a 5xx, a rate limit) is left out, so it isn't cached as "no icon" and the next fetch asks again.
- **Subdomains fall back to their parent domain.** `you.substack.com` gets Substack's icon.
- **Private hosts are never sent** to the favicon services.
