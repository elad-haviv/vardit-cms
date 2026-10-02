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
  const cat = getDb().prepare("SELECT * FROM categories WHERE slug = ?").get(slug);
  if (!cat) return { title: "קטגוריה לא נמצאה" };
  return {
    title: `מתכונים בקטגוריית ${cat.name}`,
    description: cat.description || `כל המתכונים בקטגוריית ${cat.name} — ורדית חביב, מתכונים מבית סבתא.`,
    openGraph: { title: cat.name, description: `מתכונים בקטגוריית ${cat.name}`, locale: "he_IL" },
  };
}

export default async function CategoryPage({ params, searchParams }) {
  const { slug: rawSlug } = await params;
  const slug = decodeSlug(rawSlug);
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const db = getDb();
  const cat = db.prepare("SELECT * FROM categories WHERE slug = ?").get(slug);
  if (!cat) notFound();

  const total = db
    .prepare(
      `SELECT COUNT(DISTINCT p.id) c FROM posts p
       JOIN post_categories pc ON pc.post_id = p.id
       WHERE p.published = 1 AND p.deleted_at IS NULL AND pc.category_id = ?`
    )
    .get(cat.id).c;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const rows = db
    .prepare(
      `SELECT p.* FROM posts p
       JOIN post_categories pc ON pc.post_id = p.id
       WHERE p.published = 1 AND p.deleted_at IS NULL AND pc.category_id = ?
       GROUP BY p.id ORDER BY p.created_at DESC LIMIT ? OFFSET ?`
    )
    .all(cat.id, PER_PAGE, (page - 1) * PER_PAGE);
  const catMap = getPostCategoryLists(db, rows.map((r) => r.id));

  return (
    <div>
      <nav className="text-sm text-[var(--ink-soft)] mb-3">
        <Link href="/" className="hover:text-[var(--paprika-deep)]">דף הבית</Link> ›{" "}
        <span className="text-[var(--paprika-deep)] font-medium">{cat.name}</span>
      </nav>

      {/* Enriched category header: image + description */}
      <div className="bg-[var(--card)] rounded-2xl border border-[var(--line)] p-5 mb-6 flex items-start gap-4 flex-wrap">
        {cat.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cat.image_url}
            alt={cat.name}
            className="w-32 aspect-[4/3] object-cover rounded-xl border border-[var(--line)] bg-[var(--paper-deep)]"
          />
        )}
        <div className="flex-1 min-w-[220px]">
          <h1 className="text-3xl font-display text-[var(--ink-deep)] mb-1">{cat.name}</h1>
          {cat.description && <p className="text-gray-600 leading-relaxed whitespace-pre-line">{cat.description}</p>}
          <p className="text-[var(--ink-soft)] text-sm mt-1">{total} מתכונים בקטגוריה</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-center py-16 text-[var(--ink-soft)]">אין מתכונים בקטגוריה זו עדיין.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {rows.map((p) => (
            <RecipeCard key={p.id} post={p} categories={catMap.get(p.id) || []} />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} basePath={`/category/${slug}`} />
    </div>
  );
}
