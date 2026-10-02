import Link from "next/link";
import { notFound } from "next/navigation";
import RecipeCard from "@/components/RecipeCard";
import CommentSection from "@/components/CommentSection";
import { formatDateHe, injectInContentAd, stripHtml } from "@/lib/util";
import { decodeSlug } from "@/lib/util";
import { getDb, getActiveAd } from "@/lib/db";
import { getPostCategoryLists, getPostTagLists } from "@/lib/posts.mjs";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug: rawSlug } = await params;
  const slug = decodeSlug(rawSlug);
  const post = getDb().prepare("SELECT * FROM posts WHERE slug = ? AND published = 1 AND deleted_at IS NULL").get(slug);
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
  const post = db.prepare("SELECT * FROM posts WHERE slug = ? AND published = 1 AND deleted_at IS NULL").get(slug);
  if (!post) notFound();

  db.prepare("UPDATE posts SET views = views + 1 WHERE id = ?").run(post.id);

  const catLists = getPostCategoryLists(db, [post.id]);
  const cats = catLists.get(post.id) || [];
  const cat = cats[0] || null;

  const tagLists = getPostTagLists(db, [post.id]);
  const tags = tagLists.get(post.id) || [];

  const prev = db
    .prepare("SELECT slug, title FROM posts WHERE published = 1 AND deleted_at IS NULL AND (created_at < ? OR (created_at = ? AND id < ?)) ORDER BY created_at DESC, id DESC LIMIT 1")
    .get(post.created_at, post.created_at, post.id);
  const next = db
    .prepare("SELECT slug, title FROM posts WHERE published = 1 AND deleted_at IS NULL AND (created_at > ? OR (created_at = ? AND id > ?)) ORDER BY created_at ASC, id ASC LIMIT 1")
    .get(post.created_at, post.created_at, post.id);

  const relatedCatIds = cats.map((c) => c.id);
  let related = [];
  if (relatedCatIds.length > 0) {
    const marks = relatedCatIds.map(() => "?").join(",");
    related = db
      .prepare(
        `SELECT p.* FROM posts p
         JOIN post_categories pc ON pc.post_id = p.id
         WHERE p.published = 1 AND p.deleted_at IS NULL AND p.id != ?
           AND pc.category_id IN (${marks})
         GROUP BY p.id ORDER BY RANDOM() LIMIT 3`
      )
      .all(post.id, ...relatedCatIds);
    const relCatMap = getPostCategoryLists(db, related.map((r) => r.id));
    related = related.map((r) => ({ ...r, _cats: relCatMap.get(r.id) || [] }));
  }

  const commentsEnabled = post.comments_enabled !== 0;

  const inContentAd = getActiveAd("in_content");
  const contentRender = injectInContentAd(post.content, inContentAd ? inContentAd.html : null);

  return (
    <article className="max-w-3xl mx-auto">
      <nav className="text-sm text-[var(--ink-soft)] mb-3">
        <Link href="/" className="hover:text-[var(--paprika-deep)]">דף הבית</Link>
        {cat && (
          <>
            {" › "}
            <Link href={`/category/${cat.slug}`} className="hover:text-[var(--paprika-deep)]">{cat.name}</Link>
          </>
        )}
        {" › "}
        <span className="text-[var(--paprika-deep)] font-medium">{post.title}</span>
      </nav>

      <h1 className="text-3xl md:text-4xl font-display text-[var(--ink-deep)] leading-tight">{post.title}</h1>
      <div className="flex items-center flex-wrap gap-2 mt-3 text-sm text-[var(--ink-soft)]">
        {cats.map((c) => (
          <Link
            key={c.id}
            href={`/category/${c.slug}`}
            className="bg-[var(--paprika)]/10 text-[var(--paprika-deep)] px-3 py-1 rounded-full font-bold text-xs"
          >
            {c.name}
          </Link>
        ))}
        <time>{formatDateHe(post.created_at)}</time>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {tags.map((t) => (
            <Link
              key={t.id}
              href={`/tag/${t.slug}`}
              className="bg-[var(--paper-deep)] text-[var(--paprika-deep)] hover:bg-[var(--paper-deep)] px-2.5 py-0.5 rounded-full font-medium text-xs transition"
            >
              #{t.name}
            </Link>
          ))}
        </div>
      )}

      {post.featured_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.featured_image_url}
          alt={post.title}
          className="w-full rounded-2xl shadow-md mt-6 aspect-[16/9] object-cover bg-[var(--paper-deep)]"
        />
      )}

      <div
        className="prose-recipe mt-8 text-[var(--ink-deep)]"
        dangerouslySetInnerHTML={{ __html: contentRender.html }}
      />

      {/* prev/next */}
      <nav className="grid grid-cols-2 gap-3 mt-10">
        <div>
          {prev && (
            <Link href={`/recipe/${prev.slug}`} className="block bg-[var(--card)] rounded-xl border border-[var(--line)] p-4 hover:border-[var(--paprika)] transition">
              <span className="text-xs text-[var(--ink-soft)]">→ מתכון קודם</span>
              <div className="font-bold text-sm mt-1 line-clamp-2">{prev.title}</div>
            </Link>
          )}
        </div>
        <div>
          {next && (
            <Link href={`/recipe/${next.slug}`} className="block bg-[var(--card)] rounded-xl border border-[var(--line)] p-4 hover:border-[var(--paprika)] transition text-left">
              <span className="text-xs text-[var(--ink-soft)]">מתכון הבא ←</span>
              <div className="font-bold text-sm mt-1 line-clamp-2">{next.title}</div>
            </Link>
          )}
        </div>
      </nav>

      {related.length > 0 && cat && (
        <section className="mt-12">
          <h2 className="text-2xl font-display text-[var(--ink-deep)] mb-4">מתכונים נוספים ב{cat.name}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {related.map((p) => (
              <RecipeCard key={p.id} post={p} categories={p._cats} />
            ))}
          </div>
        </section>
      )}

      {commentsEnabled && <CommentSection postId={post.id} />}
    </article>
  );
}
