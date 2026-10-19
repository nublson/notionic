"use client";

import { SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { type SearchEntry, search } from "@/lib/search";

/** Whether a key press happened while typing somewhere, where "/" means a slash. */
function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

/** Docs search: a ⌘K dialog over /docs/search.json, loaded on first open. */
export function DocsSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<SearchEntry[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        (event.key === "k" && (event.metaKey || event.ctrlKey)) ||
        (event.key === "/" && !isTyping(event.target))
      ) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open || entries) return;
    fetch("/docs/search.json")
      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
      .then((data: SearchEntry[]) => setEntries(data))
      .catch(() => setFailed(true));
  }, [open, entries]);

  const results = useMemo(() => (entries ? search(entries, query) : []), [entries, query]);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative flex items-center gap-2 rounded-sm text-muted-foreground transition-colors after:absolute after:-inset-2 after:content-[''] hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <SearchIcon aria-hidden="true" className="size-3.5" />
        <span className="sr-only sm:not-sr-only">Search</span>
        <kbd className="hidden font-sans text-xs sm:inline">⌘K</kbd>
      </button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search docs"
        description="Search the notionic docs"
      >
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search the docs…" value={query} onValueChange={setQuery} />
          <CommandList>
            {query.trim() ? (
              <CommandEmpty>
                {failed
                  ? "Search isn't available right now."
                  : entries
                    ? "No results."
                    : "Loading…"}
              </CommandEmpty>
            ) : null}
            {results.length > 0 ? (
              <CommandGroup heading="Docs">
                {results.map((result) => (
                  <CommandItem
                    key={result.href}
                    value={result.href}
                    onSelect={() => go(result.href)}
                    className="flex flex-col items-start gap-0.5"
                  >
                    <span className="text-sm font-medium">
                      {result.entry.title}
                      {result.entry.heading ? (
                        <span className="text-muted-foreground">
                          {" "}
                          › {result.entry.heading.text}
                        </span>
                      ) : null}
                    </span>
                    {result.snippet ? (
                      <span className="line-clamp-2 text-xs text-muted-foreground">
                        {result.snippet}
                      </span>
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
