import Link from "next/link"

import { SITE_NAME } from "@/lib/site"

export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
        <Link
          href="/"
          className="rounded-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {SITE_NAME}
        </Link>
      </div>
    </header>
  )
}
