import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getDb } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = { title: "לוח בקרה" };

export default async function Dashboard() {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const db = getDb();
  const counts = {
    posts: db.prepare("SELECT COUNT(*) c FROM posts").get().c,
    published: db.prepare("SELECT COUNT(*) c FROM posts WHERE published = 1").get().c,
    categories: db.prepare("SELECT COUNT(*) c FROM categories").get().c,
    pages: db.prepare("SELECT COUNT(*) c FROM pages").get().c,
    comments: db.prepare("SELECT COUNT(*) c FROM comments").get().c,
    pending: db.prepare("SELECT COUNT(*) c FROM comments WHERE approved = 0").get().c,
    views: db.prepare("SELECT COALESCE(SUM(views),0) v FROM posts").get().v,
  };

  const cards = [
    { label: "מתכונים", value: counts.posts, sub: `${counts.published} מפורסמים`, href: "/admin/recipes", icon: "🍳" },
    { label: "קטגוריות", value: counts.categories, href: "/admin/categories", icon: "🏷️" },
    { label: "תגובות ממתינות", value: counts.pending, sub: `${counts.comments} סה"כ`, href: "/admin/comments", icon: "💬" },
    { label: "צפיות", value: counts.views, icon: "👁️" },
    { label: "עמודים", value: counts.pages, href: "/admin/pages", icon: "📄" },
  ];

  const recentComments = db
    .prepare("SELECT c.*, p.title AS post_title, p.slug FROM comments c JOIN posts p ON p.id = c.post_id ORDER BY c.created_at DESC LIMIT 5")
    .all();

  return (
    <div>
      <h1 className="text-2xl font-black text-[#4a3728] mb-6">לוח בקרה</h1>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href || "#"}
            className="bg-white rounded-2xl border border-amber-100 p-4 shadow-sm hover:shadow transition"
          >
            <div className="text-2xl">{c.icon}</div>
            <div className="text-3xl font-black text-[#4a3728] mt-1">{c.value.toLocaleString("he-IL")}</div>
            <div className="text-sm text-gray-500">{c.label}</div>
            {c.sub && <div className="text-xs text-gray-400 mt-1">{c.sub}</div>}
          </Link>
        ))}
      </div>

      <h2 className="font-bold text-[#4a3728] mb-3">תגובות אחרונות</h2>
      <div className="bg-white rounded-2xl border border-amber-100 divide-y divide-amber-50">
        {recentComments.length === 0 && <p className="p-4 text-sm text-gray-400">אין תגובות עדיין.</p>}
        {recentComments.map((c) => (
          <div key={c.id} className="p-4 flex items-center justify-between gap-4 text-sm">
            <div className="min-w-0">
              <span className="font-bold text-[#9c4123]">{c.name}</span>
              <span className="text-gray-400 mx-2">·</span>
              <Link href={`/recipe/${c.slug}`} className="text-gray-500 hover:underline truncate">{c.post_title}</Link>
              <p className="text-gray-600 truncate mt-0.5">{c.body}</p>
            </div>
            <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded-full ${c.approved ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
              {c.approved ? "מאושרת" : "ממתינה"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
