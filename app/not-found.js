import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function notFound() {
  let title = "הדף לא נמצא";
  try {
    title = getDb().prepare("SELECT value FROM settings WHERE key = 'site_title'").get()?.value || title;
  } catch {}
  return (
    <div className="text-center py-24">
      <div className="text-7xl mb-6">🍲</div>
      <h1 className="text-3xl font-display text-[var(--ink-deep)]">404 — הדף לא נמצא</h1>
      <p className="mt-3 text-[var(--ink-soft)]">נראה שהמתכון הזה התאדה מהסיר... נסו לחפש משהו אחר ב{title}.</p>
      <a href="/" className="inline-block mt-6 btn-primary">
        חזרה לדף הבית
      </a>
    </div>
  );
}
