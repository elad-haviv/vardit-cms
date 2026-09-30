import Link from "next/link";
import { notFound } from "next/navigation";
import RecipeCard from "@/components/RecipeCard";
import Pagination from "@/components/Pagination";
import { decodeSlug } from "@/lib/util";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const PER_PAGE = 24;

export async function generateMetadata({ params }) {
  const { slug: rawSlug } = await params;
  const slug = decodeSlug(rawSlug);
  const cat = getDb().prepare("SELECT * FROM categories WHERE slug = ?").get(slug);
  if (!cat) return { title: "קטגוריה לא נמצאה" };
  return {
    title: `מתכונים בקטגוריית ${cat.name}`,
    description: `כל המתכונים בקטגוריית ${cat.name} — ורדית חביב, מתכונים מבית סבתא.`,
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

  const total = db.prepare("SELECT COUNT(*) c FROM posts WHERE published = 1 AND category_id = ?").get(cat.id).c;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const rows = db
    .prepare(
      `SELECT p.*, c.name AS category_name FROM posts p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.published = 1 AND p.category_id = ? ORDER BY p.created_at DESC LIMIT ? OFFSET ?`
    )
    .all(cat.id, PER_PAGE, (page - 1) * PER_PAGE);

  return (
    <div>
      <nav className="text-sm text-gray-500 mb-3">
        <Link href="/" className="hover:text-[#c0562f]">דף הבית</Link> ›{" "}
        <span className="text-[#9c4123] font-medium">{cat.name}</span>
      </nav>
      <h1 className="text-3xl font-black text-[#4a3728] mb-2">{cat.name}</h1>
      <p className="text-gray-500 mb-6">{total} מתכונים בקטגוריה</p>

      {rows.length === 0 ? (
        <p className="text-center py-16 text-gray-500">אין מתכונים בקטגוריה זו עדיין.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {rows.map((p) => (
            <RecipeCard key={p.id} post={p} categoryName={p.category_name} />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} basePath={`/category/${slug}`} />
    </div>
  );
}
