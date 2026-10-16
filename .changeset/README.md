# Changesets

Each file here is one entry for the next release of `notionic`: its bump
(`patch`, `minor`, `major`) and the line that goes into
[CHANGELOG.md](../packages/notionic/CHANGELOG.md).

You usually don't write these. When a pull request that changes
`packages/notionic/src` is squash-merged into `develop`, the Auto Changeset
workflow writes one from its title. To write the changelog entry yourself,
add one in the pull request instead:

```bash
pnpm changeset
```

The Release workflow turns them into a version bump and changelog entries.
