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

// The index, fetched once per page load and shared by every open. Starts on
// the first sign of intent (hovering or focusing the button, or the
// shortcut), so it's usually ready by the time the dialog is.
let indexRequest: Promise<SearchEntry[]> | null = null;

function loadIndex() {
  indexRequest ??= fetch("/docs/search.json").then((response) =>
    response.ok ? response.json() : Promise.reject(response.status),
  );
  // A failed request can be tried again on the next open.
  indexRequest.catch(() => {
    indexRequest = null;
  });
  return indexRequest;
}

/** Docs search: a ⌘K dialog over /docs/search.json, loaded on first intent. */
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
    setFailed(false);
    let cancelled = false;
    loadIndex()
      .then((data) => {
        if (!cancelled) setEntries(data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
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
        onPointerEnter={loadIndex}
        onFocus={loadIndex}
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
                    ? `No results for “${query.trim()}”.`
                    : "Loading…"}
              </CommandEmpty>
            ) : null}
            {results.length > 0 ? (
              <CommandGroup>
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
