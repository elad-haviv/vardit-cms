import Link from "next/link";
import RecipeCard from "@/components/RecipeCard";
import { getDb, getActiveAd } from "@/lib/db";
import { getPostCategoryLists } from "@/lib/posts.mjs";

export const dynamic = "force-dynamic";

const PER_PAGE = 24;

export const metadata = {
  title: "ורדית חביב | מתכונים מבית סבתא",
  description:
    "מתכונים מבית סבתא — מטבח תוניסאי-יהודי אותנטי: מתכונים ביתיים, חמים וטעימים שעברו מדור לדור.",
  openGraph: {
    title: "ורדית חביב | מתכונים מבית סבתא",
    description: "מטבח תוניסאי-יהודי אותנטי — מתכונים ביתיים שעברו מדור לדור.",
    locale: "he_IL",
    type: "website",
  },
};

function BetweenCardsAd() {
  const ad = getActiveAd("between_cards");
  if (!ad) return null;
  return (
    <div className="md:col-span-2 lg:col-span-3 my-2">
      <div className="ad-slot bg-white rounded-xl border border-amber-100 p-2" dangerouslySetInnerHTML={{ __html: ad.html }} />
    </div>
  );
}

export default function HomePage() {
  const db = getDb();
  const latest = db
    .prepare("SELECT * FROM posts WHERE published = 1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT ?")
    .all(PER_PAGE);
  const featured = db
    .prepare("SELECT * FROM posts WHERE published = 1 AND deleted_at IS NULL AND featured = 1 ORDER BY created_at DESC LIMIT 6")
    .all();
  const featuredFallback =
    featured.length === 0
      ? db
          .prepare("SELECT * FROM posts WHERE published = 1 AND deleted_at IS NULL ORDER BY views DESC, created_at DESC LIMIT 6")
          .all()
      : featured;
  const ids = [...new Set([...latest, ...featuredFallback].map((p) => p.id))];
  const catMap = getPostCategoryLists(db, ids);
  const cats = db
    .prepare(
      `SELECT c.slug, c.name, COUNT(DISTINCT p.id) cnt FROM categories c
       JOIN post_categories pc ON pc.category_id = c.id
       JOIN posts p ON p.id = pc.post_id AND p.published = 1 AND p.deleted_at IS NULL
       GROUP BY c.id ORDER BY cnt DESC LIMIT 14`
    )
    .all();
  const total = db.prepare("SELECT COUNT(*) c FROM posts WHERE published = 1 AND deleted_at IS NULL").get().c;

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-[#9c4123] via-[#c0562f] to-[#d97b4f] text-white px-6 py-14 md:px-14 md:py-20 shadow-lg">
        <div className="absolute -left-16 -top-16 w-64 h-64 rounded-full bg-white/10" aria-hidden="true" />
        <div className="absolute right-1/3 -bottom-24 w-80 h-80 rounded-full bg-white/5" aria-hidden="true" />
        <div className="relative max-w-2xl">
          <p className="text-amber-200 font-medium mb-2 text-sm tracking-wide">✻ ברוכים הבאים למטבח של סבתא ✻</p>
          <h1 className="text-4xl md:text-6xl font-black leading-tight">ורדית חביב</h1>
          <p className="mt-3 text-xl md:text-2xl text-amber-100 font-light">מתכונים מבית סבתא</p>
          <p className="mt-4 text-amber-50/90 leading-relaxed">
            מטבח תוניסאי-יהודי אותנטי — {total} מתכונים ביתיים, חמים וטעימים, שעברו מדור לדור: מצה
            פריכה, קוסקוס אמיתי, פלאפל תוניסאי וכל מה שמריח כמו בית.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/recipes"
              className="bg-white text-[#9c4123] font-bold px-6 py-3 rounded-full shadow hover:bg-amber-50 transition"
            >
              כל המתכונים
            </Link>
            <a
              href="https://www.youtube.com/channel/UC0CXSMXspDmGrtJ876QU6QA"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-white/40 px-6 py-3 rounded-full font-medium hover:bg-white/10 transition"
            >
              ערוץ היוטיוב ▸
            </a>
          </div>
        </div>
      </section>

      {/* Category chips (text only) */}
      <section aria-label="קטגוריות">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
          {cats.map((c) => (
            <Link
              key={c.slug}
              href={`/category/${c.slug}`}
              className="shrink-0 bg-white border border-amber-200 hover:border-[#c0562f] hover:text-[#c0562f] px-4 py-2 rounded-full text-sm font-medium transition shadow-sm"
            >
              {c.name} <span className="text-gray-400 text-xs">({c.cnt})</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Recommended */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl md:text-3xl font-black text-[#4a3728]">מומלצים</h2>
          <Link href="/recipes" className="text-sm text-[#c0562f] font-medium hover:underline">לכל המתכונים ←</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {featuredFallback.map((p) => (
            <RecipeCard key={p.id} post={p} categories={catMap.get(p.id) || []} />
          ))}
        </div>
      </section>

      {/* Latest */}
      <section>
        <h2 className="text-2xl md:text-3xl font-black text-[#4a3728] mb-5">מתכונים חדשים</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {latest.map((p, i) => (
            <div key={p.id} className="contents">
              <RecipeCard post={p} categories={catMap.get(p.id) || []} />
              {(i + 1) % 8 === 0 && i !== latest.length - 1 && <BetweenCardsAd />}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
