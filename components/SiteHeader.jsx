"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SiteHeader({ siteTitle, subtitle }) {
  const [openCats, setOpenCats] = useState(false);
  const [openNav, setOpenNav] = useState(false);
  const [q, setQ] = useState("");
  const router = useRouter();

  const doSearch = (e) => {
    e.preventDefault();
    if (q.trim()) router.push(`/recipes?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <header className="sticky top-0 z-40 bg-[var(--paper)]/95 backdrop-blur stitched shadow-[0_1px_2px_rgba(30,52,80,0.06)]">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center justify-between h-16 gap-4">
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <img src="/images/logo.png" alt={siteTitle} className="w-11 h-11 object-contain rounded-[0.55rem] bg-[var(--card)] border border-[var(--line)]" />
            <span className="leading-tight">
              <span className="block font-display text-xl text-[var(--ink)]">{siteTitle}</span>
              <span className="block text-xs text-[var(--paprika-deep)]">{subtitle}</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-[var(--ink)]">
            <Link href="/recipes" className="px-3 py-2 rounded-lg hover:bg-[rgba(43,74,111,0.07)] transition-colors">כל המתכונים</Link>
            <div
              className="relative"
              onMouseEnter={() => setOpenCats(true)}
              onMouseLeave={() => setOpenCats(false)}
            >
              <button className="px-3 py-2 rounded-lg hover:bg-[rgba(43,74,111,0.07)] transition-colors flex items-center gap-1">
                קטגוריות <span className="text-xs">▾</span>
              </button>
              {openCats && <CatDropdown />}
            </div>
            <Link href="/page/about" className="px-3 py-2 rounded-lg hover:bg-[rgba(43,74,111,0.07)] transition-colors">אודות</Link>
            <Link href="/page/contact" className="px-3 py-2 rounded-lg hover:bg-[rgba(43,74,111,0.07)] transition-colors">צור קשר</Link>
          </nav>

          <form onSubmit={doSearch} className="hidden md:block relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              type="search"
              placeholder="חיפוש מתכון..."
              className="w-48 lg:w-64 rounded-[0.65rem] border border-[var(--line)] bg-[var(--card)] px-4 py-1.5 text-sm focus:outline-none focus:border-[var(--paprika)]"
            />
            <button type="submit" className="absolute left-1 top-1/2 -translate-y-1/2 text-[var(--ink-soft)] px-2" aria-label="חיפוש">🔍</button>
          </form>

          <button
            className="md:hidden p-2 text-2xl text-[var(--ink)]"
            onClick={() => setOpenNav(!openNav)}
            aria-label="תפריט"
          >
            ☰
          </button>
        </div>
      </div>

      {openNav && (
        <div className="md:hidden border-t border-[var(--line)] bg-[var(--paper)] px-4 py-3 space-y-2">
          <form onSubmit={doSearch} className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              type="search"
              placeholder="חיפוש מתכון..."
              className="flex-1 rounded-[0.65rem] border border-[var(--line)] bg-[var(--card)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--paprika)]"
            />
            <button className="rounded-[0.65rem] bg-[var(--ink)] text-white px-4 text-sm font-bold">חפש</button>
          </form>
          <Link href="/recipes" onClick={() => setOpenNav(false)} className="block py-2 font-medium">כל המתכונים</Link>
          <Link href="/page/about" onClick={() => setOpenNav(false)} className="block py-2 font-medium">אודות</Link>
          <Link href="/page/contact" onClick={() => setOpenNav(false)} className="block py-2 font-medium">צור קשר</Link>
          <CatDropdown mobile onNavigate={() => setOpenNav(false)} />
        </div>
      )}
    </header>
  );
}

function CatDropdown({ mobile = false, onNavigate = () => {} }) {
  const [cats, setCats] = useState(null);
  if (cats === null) {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCats)
      .catch(() => setCats([]));
    return <div className={mobile ? "" : "absolute right-0 top-full w-56 bg-[var(--card)] rounded-xl shadow-lg border border-[var(--line)] p-2"}>טוען...</div>;
  }
  return (
    <div className={mobile ? "grid grid-cols-2 gap-1 py-2" : "absolute right-0 top-full w-64 max-h-96 overflow-auto bg-[var(--card)] rounded-xl shadow-lg border border-[var(--line)] p-2 z-50"}>
      {cats.length === 0 && <span className="px-3 py-2 text-sm text-[var(--ink-soft)]">אין קטגוריות</span>}
      {cats.map((c) => (
        <Link
          key={c.id}
          href={`/category/${c.slug}`}
          onClick={onNavigate}
          className="block px-3 py-2 text-sm rounded-lg hover:bg-[rgba(43,74,111,0.07)] transition-colors"
        >
          {c.name}
        </Link>
      ))}
    </div>
  );
}
