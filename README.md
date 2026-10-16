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
2. Open a pull request into `develop`, titled as a [conventional commit](https://www.conventionalcommits.org): `fix: …`, `feat: …`, or `feat!: …` for a breaking change. Once CI passes, squash-merge it. The title becomes the commit, the branch is deleted, and dev.notionic.dev updates.
3. Test on dev.notionic.dev.
4. Release: run the **Release** workflow from the Actions tab.

`main` and `develop` only change through pull requests that pass CI, and the workflows below.

### Versions: [`auto-bump-version.yml`](.github/workflows/auto-bump-version.yml)

When a push to `develop` changes `packages/notionic/src` (not its tests), the package's version is bumped in a commit by the repository's GitHub App (it can push to `develop` and `main` past the rules): `feat!:` is a major bump (minor before 1.0), `feat:` is minor, anything else is a patch. A version you changed yourself in the push is kept.

### Release: [`release.yml`](.github/workflows/release.yml)

Run by hand. It:

1. Merges `develop` into `main` with a merge commit.
2. Builds, typechecks and tests `main`, then sets the `release/build-validation` status, which Vercel waits for before deploying notionic.dev.
3. Publishes `notionic` to npm with provenance if its version isn't published yet, then tags it (`v0.1.0`) and creates a GitHub release with generated notes.

npm publishing uses [trusted publishing](https://docs.npmjs.com/trusted-publishers): there's no npm token, npm trusts `release.yml` in this repository.
