import { notFound } from "next/navigation";
import { decodeSlug } from "@/lib/util";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug: rawSlug } = await params;
  const slug = decodeSlug(rawSlug);
  const page = getDb().prepare("SELECT * FROM pages WHERE slug = ? AND published = 1").get(slug);
  if (!page) return { title: "עמוד לא נמצא" };
  return {
    title: page.title,
    description: `עמוד ${page.title} — ורדית חביב, מתכונים מבית סבתא`,
    openGraph: { title: page.title, locale: "he_IL" },
  };
}

export default async function StaticPage({ params }) {
  const { slug: rawSlug } = await params;
  const slug = decodeSlug(rawSlug);
  const page = getDb().prepare("SELECT * FROM pages WHERE slug = ? AND published = 1").get(slug);
  if (!page) notFound();
  return (
    <article className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-black text-[#4a3728] mb-6">{page.title}</h1>
      <div className="prose-recipe text-[#4a3728]" dangerouslySetInnerHTML={{ __html: page.html }} />
    </article>
  );
}
