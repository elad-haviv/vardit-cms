import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { savePost, trashPostAction } from "@/lib/actions";
import { getDb } from "@/lib/db";
import { getPostCategoryLists, getPostTagLists } from "@/lib/posts.mjs";
import CategoryCombobox from "@/components/admin/CategoryCombobox";
import FeaturedImageField from "@/components/admin/FeaturedImageField";
import DualEditor from "@/components/admin/DualEditor";
import TagEditor from "@/components/admin/TagEditor";
import VersionsSection from "@/components/admin/VersionsSection";

export const dynamic = "force-dynamic";

export default async function EditRecipe({ params, searchParams }) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const { id } = await params;
  const sp = await searchParams;
  const db = getDb();
  const isNew = id === "new";
  const post = isNew ? null : db.prepare("SELECT * FROM posts WHERE id = ?").get(Number(id));
  if (!isNew && !post) notFound();
  const cats = db
    .prepare("SELECT id, name FROM categories ORDER BY name")
    .all()
    .map((r) => ({ id: r.id, name: r.name }));
  const existingTags = db.prepare("SELECT name FROM tags ORDER BY name").all().map((r) => r.name);

  const selectedIds = post ? [...(getPostCategoryLists(db, [post.id]).get(post.id) || []).map((c) => c.id)] : [];
  const postTags = post ? (getPostTagLists(db, [post.id]).get(post.id) || []).map((t) => t.name) : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <h1 className="text-2xl font-black text-[#4a3728]">{isNew ? "מתכון חדש" : `עריכה: ${post.title}`}</h1>
        <div className="flex items-center gap-3">
          {post && <Link href={`/recipe/${post.slug}`} className="text-sm text-gray-400 hover:text-[#c0562f]">צפייה באתר</Link>}
          <Link href="/admin/recipes" className="text-sm text-gray-500 hover:text-[#c0562f]">← חזרה לרשימה</Link>
        </div>
      </div>

      {sp?.restored && <div className="mb-4 bg-green-50 text-green-700 rounded-lg p-3 text-sm max-w-3xl">הגרסה שוחזרה בהצלחה ✓ (המצב הקודם נשמר בגרסאות)</div>}

      <form action={savePost} className="bg-white rounded-2xl border border-amber-100 p-6 space-y-4 max-w-3xl">
        <input type="hidden" name="id" value={post?.id || ""} />
        <Field label="כותרת">
          <input name="title" required defaultValue={post?.title || ""} className={inputCls} />
        </Field>
        <Field label="מזהה URL (slug)" hint="מומלץ להשאיר ריק — ייווצר אוטומטית מהכותרת">
          <input name="slug" defaultValue={post?.slug || ""} dir="ltr" className={inputCls} />
        </Field>
        <Field label="קטגוריות" hint="אפשר לבחור יותר מקטגוריה אחת — חיפוש ברשימה או הוספת קטגוריה חדשה במקום">
          <CategoryCombobox name="category_ids" allCategories={cats} selectedIds={selectedIds} />
        </Field>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="תמונה ראשית" hint="בחירה מהגלריה או הזנת כתובת ידנית">
            <FeaturedImageField name="featured_image_url" initialUrl={post?.featured_image_url || ""} />
          </Field>
          <Field label="תקציר" hint="טקסט רב-שורות — מוצג בכרטיסי המתכונים ובתיאור המטא">
            <textarea name="excerpt" rows={4} defaultValue={post?.excerpt || ""} className={inputCls} />
          </Field>
        </div>
        <Field label="תוכן" hint="עורך ויזואלי או עורך HTML — מתחלפים עם סנכרון תוכן מלא; אפשר להוסיף תמונות מהגלריה">
          <DualEditor name="content" initialHtml={post?.content || ""} rows={18} />
        </Field>
        <Field label="תגיות" hint="הקש Enter להוספת תגית — עם השלמה אוטומטית מתגיות קיימות">
          <TagEditor name="tags" initialTags={postTags} existingTagNames={existingTags} />
        </Field>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="published" defaultChecked={post ? !!post.published : true} className="w-4 h-4 accent-[#c0562f]" />
            מפורסם
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="featured" defaultChecked={!!post?.featured} className="w-4 h-4 accent-[#c0562f]" />
            מומלץ (מוצג בדף הבית)
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="comments_enabled"
              defaultChecked={post ? post.comments_enabled !== 0 : true}
              className="w-4 h-4 accent-[#c0562f]"
            />
            הפעלת תגובות
          </label>
        </div>
        <Field label="הערה לגרסה (אופציונלי)" hint="ההערה תופיע ברשימת הגרסאות — מצב המתכון הקודם נשמר אוטומטית לפני כל שמירה">
          <input name="version_comment" dir="rtl" placeholder="למשל: עדכון כמויות" className={inputCls} />
        </Field>
        <div className="flex gap-3 pt-2">
          <button className="bg-[#c0562f] hover:bg-[#9c4123] text-white font-bold px-6 py-2.5 rounded-full text-sm transition">
            שמור
          </button>
          <Link href="/admin/recipes" className="px-6 py-2.5 rounded-full border border-amber-200 text-sm">ביטול</Link>
        </div>
      </form>

      {post && <VersionsSection postId={post.id} />}
      {post && (
        <div className="mt-6 max-w-3xl">
          <form action={trashPostAction}>
            <input type="hidden" name="id" value={post.id} />
            <button className="text-sm text-red-600 border border-red-200 bg-red-50 rounded-full px-5 py-2 hover:bg-red-100 transition">
              🗑️ העברה לסל מחזור
            </button>
          </form>
        </div>
      )}
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
