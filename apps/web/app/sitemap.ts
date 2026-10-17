import type { MetadataRoute } from "next";
import { getDocs } from "@/lib/docs";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const docs = await getDocs();
  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    ...docs.map((doc) => ({
      url: `${SITE_URL}/docs/${doc.slug}`,
      lastModified: doc.lastEdited,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    { url: `${SITE_URL}/changelog`, changeFrequency: "weekly", priority: 0.5 },
  ];
}
