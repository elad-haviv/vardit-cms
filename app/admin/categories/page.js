import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { saveCategory, deleteCategory } from "@/lib/actions";
import { getDb } from "@/lib/db";
import CategoryRow from "@/components/admin/CategoryRow";

export const dynamic = "force-dynamic";

export const metadata = { title: "ניהול קטגוריות" };

export default async function AdminCategories({ searchParams }) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const sp = await searchParams;
  const db = getDb();
  const cats = db
    .prepare(
      `SELECT c.*, (SELECT COUNT(DISTINCT p.id) FROM posts p
                    JOIN post_categories pc ON pc.post_id = p.id AND pc.category_id = c.id
                    WHERE p.published = 1 AND p.deleted_at IS NULL) cnt
       FROM categories c ORDER BY name`
    )
    .all()
    .map((c) => ({ id: c.id, name: c.name, slug: c.slug, description: c.description, image_url: c.image_url, cnt: c.cnt }));

  return (
    <div>
      <h1 className="text-2xl font-black text-[#4a3728] mb-5">קטגוריות</h1>
      {sp?.saved && <div className="mb-4 bg-green-50 text-green-700 rounded-lg p-3 text-sm">נשמר ✓</div>}

      <form action={saveCategory} className="bg-white rounded-2xl border border-amber-100 p-4 flex gap-2 max-w-xl mb-6">
        <input name="name" required placeholder="שם קטגוריה חדשה" className="flex-1 rounded-lg border border-amber-200 px-4 py-2 text-sm" />
        <input name="slug" dir="ltr" placeholder="slug (אופציונלי)" className="w-40 rounded-lg border border-amber-200 px-3 py-2 text-sm" />
        <button className="bg-[#c0562f] text-white font-bold px-5 rounded-lg text-sm">הוסף</button>
      </form>

      <div className="space-y-3 max-w-2xl">
        {cats.map((c) => (
          <div key={c.id} className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <CategoryRow category={c} saveCategory={saveCategory} />
            </div>
            <form action={deleteCategory} className="pt-4 shrink-0">
              <input type="hidden" name="id" value={c.id} />
              <button className="text-xs text-red-500 hover:underline">מחיקה</button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
