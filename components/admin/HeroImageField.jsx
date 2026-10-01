"use client";

/**
 * Hero-image picker for the settings page: hidden input `hero_image` (empty → default gradient hero),
 * gallery button → pick or clear.
 */

import { useState } from "react";
import ImageGalleryModal from "@/components/admin/ImageGalleryModal";

export default function HeroImageField({ initial }) {
  const [src, setSrc] = useState(initial || "");
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <input type="hidden" name="hero_image" value={src} />
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="תמונת הרקע" className="w-24 h-16 object-cover rounded-lg border border-amber-200 bg-amber-50" />
      ) : (
        <div className="w-24 h-16 rounded-lg border border-dashed border-amber-300 bg-gradient-to-l from-[#9c4123] to-[#d97b4f] opacity-60 flex items-center justify-center text-white text-xs">
          ברירת מחדל
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-bold text-[#c0562f] bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5 hover:bg-amber-100 transition"
      >
        🖼️ בחירת תמונת רקע מהגלריה
      </button>
      {src && (
        <button
          type="button"
          onClick={() => setSrc("")}
          className="text-xs text-red-500 hover:underline"
        >
          מחיקה (חזרה לברירת מחדל)
        </button>
      )}
      <ImageGalleryModal
        open={open}
        onClose={() => setOpen(false)}
        onSelect={(s) => {
          setSrc(s);
          setOpen(false);
        }}
      />
    </div>
  );
}
