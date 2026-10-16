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

## Workflow

| Branch | Deploys to |
| --- | --- |
| `main` | Production, https://notionic.dev |
| `develop` | Preview, https://dev.notionic.dev |
| feature branches | A Vercel preview URL per pull request |

1. Branch from `develop`:
   ```bash
   git switch develop && git pull && git switch -c my-feature
   ```
2. Open a pull request into `develop`. Once CI passes, squash-merge it. The branch is deleted, and dev.notionic.dev updates.
3. Test on dev.notionic.dev.
4. To release, open a pull request from `develop` into `main` and merge it with a merge commit, so the two branches don't diverge. notionic.dev updates.

`main` and `develop` only change through pull requests that pass CI.
