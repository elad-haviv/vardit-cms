"use client";

import { useState } from "react";

/**
 * Dynamic settings-links manager: rows of (name + url), add-link and delete-row
 * buttons. Serialized into a hidden input `links_json` (JSON [{name, url}]).
 * props: initialLinks (array), nameInput = "links_json"
 */
export default function LinksManager({ initialLinks = [], inputName = "links_json" }) {
  const [rows, setRows] = useState(() =>
    (initialLinks.length > 0 ? initialLinks : [{ name: "", url: "" }]).map((r) => ({ name: r.name || "", url: r.url || "" }))
  );

  const inputCls =
    "rounded-lg border border-amber-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c0562f]/40";

  return (
    <div className="space-y-2">
      <input type="hidden" name={inputName} value={JSON.stringify(rows.filter((r) => r.name && r.url))} />
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={r.name}
            onChange={(e) => setRows((prev) => prev.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
            placeholder="שם (למשל YouTube)"
            className={`${inputCls} w-40`}
          />
          <input
            value={r.url}
            onChange={(e) => setRows((prev) => prev.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
            dir="ltr"
            placeholder="https://..."
            className={`${inputCls} flex-1`}
          />
          <button
            type="button"
            onClick={() => setRows((prev) => (prev.length > 1 ? prev.filter((_, j) => j !== i) : [{ name: "", url: "" }]))}
            className="text-red-500 hover:underline text-sm shrink-0"
            aria-label={`מחק שורה ${i + 1}`}
          >
            מחיקה
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setRows((prev) => [...prev, { name: "", url: "" }])}
        className="text-sm font-bold text-[#c0562f] bg-amber-50 border border-amber-200 rounded-full px-4 py-1.5 hover:bg-amber-100 transition"
      >
        + הוספת קישור
      </button>
    </div>
  );
}
