import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { deletePage } from "@/lib/actions";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = { title: "ניהול עמודים" };

export default async function AdminPages() {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const rows = getDb().prepare("SELECT * FROM pages ORDER BY title").all();

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-black text-[#4a3728]">עמודים</h1>
        <Link href="/admin/pages/new" className="bg-[#c0562f] hover:bg-[#9c4123] text-white font-bold px-5 py-2 rounded-full text-sm transition">
          + עמוד חדש
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-amber-100 divide-y divide-amber-50 max-w-2xl">
        {rows.map((r) => (
          <div key={r.id} className="p-4 flex items-center justify-between">
            <div>
              <Link href={`/admin/pages/${r.id}`} className="font-bold hover:text-[#c0562f]">{r.title}</Link>
              <span className="text-xs text-gray-400 mr-3" dir="ltr">/page/{r.slug}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${r.published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {r.published ? "מפורסם" : "טיוטה"}
              </span>
              <form action={deletePage}>
                <input type="hidden" name="id" value={r.id} />
                <button className="text-xs text-red-500 hover:underline">מחיקה</button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
