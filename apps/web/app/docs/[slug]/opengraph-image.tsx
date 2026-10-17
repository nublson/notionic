import { getDocs } from "@/lib/docs";
import { OG_SIZE, ogImage } from "@/lib/og";

export const alt = "notionic docs";
export const size = OG_SIZE;
export const contentType = "image/png";
export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getDocs()).map((doc) => ({ slug: doc.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = (await getDocs()).find((d) => d.slug === slug);
  return ogImage({
    eyebrow: doc ? `Docs · ${doc.section}` : "Docs",
    title: doc?.title ?? "notionic docs",
    description: doc?.description,
    path: `/docs/${slug}`,
  });
}
