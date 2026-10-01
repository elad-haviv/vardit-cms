import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { saveFeature, deleteFeature } from "@/lib/actions";
import { getDb } from "@/lib/db";
import { featureState } from "@/lib/posts.mjs";
import PostSelect from "@/components/admin/PostSelect";

export const dynamic = "force-dynamic";

export const metadata = { title: "מתכונים מודגשים" };

const stateTags = {
  active: { label: "פעיל", cls: "bg-green-100 text-green-700 border-green-200" },
  planned: { label: "מתוכנן", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  expired: { label: "פג", cls: "bg-gray-100 text-gray-500 border-gray-200" },
};

export default async function AdminFeatured({ searchParams }) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const sp = await searchParams;
  const db = getDb();

  const today = new Date().toISOString().slice(0, 10);
  const rows = db
    .prepare(
      `SELECT f.id, f.post_id, f.start_date, f.end_date,
              p.title, p.slug, p.featured_image_url
         FROM features f
         JOIN posts p ON p.id = f.post_id
        ORDER BY f.start_date DESC, f.id DESC`
    )
    .all()
    .map((r) => ({ ...r, state: featureState(r.start_date, r.end_date, today) }));

  // active count for the home page hint
  const activeCount = rows.filter((r) => r.state === "active").length;

  const fmtDate = (d) => (d ? d.slice(0, 10).split("-").reverse().join("/") : "—");

  return (
    <div>
      <h1 className="text-2xl font-black text-[#4a3728] mb-2">מתכונים מודגשים בדף הבית</h1>
      <p className="text-sm text-[#8a7361] mb-5 max-w-2xl">
        קבעו אילו מתכונים יופיעו מודגשים בדף הבית ולאילו תאריכים — למשל מתכונים רלוונטיים לחג הסוכות לשבוע החג.
        מתכון עם חלון פעיל יופיע בקטע המודגשים בדף הבית; מתוכנן יפתח אוטומטית בתאריך, ופג יישאר ברשימה לשימוש חוזר.
        כרגע פעילים: <strong>{activeCount}</strong>
      </p>

      {sp?.saved && <div className="mb-4 bg-green-50 text-green-700 rounded-lg p-3 text-sm">נשמר ✓</div>}
      {sp?.deleted && <div className="mb-4 bg-green-50 text-green-700 rounded-lg p-3 text-sm">נמחק ✓</div>}
      {sp?.error && <div className="mb-4 bg-red-50 text-red-700 rounded-lg p-3 text-sm">יש לבחור מתכון מהרשימה</div>}

      <form action={saveFeature} className="bg-white rounded-2xl border border-amber-100 p-5 mb-6 space-y-4 max-w-2xl">
        <div>
          <label className="block text-sm font-bold mb-1">מתכון</label>
          <PostSelect name="post_id" />
        </div>
        <div className="grid grid-cols-2 gap-4 max-w-sm">
          <div>
            <label className="block text-sm font-bold mb-1">מתאריך</label>
            <input type="date" name="start_date" className="w-full rounded-lg border border-amber-200 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1">עד תאריך</label>
            <input type="date" name="end_date" className="w-full rounded-lg border border-amber-200 px-3 py-2 text-sm" />
          </div>
        </div>
        <p className="text-xs text-gray-400">השאירו תאריכים ריקים כדי להדגיש לצמיתות (ללא חלון זמן)</p>
        <button className="bg-[#c0562f] hover:bg-[#9c4123] text-white font-bold px-6 py-2.5 rounded-full text-sm transition">
          הוספה למודגשים
        </button>
      </form>

      <div className="space-y-3 max-w-3xl">
        {rows.length === 0 && <p className="text-sm text-gray-500">אין מתכונים מודגשים עדיין</p>}
        {rows.map((r) => {
          const tag = stateTags[r.state];
          return (
            <div
              key={r.id}
              className={`bg-white rounded-2xl border p-4 flex items-center gap-4 ${
                r.state === "active" ? "border-green-300 shadow-sm" : "border-amber-100"
              }`}
            >
              {r.featured_image_url ? (
                <img src={r.featured_image_url} alt="" className="w-14 h-14 rounded-lg object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-amber-50 border border-amber-100" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={`/recipe/${r.slug}`} className="font-bold text-[#4a3728] hover:text-[#c0562f] truncate">
                    {r.title}
                  </Link>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${tag.cls}`}>{tag.label}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {fmtDate(r.start_date)} ← {fmtDate(r.end_date)}
                  {r.state === "active" && <span className="text-green-600 font-medium"> · מוצג כעת בדף הבית</span>}
                </p>
              </div>
              <form action={deleteFeature} className="shrink-0">
                <input type="hidden" name="id" value={r.id} />
                <button
                  className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition"
                  title="מחיקה מהרשימה"
                  aria-label="מחיקה מהרשימה"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14" />
                  </svg>
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
