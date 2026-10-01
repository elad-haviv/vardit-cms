"use client";

/**
 * Searchable post picker (combobox): type to search by title, pick from dropdown.
 * Hidden input `name` submits the selected post id for the surrounding form.
 */

import { useEffect, useRef, useState } from "react";

export default function PostSelect({ name }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [posts, setPosts] = useState([]);
  const [selected, setSelected] = useState(null); // {id, title}
  const boxRef = useRef(null);
  const timer = useRef(null);

  const search = (text) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/posts?q=${encodeURIComponent(text)}`);
        const data = await res.json();
        setPosts(data.posts || []);
      } catch {
        setPosts([]);
      }
    }, 250);
  };

  useEffect(() => {
    if (open) search(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, q]);

  useEffect(() => {
    const onDoc = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const inputCls =
    "rounded-lg border border-amber-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c0562f]/40";

  return (
    <div className="relative max-w-md" ref={boxRef}>
      <input type="hidden" name={name} value={selected ? selected.id : ""} />
      <input
        className={`${inputCls} w-full`}
        placeholder="חיפוש מתכון לפי כותרת..."
        value={selected ? `${selected.title} (מזהה ${selected.id})` : q}
        onChange={(e) => {
          setSelected(null);
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && !selected && (
        <div className="absolute z-20 right-0 top-full w-full bg-white rounded-xl shadow-lg border border-amber-100 max-h-72 overflow-auto">
          {posts.length === 0 && <p className="px-3 py-2 text-sm text-gray-400">אין תוצאות</p>}
          {posts.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setSelected(p);
                setOpen(false);
              }}
              className="block w-full text-right px-3 py-2 text-sm rounded-lg hover:bg-amber-50 transition"
            >
              {p.title} <span className="text-xs text-gray-400">({p.id})</span>
            </button>
          ))}
        </div>
      )}
      {selected && (
        <button
          type="button"
          onClick={() => setSelected(null)}
          className="text-xs text-red-500 hover:underline block mt-1"
        >
          בחירת מתכון אחר
        </button>
      )}
    </div>
  );
}
