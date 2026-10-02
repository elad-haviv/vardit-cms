import Link from "next/link";
import { formatDateHe } from "@/lib/util";

/**
 * Recipe card — "a photo pasted on paper".
 * Layout variants for the (uneven) home grid:
 *  - size: "md" (default) | "lg" (hero card — larger type, taller image, 2×2 span handled by parent)
 *  - highlight: true → saffron "מומלץ" tab + paprika ring
 */
export default function RecipeCard({ post, categories, categoryName, size = "md", highlight = false }) {
  const cats = Array.isArray(categories) && categories.length > 0
    ? categories
    : categoryName
      ? [{ name: categoryName }]
      : [];
  const chips = cats.slice(0, 2);
  const lg = size === "lg";

  return (
    <article
      className={`group recipe-card flex flex-col h-full overflow-hidden ${
        highlight ? "ring-2 ring-[var(--saffron)] ring-offset-2 ring-offset-[var(--paper)]" : ""
      }`}
    >
      <Link
        href={`/recipe/${post.slug}`}
        className={`block relative recipe-media ${lg ? "aspect-[16/10]" : "aspect-[4/3]"}`}
      >
        {post.featured_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.featured_image_url}
            alt={post.title}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center opacity-25 ${lg ? "text-7xl" : "text-5xl"}`}>🍳</div>
        )}
        {chips.length > 0 && (
          <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
            {chips.map((c, i) => (
              <span
                key={c.slug || c.name || i}
                className="bg-[var(--card)]/95 text-[var(--ink-deep)] border border-[var(--line)] text-xs font-bold px-2.5 py-1 rounded-md shadow-sm backdrop-blur-sm"
              >
                {c.name}
              </span>
            ))}
          </div>
        )}
        {highlight && (
          <span className="absolute bottom-3 right-3 bg-[var(--saffron)] text-[var(--ink-deep)] text-xs font-bold px-3 py-1.5 rounded-md shadow flex items-center gap-1">
            ★ מומלץ
          </span>
        )}
      </Link>
      <div className={`flex flex-col flex-1 ${lg ? "p-6" : "p-4"}`}>
        <Link href={`/recipe/${post.slug}`}>
          <h3
            className={`font-display leading-snug text-[var(--ink-deep)] group-hover:text-[var(--paprika-deep)] transition-colors line-clamp-2 ${
              lg ? "text-2xl md:text-3xl" : "text-lg"
            }`}
          >
            {post.title}
          </h3>
        </Link>
        {post.excerpt && (
          <p className={`mt-1.5 text-[var(--ink-soft)] line-clamp-2 flex-1 ${lg ? "text-base" : "text-sm"}`}>{post.excerpt}</p>
        )}
        <time className={`mt-3 pt-3 border-t border-[var(--line)] text-[var(--ink-soft)] ${lg ? "text-sm" : "text-xs"}`}>
          {formatDateHe(post.created_at)}
        </time>
      </div>
    </article>
  );
}
