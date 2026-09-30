import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { saveCategory, deleteCategory } from "@/lib/actions";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = { title: "ניהול קטגוריות" };

export default async function AdminCategories({ searchParams }) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const sp = await searchParams;
  const db = getDb();
  const cats = db
    .prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM posts p WHERE p.category_id = c.id AND p.published = 1) cnt
       FROM categories c ORDER BY name`
    )
    .all();

  return (
    <div>
      <h1 className="text-2xl font-black text-[#4a3728] mb-5">קטגוריות</h1>
      {sp?.saved && <div className="mb-4 bg-green-50 text-green-700 rounded-lg p-3 text-sm">נשמר ✓</div>}

      <form action={saveCategory} className="bg-white rounded-2xl border border-amber-100 p-4 flex gap-2 max-w-xl mb-6">
        <input name="name" required placeholder="שם קטגוריה חדשה" className="flex-1 rounded-lg border border-amber-200 px-4 py-2 text-sm" />
        <input name="slug" dir="ltr" placeholder="slug (אופציונלי)" className="w-40 rounded-lg border border-amber-200 px-3 py-2 text-sm" />
        <button className="bg-[#c0562f] text-white font-bold px-5 rounded-lg text-sm">הוסף</button>
      </form>

      <div className="bg-white rounded-2xl border border-amber-100 divide-y divide-amber-50 max-w-xl">
        {cats.map((c) => (
          <div key={c.id} className="p-3 flex items-center justify-between gap-3">
            <form action={saveCategory} className="flex items-center gap-2 flex-1">
              <input type="hidden" name="id" value={c.id} />
              <input name="name" defaultValue={c.name} className="flex-1 rounded-lg border border-transparent hover:border-amber-200 focus:border-amber-200 px-2 py-1 text-sm font-medium" />
              <span className="text-xs text-gray-400">{c.cnt} מתכונים</span>
              <button className="text-xs text-[#c0562f] font-bold">שמור</button>
            </form>
            <form action={deleteCategory}>
              <input type="hidden" name="id" value={c.id} />
              <button className="text-xs text-red-500 hover:underline">מחיקה</button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
