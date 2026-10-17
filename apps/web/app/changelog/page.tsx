import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import Link from "next/link";
import Markdown, { type Components } from "react-markdown";

export const metadata: Metadata = {
  title: "Changelog",
  alternates: { canonical: "/changelog" },
  description: "What changed in each notionic release.",
};

// Written by `changeset version`. Next runs from apps/web, so this is read from
// the repo root at build time and the page is prerendered with its contents.
const changelogPath = path.join(process.cwd(), "../../packages/notionic/CHANGELOG.md");

/** The plain text of a heading, e.g. "0.1.0", used as its id so /changelog#0.1.0 works. */
function textOf(node: { children?: unknown[] } | undefined): string {
  return (node?.children ?? [])
    .map((child) => {
      const c = child as { type: string; value?: string; children?: unknown[] };
      return c.type === "text" ? (c.value ?? "") : textOf(c);
    })
    .join("");
}

const components: Components = {
  h2({ node, children }) {
    const id = textOf(node).trim();
    return (
      <h2
        id={id}
        className="mt-12 scroll-mt-16 border-b pb-2 text-2xl font-semibold tracking-tight first:mt-0"
      >
        <a href={`#${id}`} className="hover:underline">
          {children}
        </a>
      </h2>
    );
  },
  h3: ({ node, ...props }) => <h3 className="mt-6 text-lg font-semibold" {...props} />,
  p: ({ node, ...props }) => <p className="mt-3 leading-7" {...props} />,
  ul: ({ node, ...props }) => <ul className="mt-3 list-disc space-y-2 pl-6" {...props} />,
  ol: ({ node, ...props }) => <ol className="mt-3 list-decimal space-y-2 pl-6" {...props} />,
  li: ({ node, ...props }) => <li className="leading-7 [&>p]:mt-0" {...props} />,
  a: ({ node, ...props }) => (
    <a className="font-medium underline underline-offset-4 hover:text-primary" {...props} />
  ),
  code: ({ node, ...props }) => (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm" {...props} />
  ),
};

export default async function ChangelogPage() {
  const changelog = await readFile(changelogPath, "utf8");
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← notionic
      </Link>
      <h1 className="mt-4 text-4xl font-bold tracking-tight">Changelog</h1>
      <p className="mt-2 text-muted-foreground">What changed in each notionic release.</p>
      {/* The file's own "# notionic" title is replaced by the page heading above. */}
      <article className="mt-10">
        <Markdown components={components} disallowedElements={["h1"]}>
          {changelog}
        </Markdown>
      </article>
    </main>
  );
}
