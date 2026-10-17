#!/usr/bin/env bash
# Writes a changeset for each commit in BEFORE..AFTER that changes what ships
# in the notionic package, unless the commit brought its own changeset.
#
# Feature pull requests are squash-merged into develop, so each commit is one
# PR and its subject is the PR's conventional title, e.g.
# `feat(renderer): render tabs (#12)`. The subject becomes the changelog line,
# with the PR, commit and author recorded for @changesets/changelog-github.
#
# Bump: `type!:` → major (minor before 1.0), `feat:` → minor, else patch.
#
# Env: BEFORE, AFTER, REPO (owner/name). GH_TOKEN for author lookups (optional).
# Prints the number of changesets written as `count=N` to $GITHUB_OUTPUT.
set -euo pipefail

PACKAGE=notionic
PACKAGE_JSON=packages/notionic/package.json
# What ships in the package: its source, not its tests.
PATHS=(
  'packages/notionic/src/'
  ':(exclude)packages/notionic/src/*.test.ts'
  ':(exclude)packages/notionic/src/*.test.tsx'
  ':(exclude)packages/notionic/src/test-utils.ts'
  ':(exclude)packages/notionic/src/fixtures/'
)

count=0
output() { [ -n "${GITHUB_OUTPUT:-}" ] && echo "count=$count" >> "$GITHUB_OUTPUT" || true; }

# `before` is all zeros on a branch's first push: nothing to diff against.
if [ "$BEFORE" = "0000000000000000000000000000000000000000" ]; then
  output; exit 0
fi

MAJOR=$(jq -r .version "$PACKAGE_JSON" | cut -d. -f1)

# If $BEFORE is unreachable (history rewritten), fail safe to "nothing changed".
COMMITS=$(git rev-list --reverse --no-merges "$BEFORE..$AFTER" -- "${PATHS[@]}" 2>/dev/null || true)

for SHA in $COMMITS; do
  SUBJECT=$(git log -1 --format=%s "$SHA")

  # The PR wrote its own changeset: keep it as the entry.
  if git diff-tree --no-commit-id --name-only --diff-filter=A -r "$SHA" -- .changeset/ \
    | grep -v '/README.md$' | grep -q '\.md$'; then
    echo "${SHA:0:7}: has its own changeset."
    continue
  fi

  if printf '%s' "$SUBJECT" | grep -qE '^[a-z]+(\([^)]*\))?!:'; then
    BUMP=major
  elif printf '%s' "$SUBJECT" | grep -qE '^feat(\([^)]*\))?:'; then
    BUMP=minor
  else
    BUMP=patch
  fi
  # Before 1.0, a breaking change is a minor bump (0.1.0 → 0.2.0).
  if [ "$BUMP" = major ] && [ "$MAJOR" = 0 ]; then BUMP=minor; fi

  # `feat(scope)!: add tabs (#12)` → PR 12, "Add tabs".
  PR=$(printf '%s' "$SUBJECT" | sed -nE 's/.*\(#([0-9]+)\)$/\1/p')
  DESCRIPTION=$(printf '%s' "$SUBJECT" | sed -E 's/^[a-z]+(\([^)]*\))?!?: *//; s/ *\(#[0-9]+\)$//')
  DESCRIPTION="$(printf '%s' "${DESCRIPTION:0:1}" | tr '[:lower:]' '[:upper:]')${DESCRIPTION:1}"

  AUTHOR=""
  if [ -n "${GH_TOKEN:-}" ]; then
    AUTHOR=$(gh api "repos/${REPO}/commits/${SHA}" --jq '.author.login // ""' 2>/dev/null || true)
  fi

  SLUG=$(printf '%s' "$DESCRIPTION" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '-' | sed 's/^-//; s/-$//' | cut -c1-40)
  FILE=".changeset/${SLUG:-change}-${SHA:0:7}.md"
  {
    printf -- '---\n"%s": %s\n---\n\n' "$PACKAGE" "$BUMP"
    [ -n "$PR" ] && printf 'pr: #%s\n' "$PR"
    printf 'commit: %s\n' "$SHA"
    [ -n "$AUTHOR" ] && printf 'author: @%s\n' "$AUTHOR"
    printf '\n%s\n' "$DESCRIPTION"
  } > "$FILE"
  echo "${SHA:0:7}: $BUMP, $FILE"
  count=$((count + 1))
done

output
