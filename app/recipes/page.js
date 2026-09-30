import Link from "next/link";
import RecipeCard from "@/components/RecipeCard";
import Pagination from "@/components/Pagination";
import { getDb, getActiveAd } from "@/lib/db";

export const dynamic = "force-dynamic";

const PER_PAGE = 24;

export const metadata = {
  title: "כל המתכונים",
  description: "כל המתכונים של ורדית חביב — מטבח תוניסאי-יהודי אותנטי, מדור לדור.",
};

export default async function RecipesPage({ searchParams }) {
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const page = Math.max(1, Number(sp.page) || 1);

  const db = getDb();
  const where = q ? "WHERE p.published = 1 AND (p.title LIKE ? OR p.excerpt LIKE ?)" : "WHERE p.published = 1";
  const like = `%${q}%`;
  const params = q ? [like, like] : [];

  const total = db.prepare(`SELECT COUNT(*) c FROM posts p ${where}`).get(...params).c;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const rows = db
    .prepare(
      `SELECT p.*, c.name AS category_name FROM posts p
       LEFT JOIN categories c ON c.id = p.category_id
       ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`
    )
    .all(...params, PER_PAGE, (page - 1) * PER_PAGE);

  const ad = getActiveAd("between_cards");

  return (
    <div>
      <h1 className="text-3xl font-black text-[#4a3728] mb-2">כל המתכונים</h1>
      <p className="text-gray-500 mb-6">{total} מתכונים באתר</p>

      <form method="get" action="/recipes" className="flex gap-2 mb-6 max-w-lg">
        <input
          name="q"
          defaultValue={q}
          type="search"
          placeholder="חיפוש מתכון לפי שם..."
          className="flex-1 rounded-full border border-amber-200 bg-white px-5 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#c0562f]/40"
        />
        <button className="bg-[#c0562f] hover:bg-[#9c4123] text-white font-bold px-6 py-2.5 rounded-full transition">
          חיפוש
        </button>
      </form>

      {rows.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <div className="text-5xl mb-4">🔍</div>
          לא נמצאו מתכונים{q ? ` עבור "${q}"` : ""}.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {rows.map((p, i) => (
            <div key={p.id} className="contents">
              <RecipeCard post={p} categoryName={p.category_name} />
              {ad && (i + 1) % 8 === 0 && i !== rows.length - 1 && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <div className="ad-slot bg-white rounded-xl border border-amber-100 p-2" dangerouslySetInnerHTML={{ __html: ad.html }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        basePath="/recipes"
        query={q ? `q=${encodeURIComponent(q)}` : ""}
      />
    </div>
  );
}
