import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { restorePostAction, permanentDeletePostAction } from "@/lib/actions";
import { getDb } from "@/lib/db";
import ConfirmSubmit from "@/components/admin/ConfirmSubmit";

export const dynamic = "force-dynamic";

export const metadata = { title: "סל מחזור" };

function fmtTrashedAt(ts) {
  if (!ts) return "";
  try {
    return new Date(Number(ts)).toLocaleString("he-IL");
  } catch {
    return "";
  }
}

export default async function AdminTrash({ searchParams }) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const sp = await searchParams;
  const rows = getDb()
    .prepare("SELECT id, title, slug, deleted_at FROM posts WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC")
    .all();

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-black text-[#4a3728]">סל מחזור ({rows.length})</h1>
        <Link href="/admin/recipes" className="text-sm text-gray-500 hover:text-[#c0562f]">← חזרה לרשימה</Link>
      </div>

      {sp?.restored && <div className="mb-4 bg-green-50 text-green-700 rounded-lg p-3 text-sm">שוחזר בהצלחה ✓</div>}
      {sp?.deleted && <div className="mb-4 bg-green-50 text-green-700 rounded-lg p-3 text-sm">נמחק לצמיתות</div>}

      {rows.length === 0 ? (
        <p className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-amber-100">סל המחזור ריק.</p>
      ) : (
        <div className="bg-white rounded-2xl border border-amber-100 divide-y divide-amber-50">
          {rows.map((r) => (
            <div key={r.id} className="p-4 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <Link href={`/admin/recipes/${r.id}`} className="font-bold hover:text-[#c0562f]">{r.title}</Link>
                <span className="text-xs text-gray-400 mr-3" dir="ltr">/recipe/{r.slug}</span>
                <span className="block text-xs text-gray-400 mt-0.5">נמחק: {fmtTrashedAt(r.deleted_at)}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <form action={restorePostAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <button className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2 rounded-full transition">
                    שחזור
                  </button>
                </form>
                <ConfirmSubmit
                  action={permanentDeletePostAction}
                  message={`למחוק את "${r.title}" לצמיתות? הפעולה אינה ניתנת לביטול — יימחקו גם כל התגובות, הקטגוריות, התגיות והגרסאות של המתכון.`}
                  label="מחיקה לצמיתות"
                  hidden={[{ name: "id", value: r.id }]}
                  className="bg-red-50 text-red-600 border border-red-200 text-xs font-bold px-4 py-2 rounded-full hover:bg-red-100 transition"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
