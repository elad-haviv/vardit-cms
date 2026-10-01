"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Multi-select searchable categories combobox.
 * Text input filters the dropdown; typing a NEW name shows "הוסף קטגוריה חדשה"
 * which creates the category on the spot (POST /api/admin/categories).
 * Selected ids are serialized into a hidden input named `name` (JSON array).
 *
 * props: name, allCategories [{id,name}], selectedIds (array)
 */
export default function CategoryCombobox({ name = "category_ids", allCategories, selectedIds }) {
  const [selected, setSelected] = useState(() => selectedIds.map(Number));
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [cats, setCats] = useState(() => allCategories.map((c) => ({ ...c, id: Number(c.id) })));
  const rootRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const selectedNames = useMemo(() => {
    const map = new Map(cats.map((c) => [c.id, c.name]));
    return selected.map((id) => ({ id, name: map.get(id) || `#${id}` }));
  }, [selected, cats]);

  const q = query.trim();
  const exactMatch = q ? cats.some((c) => c.name === q) : true;
  const suggestions = useMemo(() => {
    if (!q) return cats;
    return cats.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));
  }, [cats, q]);

  const toggle = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const createCategory = async () => {
    if (!q || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: q }),
      });
      const data = await res.json();
      if (res.ok && data.ok && data.category) {
        const c = { ...data.category, id: Number(data.category.id) };
        setCats((prev) => (prev.some((x) => x.id === c.id) ? prev : [...prev, c]));
        setSelected((prev) => [...prev, c.id]);
        setQuery("");
      }
    } catch { /* noop */ } finally {
      setCreating(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={name} value={JSON.stringify(selected)} />

      {selectedNames.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedNames.map((c) => (
            <span key={c.id} className="inline-flex items-center gap-1 bg-[#c0562f]/10 text-[#c0562f] font-bold text-xs px-2.5 py-1 rounded-full">
              {c.name}
              <button type="button" onClick={() => toggle(c.id)} className="hover:text-red-600" aria-label={`הסר ${c.name}`}>
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="חיפוש קטגוריה... (אפשר יותר מקטגוריה אחת)"
        className="w-full rounded-lg border border-amber-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c0562f]/40"
      />

      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-amber-200 rounded-lg shadow-lg max-h-64 overflow-y-auto text-sm">
          {suggestions.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => { toggle(c.id); setQuery(""); }}
              className={`w-full text-right px-4 py-2 hover:bg-amber-50 flex items-center justify-between ${selected.includes(c.id) ? "bg-[#c0562f]/5 font-bold text-[#c0562f]" : ""}`}
            >
              <span>{c.name}</span>
              {selected.includes(c.id) && <span className="text-xs">✓ נבחרה</span>}
            </button>
          ))}
          {!exactMatch && (
            <button
              type="button"
              onClick={createCategory}
              disabled={creating}
              className="w-full text-right px-4 py-2 bg-green-50 text-green-700 font-bold hover:bg-green-100 border-t border-green-100"
            >
              {creating ? "יוצר..." : `הוסף קטגוריה חדשה: "${q}"`}
            </button>
          )}
          {suggestions.length === 0 && exactMatch && (
            <p className="px-4 py-2 text-gray-400">אין קטגוריות להצגה</p>
          )}
        </div>
      )}
    </div>
  );
}
