import "server-only";

import { blocksToMarkdown } from "notionic/markdown";
import { type DocSummary, getDoc, getDocs, groupBySection } from "./docs";
import { SITE_DESCRIPTION, SITE_URL } from "./site";

/** Absolute links, since Markdown is read off the site. */
function options(docs: DocSummary[]) {
  const paths = new Map(docs.map((doc) => [doc.id, `${SITE_URL}/docs/${doc.slug}`]));
  return {
    pageHref: (pageId: string) => paths.get(pageId) ?? null,
    transformFileUrl: ({ blockId }: { blockId: string }) =>
      `${SITE_URL}/api/notion/file/${blockId}`,
  };
}

/** One doc as Markdown, titled, or null when it doesn't exist. */
export async function docMarkdown(slug: string): Promise<string | null> {
  const [docs, result] = await Promise.all([getDocs(), getDoc(slug)]);
  if (!result) return null;
  const { doc, blocks } = result;
  const body = blocksToMarkdown(blocks, options(docs));
  return (
    [`# ${doc.title}`, doc.description ? `> ${doc.description}` : "", body]
      .filter(Boolean)
      .join("\n\n") + "\n"
  );
}

/** The llms.txt index: every doc, by section, linking to its Markdown. */
export async function llmsIndex(): Promise<string> {
  const docs = await getDocs();
  const sections = groupBySection(docs).map(([section, items]) =>
    [
      `## ${section}`,
      "",
      ...items.map(
        (doc) =>
          `- [${doc.title}](${SITE_URL}/docs/${doc.slug}.md)${doc.description ? `: ${doc.description}` : ""}`,
      ),
    ].join("\n"),
  );
  return (
    [
      "# notionic",
      `> ${SITE_DESCRIPTION}`,
      `All docs in one file: ${SITE_URL}/llms-full.txt`,
      ...sections,
      [
        "## Optional",
        "",
        `- [Changelog](${SITE_URL}/changelog)`,
        `- [Source](https://github.com/nublson/notionic)`,
      ].join("\n"),
    ].join("\n\n") + "\n"
  );
}

/** Every doc in order, as one Markdown file. */
export async function llmsFull(): Promise<string> {
  const docs = await getDocs();
  const pages = [];
  for (const doc of docs) {
    // One at a time, to stay under Notion's rate limit.
    const markdown = await docMarkdown(doc.slug);
    if (markdown) pages.push(markdown.trim());
  }
  return `${pages.join("\n\n---\n\n")}\n`;
}
