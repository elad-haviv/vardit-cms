import Link from "next/link";
import { getDb, getSetting } from "@/lib/db";

function parseLinksSetting() {
  // Links manager: settings key 'links' holds JSON [{name, url}].
  // Fallback: migrate from the legacy youtube_url / facebook_url keys.
  const raw = getSetting("links", "");
  try {
    const arr = raw ? JSON.parse(raw) : [];
    if (Array.isArray(arr) && arr.length > 0) {
      return arr.filter((r) => r && r.name && r.url).map((r) => ({ name: String(r.name), url: String(r.url) }));
    }
  } catch { /* invalid JSON — fall through */ }
  const yt = getSetting("youtube_url", "");
  const fb = getSetting("facebook_url", "");
  const links = [];
  if (yt) links.push({ name: "YouTube", url: yt });
  if (fb) links.push({ name: "Facebook", url: fb });
  return links;
}

export default function SiteFooter({ siteTitle }) {
  const cats = getDb()
    .prepare(
      `SELECT c.slug, c.name, COUNT(DISTINCT p.id) cnt FROM categories c
       JOIN post_categories pc ON pc.category_id = c.id
       JOIN posts p ON p.id = pc.post_id AND p.published = 1 AND p.deleted_at IS NULL
       GROUP BY c.id ORDER BY cnt DESC LIMIT 12`
    )
    .all();
  const links = parseLinksSetting();

  return (
    <footer className="bg-[var(--ink-deep)] text-[var(--paper)] mt-16 border-t-2 border-dashed border-[var(--saffron)]/50">
      <div className="mx-auto max-w-6xl px-4 py-12 grid gap-8 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-3">
            <img src="/images/logo.png" alt={siteTitle} className="w-12 h-12 object-contain rounded-[0.55rem] bg-[var(--card)]" />
            <span className="font-display text-xl">{siteTitle}</span>
          </div>
          <p className="mt-3 text-sm text-[var(--paper)]/75 leading-relaxed">
            מתכונים מבית סבתא — מטבח תוניסאי-יהודי אותנטי, מדור לדור.
          </p>
          {links.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {links.map((l, i) => (
                <a
                  key={i}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-[0.55rem] bg-white/10 hover:bg-white/20 text-sm transition-colors"
                >
                  {l.name}
                </a>
              ))}
            </div>
          )}
        </div>
        <div>
          <h3 className="font-display mb-3 text-[var(--saffron)]">קטגוריות מובילות</h3>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-[var(--paper)]/85">
            {cats.map((c) => (
              <li key={c.slug}>
                <Link href={`/category/${c.slug}`} className="hover:text-white transition-colors">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-display mb-3 text-[var(--saffron)]">מידע</h3>
          <ul className="space-y-1 text-sm text-[var(--paper)]/85">
            <li><Link href="/recipes" className="hover:text-white transition-colors">כל המתכונים</Link></li>
            <li><Link href="/page/about" className="hover:text-white transition-colors">אודות</Link></li>
            <li><Link href="/page/contact" className="hover:text-white transition-colors">צור קשר</Link></li>
            <li><Link href="/admin" className="hover:text-white transition-colors">ניהול</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-[var(--paper)]/55">
        © {new Date().getFullYear()} {siteTitle} · כל הזכויות שמורות
      </div>
    </footer>
  );
}
