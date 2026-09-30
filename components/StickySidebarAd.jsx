"use client";

import { useEffect, useState } from "react";

export default function StickySidebarAd() {
  const [visible, setVisible] = useState(false);
  const [html, setHtml] = useState("");

  useEffect(() => {
    fetch("/api/ad/sidebar")
      .then((r) => r.json())
      .then((d) => {
        if (d.html) setHtml(d.html);
      })
      .catch(() => {});
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!html) return null;

  return (
    <aside
      className={`hidden lg:block fixed left-4 bottom-6 z-30 w-[180px] transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="rounded-xl bg-white shadow-lg border border-amber-100 p-2">
        <div className="text-[10px] text-gray-400 text-center mb-1">פרסומת</div>
        <div className="ad-slot" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </aside>
  );
}
