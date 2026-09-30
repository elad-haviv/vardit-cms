import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { savePost } from "@/lib/actions";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EditRecipe({ params }) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const { id } = await params;
  const db = getDb();
  const isNew = id === "new";
  const post = isNew ? null : db.prepare("SELECT * FROM posts WHERE id = ?").get(Number(id));
  if (!isNew && !post) notFound();
  const cats = db.prepare("SELECT id, name FROM categories ORDER BY name").all();

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-black text-[#4a3728]">{isNew ? "מתכון חדש" : `עריכה: ${post.title}`}</h1>
        <Link href="/admin/recipes" className="text-sm text-gray-500 hover:text-[#c0562f]">← חזרה לרשימה</Link>
      </div>

      <form action={savePost} className="bg-white rounded-2xl border border-amber-100 p-6 space-y-4 max-w-3xl">
        <input type="hidden" name="id" value={post?.id || ""} />
        <Field label="כותרת">
          <input name="title" required defaultValue={post?.title || ""} className={inputCls} />
        </Field>
        <Field label="מזהה URL (slug)" hint="מומלץ להשאיר ריק — ייווצר אוטומטית מהכותרת">
          <input name="slug" defaultValue={post?.slug || ""} dir="ltr" className={inputCls} />
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="קטגוריה">
            <select name="category_id" defaultValue={post?.category_id || ""} className={inputCls}>
              <option value="">— ללא —</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="תמונה ראשית (URL)" hint="למשל: https://vardit.co.il/wp-content/uploads/...">
            <input name="featured_image_url" type="url" defaultValue={post?.featured_image_url || ""} dir="ltr" className={inputCls} />
          </Field>
        </div>
        <Field label="תקציר">
          <textarea name="excerpt" rows={2} defaultValue={post?.excerpt || ""} className={inputCls} />
        </Field>
        <Field label="תוכן (HTML)" hint="תוכן המתכון בפורמט HTML חופשי">
          <textarea name="content" rows={18} dir="auto" defaultValue={post?.content || ""} className={`${inputCls} font-mono text-xs`} />
        </Field>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="published" defaultChecked={post ? !!post.published : true} className="w-4 h-4 accent-[#c0562f]" />
            מפורסם
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="featured" defaultChecked={!!post?.featured} className="w-4 h-4 accent-[#c0562f]" />
            מומלץ (מוצג בדף הבית)
          </label>
        </div>
        <div className="flex gap-3 pt-2">
          <button className="bg-[#c0562f] hover:bg-[#9c4123] text-white font-bold px-6 py-2.5 rounded-full text-sm transition">
            שמור
          </button>
          <Link href="/admin/recipes" className="px-6 py-2.5 rounded-full border border-amber-200 text-sm">ביטול</Link>
        </div>
      </form>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-amber-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c0562f]/40";

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-sm font-bold text-[#4a3728] mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1">{hint}</p>}
      {children}
    </div>
  );
}
