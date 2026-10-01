"use client";

import { useMemo, useState } from "react";

/**
 * Tag editor: type + Enter adds a chip, ✕ removes, autocomplete suggestions
 * from the existing tag names. Serializes tag names into a hidden input (JSON array).
 *
 * props: name, initialTags (names array), existingTagNames (names array)
 */
export default function TagEditor({ name = "tags", initialTags = [], existingTagNames = [] }) {
  const [tags, setTags] = useState(() => initialTags.filter(Boolean));
  const [value, setValue] = useState("");

  const q = value.trim().toLowerCase();
  const suggestions = useMemo(() => {
    if (!q) return [];
    return existingTagNames
      .filter((n) => !tags.includes(n) && n.toLowerCase().includes(q) && n.toLowerCase() !== q)
      .slice(0, 6);
  }, [q, existingTagNames, tags]);

  const add = (name) => {
    const t = String(name || "").trim();
    if (!t || tags.includes(t)) { setValue(""); return; }
    setTags((prev) => [...prev, t]);
    setValue("");
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(value);
    } else if (e.key === "Backspace" && !value && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1));
    }
  };

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(tags)} />
      <div className="flex flex-wrap gap-1.5 border border-amber-200 rounded-lg p-2 bg-white min-h-[44px]">
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 bg-amber-100 text-[#9c4123] font-bold text-xs px-2.5 py-1 rounded-full">
            #{t}
            <button type="button" onClick={() => setTags((prev) => prev.filter((x) => x !== t))} className="hover:text-red-600" aria-label={`הסר תגית ${t}`}>
              ✕
            </button>
          </span>
        ))}
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="הוסף תגית והקש Enter..."
          className="flex-1 min-w-[160px] px-2 py-1 text-sm focus:outline-none"
        />
      </div>
      {suggestions.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1 text-xs text-gray-500">
          <span className="py-1">הצעות:</span>
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="bg-white border border-amber-200 rounded-full px-2.5 py-1 hover:border-[#c0562f] hover:text-[#c0562f] font-medium"
            >
              #{s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
