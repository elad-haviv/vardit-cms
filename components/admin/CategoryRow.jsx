"use client";

import { useState } from "react";
import ImageGalleryModal from "./ImageGalleryModal";

/**
 * One enriched category row in the admin list: name, description textarea and
 * an image chosen through the SAME gallery modal. Submitting saves via saveCategory.
 * props: category {id,name,slug,description,image_url,cnt}, saveCategory (server action fn)
 */
export default function CategoryRow({ category, saveCategory }) {
  const [imageUrl, setImageUrl] = useState(category.image_url || "");
  const [galleryOpen, setGalleryOpen] = useState(false);
  const c = category;

  const inputCls =
    "w-full rounded-lg border border-amber-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c0562f]/40";

  return (
    <form action={saveCategory} className="p-4 space-y-2 bg-white rounded-2xl border border-amber-100">
      <input type="hidden" name="id" value={c.id} />
      <input type="hidden" name="image_url" value={imageUrl} />
      <div className="flex items-center gap-2 flex-wrap">
        <input name="name" defaultValue={c.name} className={`${inputCls} flex-1 min-w-[180px] font-bold`} />
        <span className="text-xs text-gray-400 shrink-0">{c.cnt} מתכונים</span>
        <span className="text-xs text-gray-300" dir="ltr">/{c.slug}</span>
      </div>
      <textarea
        name="description"
        rows={2}
        defaultValue={c.description || ""}
        placeholder="תיאור הקטגוריה (מוצג בראש העמוד הציבורי)"
        className={inputCls}
      />
      <div className="flex items-center gap-2 flex-wrap">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={c.name} className="w-16 h-16 object-cover rounded-lg border border-amber-100 bg-amber-50" />
        ) : (
          <div className="w-16 h-16 rounded-lg border border-dashed border-amber-200 bg-amber-50/50 flex items-center justify-center text-amber-200">🖼️</div>
        )}
        <button
          type="button"
          onClick={() => setGalleryOpen(true)}
          className="text-xs font-bold text-[#c0562f] bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5 hover:bg-amber-100 transition"
        >
          🖼️ בחירת תמונה מהגלריה
        </button>
        <div className="flex-1" />
        <button className="bg-[#c0562f] hover:bg-[#9c4123] text-white font-bold text-xs px-4 py-2 rounded-full">שמור קטגוריה</button>
      </div>
      <ImageGalleryModal open={galleryOpen} onClose={() => setGalleryOpen(false)} onSelect={(src) => { setImageUrl(src); setGalleryOpen(false); }} />
    </form>
  );
}
