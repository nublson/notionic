# notionic

Render Notion API blocks as React Server Components, styled with Tailwind CSS and shadcn/ui. See [the package README](packages/notionic/README.md) for usage.

More at https://notionic.dev

## Repository

- `packages/notionic`: the npm package.
- `apps/web`: notionic.dev. Renders sample blocks, or a real page when `NOTION_TOKEN` and `NOTION_PAGE_ID` are set. It also serves the shadcn registry at `/r/{name}.json`: the items' source is in `apps/web/registry`, listed in `apps/web/registry.json`, and `pnpm build` builds the JSON into `apps/web/public/r`.

## Develop

```bash
pnpm install
pnpm dev        # the web app on http://localhost:3000, rebuilding the package on change
pnpm test
pnpm typecheck
pnpm build
```
