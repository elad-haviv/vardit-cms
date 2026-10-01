import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { savePage } from "@/lib/actions";
import { getDb } from "@/lib/db";
import DualEditor from "@/components/admin/DualEditor";

export const dynamic = "force-dynamic";

export default async function EditPage({ params }) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const { id } = await params;
  const isNew = id === "new";
  const page = isNew ? null : getDb().prepare("SELECT * FROM pages WHERE id = ?").get(Number(id));
  if (!isNew && !page) notFound();

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-black text-[#4a3728]">{isNew ? "עמוד חדש" : `עריכה: ${page.title}`}</h1>
        <Link href="/admin/pages" className="text-sm text-gray-500 hover:text-[#c0562f]">← חזרה</Link>
      </div>
      <form action={savePage} className="bg-white rounded-2xl border border-amber-100 p-6 space-y-4">
        <input type="hidden" name="id" value={page?.id || ""} />
        <div>
          <label className="block text-sm font-bold mb-1">כותרת</label>
          <input name="title" required defaultValue={page?.title || ""} className="w-full rounded-lg border border-amber-200 px-4 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">Slug</label>
          <input name="slug" dir="ltr" defaultValue={page?.slug || ""} className="w-full rounded-lg border border-amber-200 px-4 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">תוכן</label>
          <p className="text-xs text-gray-400 mb-1">עורך ויזואלי או עורך HTML — מתחלפים עם סנכרון תוכן מלא; אפשר להוסיף תמונות מהגלריה</p>
          <DualEditor name="html" initialHtml={page?.html || ""} rows={12} />
        </div>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="published" defaultChecked={page ? !!page.published : true} className="w-4 h-4 accent-[#c0562f]" />
          מפורסם
        </label>
        <button className="bg-[#c0562f] hover:bg-[#9c4123] text-white font-bold px-6 py-2.5 rounded-full text-sm transition">שמור</button>
      </form>
    </div>
  );
}
