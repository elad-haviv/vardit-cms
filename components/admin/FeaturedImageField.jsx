"use client";

import { useState } from "react";
import ImageGalleryModal from "./ImageGalleryModal";

/**
 * Featured image field: text input (stores /images/<name>) + button opening
 * the gallery modal; clicking an image selects it.
 * props: name, initialUrl, dir
 */
export default function FeaturedImageField({ name = "featured_image_url", initialUrl = "", dir = "ltr" }) {
  const [url, setUrl] = useState(initialUrl);
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={url} />
      <div className="flex gap-2">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          dir={dir}
          placeholder="/images/... או https://..."
          className="flex-1 rounded-lg border border-amber-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c0562f]/40"
        />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="shrink-0 text-sm font-bold text-[#c0562f] bg-amber-50 border border-amber-200 rounded-lg px-4 hover:bg-amber-100 transition"
        >
          🖼️ בחירה מהגלריה
        </button>
      </div>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="תמונה ראשית" className="w-40 aspect-[4/3] object-cover rounded-lg border border-amber-100 bg-amber-50" />
      )}
      <ImageGalleryModal open={open} onClose={() => setOpen(false)} onSelect={(src) => { setUrl(src); setOpen(false); }} />
    </div>
  );
}
