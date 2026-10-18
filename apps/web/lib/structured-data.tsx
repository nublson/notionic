import type { DocSummary } from "@/lib/docs";
import { SITE_AUTHOR, SITE_DESCRIPTION, SITE_URL } from "@/lib/site";

type Thing = Record<string, unknown>;

/** The site's creator, as schema.org sees them; the handle without its "@". */
const author: Thing | undefined = SITE_AUTHOR
  ? {
      "@type": "Person",
      name: SITE_AUTHOR.name.replace(/^@/, ""),
      ...(SITE_AUTHOR.url ? { url: SITE_AUTHOR.url } : {}),
    }
  : undefined;

const website: Thing = {
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: "notionic",
  url: SITE_URL,
};

/** The home page: the site, and the library it documents. */
export const homeStructuredData: Thing = {
  "@context": "https://schema.org",
  "@graph": [
    website,
    {
      "@type": "SoftwareSourceCode",
      name: "notionic",
      description: SITE_DESCRIPTION,
      url: SITE_URL,
      codeRepository: "https://github.com/nublson/notionic",
      programmingLanguage: "TypeScript",
      runtimePlatform: "React",
      license: "https://opensource.org/licenses/MIT",
      ...(author ? { author } : {}),
    },
  ],
};

/** A docs page: the article, and where it sits in the docs. */
export function docStructuredData(doc: DocSummary): Thing {
  const url = `${SITE_URL}/docs/${doc.slug}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TechArticle",
        headline: doc.title,
        ...(doc.description ? { description: doc.description } : {}),
        url,
        dateModified: doc.lastEdited,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        ...(author ? { author } : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Docs", item: `${SITE_URL}/docs` },
          ...(doc.section
            ? [{ "@type": "ListItem", position: 2, name: doc.section, item: `${SITE_URL}/docs` }]
            : []),
          { "@type": "ListItem", position: doc.section ? 3 : 2, name: doc.title, item: url },
        ],
      },
    ],
  };
}

/** A JSON-LD script; "<" is escaped so no value can close the tag. */
export function JsonLd({ data }: { data: Thing }) {
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD has to be inline, and "<" is escaped
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
