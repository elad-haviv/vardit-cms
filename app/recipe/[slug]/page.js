import Link from "next/link";
import { notFound } from "next/navigation";
import RecipeCard from "@/components/RecipeCard";
import CommentSection from "@/components/CommentSection";
import { formatDateHe, injectInContentAd, stripHtml } from "@/lib/util";
import { decodeSlug } from "@/lib/util";
import { getDb, getActiveAd } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug: rawSlug } = await params;
  const slug = decodeSlug(rawSlug);
  const post = getDb().prepare("SELECT * FROM posts WHERE slug = ? AND published = 1").get(slug);
  if (!post) return { title: "מתכון לא נמצא" };
  const desc = post.excerpt || stripHtml(post.content, 160);
  const meta = {
    title: post.title,
    description: desc,
    openGraph: {
      title: post.title,
      description: desc,
      locale: "he_IL",
      type: "article",
      publishedTime: post.created_at || undefined,
    },
  };
  if (post.featured_image_url) {
    meta.openGraph.images = [{ url: post.featured_image_url }];
    meta.twitter = { card: "summary_large_image" };
  }
  return meta;
}

export default async function RecipePage({ params }) {
  const { slug: rawSlug } = await params;
  const slug = decodeSlug(rawSlug);
  const db = getDb();
  const post = db.prepare("SELECT * FROM posts WHERE slug = ? AND published = 1").get(slug);
  if (!post) notFound();

  db.prepare("UPDATE posts SET views = views + 1 WHERE id = ?").run(post.id);

  const cat = post.category_id
    ? db.prepare("SELECT * FROM categories WHERE id = ?").get(post.category_id)
    : null;

  const prev = db
    .prepare("SELECT slug, title FROM posts WHERE published = 1 AND (created_at < ? OR (created_at = ? AND id < ?)) ORDER BY created_at DESC, id DESC LIMIT 1")
    .get(post.created_at, post.created_at, post.id);
  const next = db
    .prepare("SELECT slug, title FROM posts WHERE published = 1 AND (created_at > ? OR (created_at = ? AND id > ?)) ORDER BY created_at ASC, id ASC LIMIT 1")
    .get(post.created_at, post.created_at, post.id);

  const related = cat
    ? db
        .prepare(
          "SELECT p.*, c.name AS category_name FROM posts p LEFT JOIN categories c ON c.id = p.category_id WHERE p.published = 1 AND p.category_id = ? AND p.id != ? ORDER BY RANDOM() LIMIT 3"
        )
        .all(cat.id, post.id)
    : [];

  const inContentAd = getActiveAd("in_content");
  const contentRender = injectInContentAd(post.content, inContentAd ? inContentAd.html : null);

  return (
    <article className="max-w-3xl mx-auto">
      <nav className="text-sm text-gray-500 mb-3">
        <Link href="/" className="hover:text-[#c0562f]">דף הבית</Link>
        {" › "}
        {cat && (
          <>
            <Link href={`/category/${cat.slug}`} className="hover:text-[#c0562f]">{cat.name}</Link>
            {" › "}
          </>
        )}
        <span className="text-[#9c4123] font-medium">{post.title}</span>
      </nav>

      <h1 className="text-3xl md:text-4xl font-black text-[#4a3728] leading-tight">{post.title}</h1>
      <div className="flex items-center gap-3 mt-3 text-sm text-gray-400">
        {cat && (
          <Link href={`/category/${cat.slug}`} className="bg-[#c0562f]/10 text-[#c0562f] px-3 py-1 rounded-full font-bold text-xs">
            {cat.name}
          </Link>
        )}
        <time>{formatDateHe(post.created_at)}</time>
      </div>

      {post.featured_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.featured_image_url}
          alt={post.title}
          className="w-full rounded-2xl shadow-md mt-6 aspect-[16/9] object-cover bg-amber-50"
        />
      )}

      <div
        className="prose-recipe mt-8 text-[#4a3728]"
        dangerouslySetInnerHTML={{ __html: contentRender.html }}
      />

      {/* prev/next */}
      <nav className="grid grid-cols-2 gap-3 mt-10">
        <div>
          {prev && (
            <Link href={`/recipe/${prev.slug}`} className="block bg-white rounded-xl border border-amber-100 p-4 hover:border-[#c0562f] transition">
              <span className="text-xs text-gray-400">→ מתכון קודם</span>
              <div className="font-bold text-sm mt-1 line-clamp-2">{prev.title}</div>
            </Link>
          )}
        </div>
        <div>
          {next && (
            <Link href={`/recipe/${next.slug}`} className="block bg-white rounded-xl border border-amber-100 p-4 hover:border-[#c0562f] transition text-left">
              <span className="text-xs text-gray-400">מתכון הבא ←</span>
              <div className="font-bold text-sm mt-1 line-clamp-2">{next.title}</div>
            </Link>
          )}
        </div>
      </nav>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-2xl font-black text-[#4a3728] mb-4">מתכונים נוספים ב{cat.name}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {related.map((p) => (
              <RecipeCard key={p.id} post={p} categoryName={p.category_name} />
            ))}
          </div>
        </section>
      )}

      <CommentSection postId={post.id} />
    </article>
  );
}
