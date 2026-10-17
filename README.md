# notionic

Render Notion API blocks as React Server Components, styled with Tailwind CSS and shadcn/ui. See [the package README](packages/notionic/README.md) for usage.

More at https://notionic.dev

## Repository

- `packages/notionic`: the npm package.
- `apps/web`: notionic.dev. Its landing page renders the Notion page in `NOTION_PAGE_ID`, and `/docs` renders the docs database in `NOTION_DOCS_DATA_SOURCE_ID` (both read with `NOTION_TOKEN`; without them the site shows sample blocks and a docs notice). It also serves the shadcn registry at `/r/{name}.json`: the items' source is in `apps/web/registry`, listed in `apps/web/registry.json`, and `pnpm build` builds the JSON into `apps/web/public/r`.

### Instant refresh from Notion

Pages refresh hourly on their own. `POST /api/notion/revalidate` refreshes every page on its next visit, so a Notion edit shows right away:

- **Notion webhook.** On the production integration (`notionic`), add a webhook subscription to `https://notionic.dev/api/notion/revalidate` for page events. Notion first sends a verification token: find it in the Vercel logs (`[notion] Webhook verification token: …`), paste it into the subscription's **Verify** dialog, and set it as `NOTION_WEBHOOK_SECRET` in Vercel. Events are then checked against their `X-Notion-Signature`.
- **By hand.** Set `NOTION_REVALIDATION_SECRET`, then `curl -X POST -H "Authorization: Bearer $SECRET" https://notionic.dev/api/notion/revalidate`.

Previews (dev.notionic.dev) are behind Vercel's login, so webhooks can't reach them; they refresh hourly.

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
2. Open a pull request into `develop`, titled as a [conventional commit](https://www.conventionalcommits.org): `fix: …`, `feat: …`, or `feat!: …` for a breaking change. Once CI passes, squash-merge it. The title becomes the commit, the branch is deleted, and dev.notionic.dev updates.
3. Test on dev.notionic.dev.
4. Release: run the **Release** workflow from the Actions tab.

`main` and `develop` only change through pull requests that pass CI, and the workflows below.

### Changelog: [`auto-changeset.yml`](.github/workflows/auto-changeset.yml)

Each pull request that changes `packages/notionic/src` (not its tests) gets a [changeset](.changeset/README.md) when it lands on `develop`, written by the repository's GitHub App from the PR title:

| PR title | Bump | Changelog line |
| --- | --- | --- |
| `fix: handle empty captions` | patch | Handle empty captions |
| `feat(renderer): render tab blocks` | minor | Render tab blocks |
| `feat!: rename pageHref` | major (minor before 1.0) | Rename pageHref |

Each line links to its PR and commit and credits its author. To write the entry yourself, run `pnpm changeset` in the pull request; the workflow then keeps yours.

### Release: [`release.yml`](.github/workflows/release.yml)

Run by hand. It:

1. Runs `changeset version` on `develop`, which turns the pending changesets into the new version and a [CHANGELOG.md](packages/notionic/CHANGELOG.md) entry, and commits them.
2. Merges `develop` into `main` with a merge commit.
3. Builds, typechecks and tests `main`, then sets the `release/build-validation` status, which Vercel waits for before deploying notionic.dev.
4. Makes sure Vercel deploys that commit to production. Vercel's GitHub integration occasionally misses a push to `main`; if it hasn't reported a `Vercel` status on the release commit within 3 minutes, the workflow triggers a Deploy Hook for `main`. That deployment still waits for `release/build-validation`.
5. Tags a new version (`v0.4.0`) and creates its GitHub release, whose notes are the changelog entry. Separately, it publishes `notionic` to npm with provenance if that version isn't published yet, so a failed npm publish doesn't hold back the GitHub release.

With no pending changesets, a release only ships the site.

The fallback deploy needs a Deploy Hook, set up once:

1. In Vercel, open the `notionic` project → **Settings → Git → Deploy Hooks**, and create a hook named `release` for the branch `main` (or run `vercel deploy-hooks create release --ref main` in a linked checkout).
2. Store its URL as the repository secret `VERCEL_DEPLOY_HOOK_URL`: `gh secret set VERCEL_DEPLOY_HOOK_URL --repo nublson/notionic`, then paste the URL.

Without the secret, a release whose commit Vercel missed fails the **Ensure production deploy** job instead.

npm publishing uses [trusted publishing](https://docs.npmjs.com/trusted-publishers): there's no npm token, npm trusts `release.yml` in this repository.
