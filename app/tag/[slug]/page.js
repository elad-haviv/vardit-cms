import Link from "next/link";
import { notFound } from "next/navigation";
import RecipeCard from "@/components/RecipeCard";
import Pagination from "@/components/Pagination";
import { decodeSlug } from "@/lib/util";
import { getDb } from "@/lib/db";
import { getPostCategoryLists } from "@/lib/posts.mjs";

export const dynamic = "force-dynamic";

const PER_PAGE = 24;

export async function generateMetadata({ params }) {
  const { slug: rawSlug } = await params;
  const slug = decodeSlug(rawSlug);
  const tag = getDb().prepare("SELECT * FROM tags WHERE slug = ?").get(slug);
  if (!tag) return { title: "תגית לא נמצאה" };
  return {
    title: `מתכונים בתגית #${tag.name}`,
    description: `כל המתכונים בתגית ${tag.name} — ורדית חביב, מתכונים מבית סבתא.`,
    openGraph: { title: `#${tag.name}`, locale: "he_IL" },
  };
}

export default async function TagPage({ params, searchParams }) {
  const { slug: rawSlug } = await params;
  const slug = decodeSlug(rawSlug);
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const db = getDb();
  const tag = db.prepare("SELECT * FROM tags WHERE slug = ?").get(slug);
  if (!tag) notFound();

  const total = db
    .prepare(
      `SELECT COUNT(DISTINCT p.id) c FROM posts p
       JOIN post_tags pt ON pt.post_id = p.id
       WHERE p.published = 1 AND p.deleted_at IS NULL AND pt.tag_id = ?`
    )
    .get(tag.id).c;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const rows = db
    .prepare(
      `SELECT p.* FROM posts p
       JOIN post_tags pt ON pt.post_id = p.id
       WHERE p.published = 1 AND p.deleted_at IS NULL AND pt.tag_id = ?
       GROUP BY p.id ORDER BY p.created_at DESC LIMIT ? OFFSET ?`
    )
    .all(tag.id, PER_PAGE, (page - 1) * PER_PAGE);
  const catMap = getPostCategoryLists(db, rows.map((r) => r.id));

  return (
    <div>
      <nav className="text-sm text-gray-500 mb-3">
        <Link href="/" className="hover:text-[#c0562f]">דף הבית</Link> ›{" "}
        <span className="text-[#9c4123] font-medium">#{tag.name}</span>
      </nav>
      <h1 className="text-3xl font-black text-[#4a3728] mb-2">מתכונים בתגית #{tag.name}</h1>
      <p className="text-gray-500 mb-6">{total} מתכונים</p>

      {rows.length === 0 ? (
        <p className="text-center py-16 text-gray-500">אין מתכונים בתגית זו עדיין.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {rows.map((p) => (
            <RecipeCard key={p.id} post={p} categories={catMap.get(p.id) || []} />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} basePath={`/tag/${slug}`} />
    </div>
  );
}
