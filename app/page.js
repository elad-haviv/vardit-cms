import Link from "next/link";
import RecipeCard from "@/components/RecipeCard";
import { getDb, getSetting, getActiveAd } from "@/lib/db";
import { getPostCategoryLists } from "@/lib/posts.mjs";

export const dynamic = "force-dynamic";

const PER_PAGE = 18;

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
  const today = new Date().toISOString().slice(0, 10);

  // Latest recipes (uneven grid; first card rendered big)
  const latest = db
    .prepare("SELECT * FROM posts WHERE published = 1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT ?")
    .all(PER_PAGE);

  // Most popular by views
  const popular = db
    .prepare(
      "SELECT id, title, slug, excerpt, featured_image_url, created_at, views FROM posts WHERE published = 1 AND deleted_at IS NULL AND views > 0 ORDER BY views DESC, created_at DESC LIMIT 8"
    )
    .all();

  // Scheduled features active today (admin: /admin/featured with start/end dates)
  const scheduled = db
    .prepare(
      `SELECT DISTINCT p.* FROM features f
       JOIN posts p ON p.id = f.post_id
       WHERE p.published = 1 AND p.deleted_at IS NULL
         AND (f.start_date = '' OR f.start_date <= ?)
         AND (f.end_date = '' OR f.end_date >= ?)
       ORDER BY f.start_date DESC LIMIT 6`
    )
    .all(today, today);

  // Permanent recommended (fallback popular when none flagged)
  const recommended = db
    .prepare("SELECT * FROM posts WHERE published = 1 AND deleted_at IS NULL AND featured = 1 ORDER BY created_at DESC LIMIT 6")
    .all();

  const allIds = [...new Set([...latest, ...scheduled, ...recommended, ...popular].map((p) => p.id))];
  const catMap = getPostCategoryLists(db, allIds);

  // Featured-2x2 highlight set: scheduled-active ids win, else the permanent featured flag
  const highlightIds = new Set(
    (scheduled.length > 0 ? scheduled : recommended.slice(0, 3)).map((p) => p.id)
  );

  const cats = db
    .prepare(
      `SELECT c.slug, c.name, COUNT(DISTINCT p.id) cnt FROM categories c
       JOIN post_categories pc ON pc.category_id = c.id
       JOIN posts p ON p.id = pc.post_id AND p.published = 1 AND p.deleted_at IS NULL
       GROUP BY c.id ORDER BY cnt DESC LIMIT 14`
    )
    .all();
  const total = db.prepare("SELECT COUNT(*) c FROM posts WHERE published = 1 AND deleted_at IS NULL").get().c;

  // Editable hero (admin → settings → hero)
  const heroTitle = getSetting("hero_title", "ורדית חביב");
  const heroSubtitle = getSetting("hero_subtitle", "מתכונים מבית סבתא");
  const heroImage = getSetting("hero_image", "");
  const heroText = `מטבח תוניסאי-יהודי אותנטי — ${total} מתכונים ביתיים, חמים וטעימים, שעברו מדור לדור: מצה פריכה, קוסקוס אמיתי, פלאפל תוניסאי וכל מה שמריח כמו בית.`;

  return (
    <div className="space-y-12">
      {/* Hero — editable in admin settings */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-[#9c4123] via-[#c0562f] to-[#d97b4f] text-white px-6 py-14 md:px-14 md:py-20 shadow-lg">
        {heroImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroImage} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover opacity-30" />
        )}
        <div className="absolute -left-16 -top-16 w-64 h-64 rounded-full bg-white/10" aria-hidden="true" />
        <div className="absolute right-1/3 -bottom-24 w-80 h-80 rounded-full bg-white/5" aria-hidden="true" />
        <div className="relative max-w-2xl">
          <p className="text-amber-200 font-medium mb-2 text-sm tracking-wide">✻ ברוכים הבאים למטבח של סבתא ✻</p>
          <h1 className="text-4xl md:text-6xl font-black leading-tight">{heroTitle}</h1>
          <p className="mt-3 text-xl md:text-2xl text-amber-100 font-light">{heroSubtitle}</p>
          <p className="mt-4 text-amber-50/90 leading-relaxed">{heroText}</p>
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

      {/* Scheduled featured band — appears only while a feature window is active */}
      {scheduled.length > 0 && (
        <section className="rounded-3xl bg-white/60 border-2 border-[#c0562f]/40 p-6 md:p-8">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
            <h2 className="text-2xl md:text-3xl font-black text-[#9c4123] flex items-center gap-2">
              ✻ מתכונים מודגשים להשבוע
            </h2>
            <Link href="/recipes" className="text-sm text-[#c0562f] font-medium hover:underline">לכל המתכונים ←</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {scheduled.map((p) => (
              <RecipeCard key={`s-${p.id}`} post={p} categories={catMap.get(p.id) || []} highlight />
            ))}
          </div>
        </section>
      )}

      {/* Latest — uneven grid: first card 2×2 large, featured get highlighted, wavy spans */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl md:text-3xl font-black text-[#4a3728]">מתכונים חדשים</h2>
          <Link href="/recipes" className="text-sm text-[#c0562f] font-medium hover:underline">לכל המתכונים ←</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 auto-rows-fr gap-5">
          {latest.map((p, i) => {
            // uneven rhythm: #1 big 2×2, then every 7th spans 2 columns
            const lg = i === 0;
            const wide = !lg && (i + 1) % 7 === 0;
            const span = lg
              ? "sm:col-span-2 sm:row-span-2"
              : wide
                ? "sm:col-span-2"
                : "";
            return (
              <div key={p.id} className={`contents`}>
                <div className={span}>
                  <RecipeCard
                    post={p}
                    categories={catMap.get(p.id) || []}
                    size={lg ? "lg" : "md"}
                    highlight={highlightIds.has(p.id)}
                  />
                </div>
                {(i + 1) % 8 === 0 && i !== latest.length - 1 && <BetweenCardsAd />}
              </div>
            );
          })}
        </div>
      </section>

      {/* Permanent recommended — only shown when no scheduled features are active */}
      {recommended.length > 0 && scheduled.length === 0 && (
        <section>
          <h2 className="text-2xl md:text-3xl font-black text-[#4a3728] mb-5">מומלצים</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {recommended.map((p) => (
              <RecipeCard key={`r-${p.id}`} post={p} categories={catMap.get(p.id) || []} highlight={highlightIds.has(p.id)} />
            ))}
          </div>
        </section>
      )}

      {/* Most popular by views */}
      {popular.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl md:text-3xl font-black text-[#4a3728] flex items-center gap-2">
              🔥 הפופולריים ביותר
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {popular.map((p, i) => (
              <Link
                key={`pop-${p.id}`}
                href={`/recipe/${p.slug}`}
                className="group bg-white rounded-2xl border border-amber-100 shadow-sm hover:shadow-lg transition flex items-center gap-4 p-3"
              >
                <span className="shrink-0 w-8 text-center font-black text-xl text-[#c0562f]/40 group-hover:text-[#c0562f] transition">
                  {i + 1}
                </span>
                {p.featured_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.featured_image_url} alt="" loading="lazy" className="w-20 h-20 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-amber-50 border border-amber-100 shrink-0 flex items-center justify-center text-3xl opacity-40">🍳</div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-[#4a3728] group-hover:text-[#c0562f] transition line-clamp-1">{p.title}</h3>
                  {p.excerpt && <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">{p.excerpt}</p>}
                  <p className="text-xs text-gray-400 mt-1">👀 {p.views} צפיות</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
