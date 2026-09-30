import Link from "next/link";
import { isAuthenticated } from "@/lib/auth";
import { logoutAction } from "@/lib/actions";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }) {
  const authed = await isAuthenticated();
  const pending = getDb().prepare("SELECT COUNT(*) c FROM comments WHERE approved = 0").get().c;

  return (
    <div dir="rtl" className="flex gap-6 items-start">
      {authed && (
        <aside className="w-56 shrink-0 bg-white rounded-2xl border border-amber-100 shadow-sm p-4 sticky top-20">
          <div className="font-black text-[#9c4123] mb-4">פאנל ניהול</div>
          <nav className="space-y-1 text-sm">
            <AdminLink href="/admin">לוח בקרה</AdminLink>
            <AdminLink href="/admin/recipes">מתכונים</AdminLink>
            <AdminLink href="/admin/categories">קטגוריות</AdminLink>
            <AdminLink href="/admin/pages">עמודים</AdminLink>
            <AdminLink href="/admin/comments">
              תגובות {pending > 0 && <span className="bg-red-500 text-white rounded-full px-2 py-0.5 text-xs font-bold">{pending}</span>}
            </AdminLink>
            <AdminLink href="/admin/ads">מודעות</AdminLink>
            <AdminLink href="/admin/settings">הגדרות</AdminLink>
          </nav>
          <div className="mt-4 pt-4 border-t border-amber-100 flex flex-col gap-2">
            <Link href="/" className="text-xs text-gray-500 hover:text-[#c0562f]">← חזרה לאתר</Link>
            <form action={logoutAction}>
              <button className="text-xs text-red-600 hover:underline">התנתקות</button>
            </form>
          </div>
        </aside>
      )}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function AdminLink({ href, children }) {
  return (
    <Link href={href} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-amber-50 font-medium text-[#4a3728] transition">
      {children}
    </Link>
  );
}
