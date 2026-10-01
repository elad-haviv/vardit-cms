"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const PREFIX_RE = /^(thumbs-|\d{2})/;

function prefixOf(name) {
  const m = name.match(PREFIX_RE);
  if (!m) return "";
  return m[1].replace(/-$/, "") || m[1];
}

function prefixLabel(prefix) {
  if (prefix === "thumbs") return "WP — תמונות ממוזערות (thumbs)";
  if (prefix === "") return "אחר (ללא תחילית)";
  if (/^\d{2}$/.test(prefix)) return `WP uploads — ${prefix}`;
  return prefix;
}

function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Gallery modal over DATA_DIR/images (via GET /api/admin/images).
 * props: open, onClose, onSelect(src) — click an image to select it,
 *        multi-file upload inside the modal, sorting (name/mtime/size),
 *        grouping by filename prefix (WP upload dir / thumbs).
 */
export default function ImageGalleryModal({ open, onClose, onSelect }) {
  const [files, setFiles] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [query, setQuery] = useState("");
  const [grouped, setGrouped] = useState(true);
  // Render incrementally: 60 cards initially, +60 per "load more" / near-bottom scroll
  const PAGE = 60;
  const [limit, setLimit] = useState(PAGE);
  const scrollRef = useRef(null);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 400) {
      setLimit((l) => (l < visibleTotal.current ? l + PAGE : l));
    }
  }, []);
  const visibleTotal = useRef(0);

  const load = useCallback(async () => {
    setError("");
    setFiles(null);
    try {
      const res = await fetch("/api/admin/images");
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setFiles(data.files || []);
    } catch {
      setError("טעינת הגלריה נכשלה. נסו שוב.");
    }
  }, []);

  useEffect(() => {
    if (open) { load(); setLimit(PAGE); }
  }, [open, load]);

  const upload = useCallback(
    async (fileList) => {
      if (!fileList || fileList.length === 0) return;
      setBusy(true);
      setError("");
      try {
        const form = new FormData();
        for (const f of fileList) form.append("files", f);
        const res = await fetch("/api/admin/images", { method: "POST", body: form });
        if (!res.ok) throw new Error(String(res.status));
        await load();
      } catch {
        setError("העלאת הקבצים נכשלה.");
      } finally {
        setBusy(false);
      }
    },
    [load]
  );

  const visible = useMemo(() => {
    if (!files) return [];
    const q = query.trim().toLowerCase();
    const filtered = q ? files.filter((f) => f.name.toLowerCase().includes(q)) : files;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortKey === "size") return (a.size - b.size) * dir;
      if (sortKey === "mtime") return (a.mtime - b.mtime) * dir;
      return a.name.localeCompare(b.name, "he") * dir;
    });
  }, [files, sortKey, sortDir, query]);

  const limited = useMemo(() => visible.slice(0, limit), [visible, limit]);
  visibleTotal.current = visible.length;

  const groups = useMemo(() => {
    if (!grouped) return [{ prefix: "", label: `כל התמונות (${limited.length})`, items: limited }];
    const map = new Map();
    for (const f of limited) {
      const p = prefixOf(f.name);
      if (!map.has(p)) map.set(p, []);
      map.get(p).push(f);
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([p, items]) => ({ prefix: p, label: prefixLabel(p), items }));
  }, [visible, grouped]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[88vh] flex flex-col" dir="rtl">
        <div className="flex items-center justify-between p-4 border-b border-amber-100 flex-wrap gap-2">
          <h2 className="font-black text-lg text-[#4a3728]">גלריית תמונות</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl" aria-label="סגור">
            ✕
          </button>
        </div>

        <div className="p-4 border-b border-amber-100 flex flex-wrap items-center gap-2 text-sm">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש לפי שם קובץ..."
            className="rounded-lg border border-amber-200 px-3 py-1.5 w-52"
          />
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} className="rounded-lg border border-amber-200 px-2 py-1.5">
            <option value="name">מיון: שם</option>
            <option value="mtime">מיון: תאריך שינוי</option>
            <option value="size">מיון: גודל</option>
          </select>
          <select value={sortDir} onChange={(e) => setSortDir(e.target.value)} className="rounded-lg border border-amber-200 px-2 py-1.5">
            <option value="asc">עולה</option>
            <option value="desc">יורד</option>
          </select>
          <label className="flex items-center gap-1.5 font-medium">
            <input type="checkbox" checked={grouped} onChange={(e) => setGrouped(e.target.checked)} className="w-4 h-4 accent-[#c0562f]" />
            קיבוץ לפי תחילית
          </label>
          <label className={`flex items-center gap-1.5 font-bold text-[#c0562f] cursor-pointer bg-amber-50 border border-amber-200 rounded-full px-4 py-1.5 ${busy ? "opacity-50" : ""}`}>
            {busy ? "מעלה..." : "+ העלאת קבצים"}
            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                upload(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        </div>

        <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto p-4">
          {error && <div className="mb-3 bg-red-50 text-red-700 rounded-lg p-3 text-sm">{error}</div>}
          {files === null && !error && <p className="text-center text-gray-400 py-10">טוען תמונות...</p>}
          {files !== null && visible.length === 0 && (
            <p className="text-center text-gray-400 py-10">לא נמצאו תמונות.</p>
          )}
          {groups.map((g) => (
            <div key={g.prefix || "_"} className="mb-6">
              {grouped && (
                <h3 className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-2">
                  <span className="bg-amber-50 border border-amber-200 rounded-full px-3 py-0.5">{g.label}</span>
                  <span className="text-gray-300">({g.items.length})</span>
                </h3>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {g.items.map((f) => (
                  <button
                    key={f.name}
                    onClick={() => onSelect(`/images/${f.name}`)}
                    className="group border border-amber-100 rounded-xl overflow-hidden hover:border-[#c0562f] hover:shadow transition text-right bg-white"
                    title={f.name}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/images/${f.name}`}
                      alt={f.name}
                      loading="lazy"
                      className="w-full aspect-square object-cover bg-amber-50 group-hover:scale-105 transition-transform"
                    />
                    <div className="p-1.5">
                      <div className="text-[11px] font-medium truncate" dir="rtl">{f.name}</div>
                      <div className="text-[10px] text-gray-400" dir="ltr">
                        {fmtSize(f.size)} · {new Date(f.mtime).toLocaleDateString("he-IL")}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {limited.length < visible.length && (
            <div className="text-center pb-4">
              <button
                onClick={() => setLimit((l) => l + PAGE)}
                className="text-sm font-bold text-[#c0562f] bg-amber-50 border border-amber-200 rounded-full px-6 py-2 hover:bg-amber-100 transition"
              >
                טעינת עוד ({visible.length - limited.length} נותרו)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
