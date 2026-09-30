import Link from "next/link";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { moderateComment } from "@/lib/actions";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const PER_PAGE = 30;

export const metadata = { title: "ניהול תגובות" };

export default async function AdminComments({ searchParams }) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const db = getDb();
  const total = db.prepare("SELECT COUNT(*) c FROM comments").get().c;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const rows = db
    .prepare(
      `SELECT c.*, p.title AS post_title, p.slug AS post_slug FROM comments c
       JOIN posts p ON p.id = c.post_id
       ORDER BY c.approved ASC, c.created_at DESC LIMIT ? OFFSET ?`
    )
    .all(PER_PAGE, (page - 1) * PER_PAGE);

  return (
    <div>
      <h1 className="text-2xl font-black text-[#4a3728] mb-5">תגובות ({total})</h1>

      <div className="bg-white rounded-2xl border border-amber-100 divide-y divide-amber-50">
        {rows.map((c) => (
          <div key={c.id} className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="min-w-0">
                <span className="font-bold text-[#9c4123] text-sm">{c.name}</span>
                <span className="text-xs text-gray-400 mr-2">{(c.created_at || "").slice(0, 10)}</span>
                <Link href={`/recipe/${c.post_slug}`} className="text-xs text-gray-400 hover:underline block truncate">
                  על: {c.post_title}
                </Link>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!c.approved && (
                  <form action={moderateComment}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="action" value="approve" />
                    <button className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-1.5 rounded-full">אישור</button>
                  </form>
                )}
                <form action={moderateComment}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="action" value="delete" />
                  <button className="bg-red-50 text-red-600 border border-red-200 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-red-100">מחיקה</button>
                </form>
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{c.body}</p>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex gap-2 mt-4 justify-center">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => Math.abs(p - page) < 3 || p === 1 || p === totalPages)
            .map((p) => (
              <Link key={p} href={`/admin/comments?page=${p}`} className={`px-3 py-1.5 rounded-lg text-sm ${p === page ? "bg-[#c0562f] text-white" : "bg-white border border-amber-200"}`}>
                {p}
              </Link>
            ))}
        </div>
      )}
    </div>
  );
}
