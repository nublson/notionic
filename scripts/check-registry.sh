#!/usr/bin/env bash
# Installs every item in notionic's shadcn registry into a fresh shadcn app,
# renders the test page with all of them, then typechecks and builds the app.
#
# Usage: bash scripts/check-registry.sh [--skip-build]
#   --skip-build  reuse an existing workspace build (packages/notionic/dist
#                 and apps/web/public/r) instead of running `pnpm turbo run build`.
# Set KEEP_APP=1 to keep the temp app for inspection.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
registry_out="$root/apps/web/public/r"

if [[ "${1:-}" != "--skip-build" ]]; then
  echo "==> Building the workspace"
  (cd "$root" && pnpm turbo run build)
fi

work="$(mktemp -d)"
if [[ -z "${KEEP_APP:-}" ]]; then
  trap 'rm -rf "$work"' EXIT
fi
echo "==> Working in $work"

echo "==> Packing notionic"
(cd "$root/packages/notionic" && npm pack --silent --pack-destination "$work" >/dev/null)
tarball="$(ls "$work"/notionic-*.tgz)"

echo "==> Creating a fresh shadcn app"
(cd "$work" && npx -y shadcn@latest init -d -n app --no-monorepo)
app="$work/app"

# The items depend on `notionic`, which `shadcn add` would fetch from npm.
# Install the local build first so the add uses it.
echo "==> Installing $tarball"
(cd "$app" && npm install --no-audit --no-fund "$tarball")

# Every item listed in registry.json, so new items are covered automatically.
items=()
while IFS= read -r name; do
  items+=("$registry_out/$name.json")
done < <(node -e '
  const { items } = require(process.argv[1]);
  for (const item of items) console.log(item.name);
' "$root/apps/web/registry.json")

echo "==> Adding ${#items[@]} registry items"
(cd "$app" && npx -y shadcn@latest add "${items[@]}" -y)

echo "==> Writing the test page"
printf '\n@import "notionic/styles.css";\n' >>"$app/app/globals.css"
cp "$root/packages/notionic/src/fixtures/test-page.json" "$app/app/test-page.json"
cat >"$app/app/page.tsx" <<'EOF'
import { NotionRenderer, type NotionBlock } from "notionic"

import { NotionCallout } from "@/components/notion-callout"
import { NotionCode } from "@/components/notion-code"
import {
  NotionEquation,
  NotionInlineEquation,
} from "@/components/notion-equation"
import { withMermaid } from "@/components/notion-mermaid"
import { NotionTable } from "@/components/notion-table"
import { NotionTabs } from "@/components/notion-tabs"
import { NotionToggle } from "@/components/notion-toggle"

import blocks from "./test-page.json"

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <NotionRenderer
        blocks={blocks as unknown as NotionBlock[]}
        components={{
          code: withMermaid(NotionCode),
          callout: NotionCallout,
          table: NotionTable,
          toggle: NotionToggle,
          tab: NotionTabs,
          equation: NotionEquation,
          inline_equation: NotionInlineEquation,
        }}
      />
    </main>
  )
}
EOF

echo "==> Typechecking"
(cd "$app" && npx tsc --noEmit)

echo "==> Building"
(cd "$app" && NEXT_TELEMETRY_DISABLED=1 npm run build)

echo "==> All ${#items[@]} registry items install and build"
