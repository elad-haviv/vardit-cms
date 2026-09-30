import Link from "next/link";

export default function Pagination({ page, totalPages, basePath, query = "" }) {
  if (totalPages <= 1) return null;
  const qs = query ? `&${query}` : "";
  const pages = [];
  const push = (p) => pages.push(p);
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) push(i);
  } else {
    push(1);
    if (page > 3) push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) push(i);
    if (page < totalPages - 2) push("…");
    push(totalPages);
  }
  const mk = (p) => `${basePath}?page=${p}${qs}`;
  return (
    <nav className="flex items-center justify-center gap-1 mt-8 flex-wrap" aria-label="עימוד">
      {page > 1 && (
        <Link href={mk(page - 1)} className="px-3 py-2 rounded-lg bg-white border border-amber-200 text-sm hover:bg-amber-50">→ הקודם</Link>
      )}
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`e${i}`} className="px-2 text-gray-400">…</span>
        ) : p === page ? (
          <span key={p} className="px-3.5 py-2 rounded-lg bg-[#c0562f] text-white text-sm font-bold">{p}</span>
        ) : (
          <Link key={p} href={mk(p)} className="px-3.5 py-2 rounded-lg bg-white border border-amber-200 text-sm hover:bg-amber-50">{p}</Link>
        )
      )}
      {page < totalPages && (
        <Link href={mk(page + 1)} className="px-3 py-2 rounded-lg bg-white border border-amber-200 text-sm hover:bg-amber-50">הבא ←</Link>
      )}
    </nav>
  );
}
