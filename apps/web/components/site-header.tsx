import Link from "next/link";
import { DocsSearch } from "@/components/docs-search";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_LINK =
  "rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function SiteHeader() {
  return (
    <header className="flex items-center justify-between py-6 text-sm">
      <a
        href="#main"
        className="sr-only rounded-md border border-border bg-background font-medium focus:not-sr-only focus:px-3 focus:py-2 focus:fixed focus:top-4 focus:left-4 focus:z-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Skip to content
      </a>
      <Link
        href="/"
        className="-m-1 rounded-sm p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Logo />
        <span className="sr-only">notionic</span>
      </Link>
      <nav className="flex items-center gap-3.5 sm:gap-5">
        <DocsSearch />
        <Link href="/docs" className={NAV_LINK}>
          Docs
        </Link>
        <Link href="/changelog" className={NAV_LINK}>
          Changelog
        </Link>
        <a href="https://www.npmjs.com/package/notionic" className={`${NAV_LINK} hidden sm:inline`}>
          npm
        </a>
        <a href="https://github.com/nublson/notionic" className={NAV_LINK}>
          GitHub
        </a>
        <ThemeToggle />
      </nav>
    </header>
  );
}
