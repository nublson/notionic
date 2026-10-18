/** The production site, for canonical URLs, the sitemap and Open Graph images. */
export const SITE_URL = "https://notionic.dev";

export const SITE_DESCRIPTION =
  "Use Notion as your CMS. notionic renders blocks from the official Notion API on the server, styled with Tailwind CSS and shadcn/ui.";

/**
 * Who made the site, credited in the footer: AUTHOR_NAME (e.g. "@nublson"),
 * linking to AUTHOR_URL. Without AUTHOR_NAME, there's no credit.
 */
export const SITE_AUTHOR = process.env.AUTHOR_NAME
  ? { name: process.env.AUTHOR_NAME, url: process.env.AUTHOR_URL || undefined }
  : null;

/** Tags Notion data cached outside the pages (the MCP server's), revalidated with them. */
export const DOCS_CACHE_TAG = "docs";
