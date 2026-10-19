import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { getDocs } from "@/lib/docs";

export const revalidate = 3600;

/** /docs opens the first doc. */
export default async function DocsIndex() {
  const [first] = await getDocs();
  if (first) redirect(`/docs/${first.slug}`);
  return (
    <div className="mx-auto max-w-3xl px-4">
      <SiteHeader />
      <main id="main" className="py-16">
        <h1 className="text-3xl font-semibold tracking-tight">Docs</h1>
        <p className="mt-2 text-muted-foreground">
          The docs come from a Notion database. Set NOTION_TOKEN and NOTION_DOCS_DATA_SOURCE_ID to
          show them.
        </p>
      </main>
    </div>
  );
}
