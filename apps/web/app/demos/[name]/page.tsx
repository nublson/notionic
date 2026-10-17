import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { demos } from "@/lib/demos";

// The demo alone, for Notion to show inside an embed while you write.
export const metadata: Metadata = { robots: { index: false } };

export default async function DemoPage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { name } = await params;
  const Demo = Object.hasOwn(demos, name) ? demos[name] : undefined;
  if (!Demo) notFound();
  const query = Object.fromEntries(
    Object.entries(await searchParams).flatMap(([key, value]) =>
      typeof value === "string" ? [[key, value]] : [],
    ),
  );
  return (
    <main className="grid min-h-svh place-items-center p-6">
      <Demo name={name} params={query} />
    </main>
  );
}
