import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { trashPostAction } from "@/lib/actions";
import { getDb } from "@/lib/db";
import { getPostCategoryLists } from "@/lib/posts.mjs";
import { EditIcon, ViewIcon, TrashIcon, iconBtnEdit, iconBtnView, iconBtnTrash, StarIcon } from "@/components/admin/ActionIcons";

export const dynamic = "force-dynamic";

const PER_PAGE = 20;

export const metadata = { title: "ניהול מתכונים" };

export default async function AdminRecipes({ searchParams }) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const page = Math.max(1, Number(sp.page) || 1);
  const db = getDb();

  const where = q ? "WHERE p.deleted_at IS NULL AND p.title LIKE ?" : "WHERE p.deleted_at IS NULL";
  const params = q ? [`%${q}%`] : [];
  const total = db.prepare(`SELECT COUNT(*) c FROM posts p ${where}`).get(...params).c;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const rows = db
    .prepare(
      `SELECT p.id, p.title, p.slug, p.published, p.featured, p.created_at, p.views
       FROM posts p
       ${where} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`
    )
    .all(...params, PER_PAGE, (page - 1) * PER_PAGE);
  const catMap = getPostCategoryLists(db, rows.map((r) => r.id));
  const trashCount = db.prepare("SELECT COUNT(*) c FROM posts WHERE deleted_at IS NOT NULL").get().c;

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h1 className="text-2xl font-black text-[#4a3728]">מתכונים ({total})</h1>
        <div className="flex items-center gap-3">
          {trashCount > 0 && (
            <Link
              href="/admin/recipes/trash"
              className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2 rounded-full font-medium hover:bg-red-100 transition"
            >
              🗑️ סל מחזור ({trashCount})
            </Link>
          )}
          <Link href="/admin/recipes/new" className="bg-[#c0562f] hover:bg-[#9c4123] text-white font-bold px-5 py-2 rounded-full text-sm transition">
            + מתכון חדש
          </Link>
        </div>
      </div>

      {sp?.saved && <div className="mb-4 bg-green-50 text-green-700 rounded-lg p-3 text-sm">נשמר בהצלחה ✓</div>}
      {sp?.trashed && <div className="mb-4 bg-green-50 text-green-700 rounded-lg p-3 text-sm">הועבר לסל מחזור — ניתן לשחזר מסל המחזור</div>}

      <form method="get" className="flex gap-2 mb-4 max-w-md">
        <input name="q" defaultValue={q} placeholder="חיפוש לפי כותרת..." className="flex-1 rounded-lg border border-amber-200 px-4 py-2 text-sm" />
        <button className="bg-white border border-amber-200 rounded-lg px-4 text-sm font-medium">חפש</button>
      </form>

      <div className="bg-white rounded-2xl border border-amber-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-amber-50/60 text-right">
            <tr>
              <th className="p-3 font-bold">כותרת</th>
              <th className="p-3 font-bold">קטגוריות</th>
              <th className="p-3 font-bold">תאריך</th>
              <th className="p-3 font-bold">צפיות</th>
              <th className="p-3 font-bold">סטטוס</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-50">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-amber-50/30">
                <td className="p-3 font-medium">
                  {r.featured ? (
                    <span className="text-[#c0562f] align-middle" title="מומלץ">
                      <StarIcon />
                    </span>
                  ) : null}{" "}
                  <Link href={`/admin/recipes/${r.id}`} className="hover:text-[#c0562f]">{r.title}</Link>
                </td>
                <td className="p-3 text-gray-500">
                  {(catMap.get(r.id) || []).map((c) => c.name).join(", ") || "—"}
                </td>
                <td className="p-3 text-gray-400 text-xs whitespace-nowrap">{(r.created_at || "").slice(0, 10)}</td>
                <td className="p-3 text-gray-500">{r.views}</td>
                <td className="p-3">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${r.published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {r.published ? "מפורסם" : "טיוטה"}
                  </span>
                </td>
                <td className="p-3 whitespace-nowrap">
                  <div className="flex items-center gap-1 justify-start">
                    <Link
                      href={`/admin/recipes/${r.id}`}
                      className={iconBtnEdit}
                      title="עריכה"
                      aria-label={`עריכה: ${r.title}`}
                    >
                      <EditIcon />
                    </Link>
                    <Link
                      href={`/recipe/${r.slug}`}
                      className={iconBtnView}
                      title="צפייה באתר"
                      aria-label={`צפייה: ${r.title}`}
                    >
                      <ViewIcon />
                    </Link>
                    <form action={trashPostAction} className="inline">
                      <input type="hidden" name="id" value={r.id} />
                      <button
                        className={iconBtnTrash}
                        title="העברה לסל מחזור"
                        aria-label={`העברה לסל: ${r.title}`}
                      >
                        <TrashIcon />
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex gap-2 mt-4 justify-center">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => Math.abs(p - page) < 3 || p === 1 || p === totalPages)
            .map((p) => (
              <Link
                key={p}
                href={`/admin/recipes?page=${p}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                className={`px-3 py-1.5 rounded-lg text-sm ${p === page ? "bg-[#c0562f] text-white" : "bg-white border border-amber-200"}`}
              >
                {p}
              </Link>
            ))}
        </div>
      )}
    </div>
  );
}
