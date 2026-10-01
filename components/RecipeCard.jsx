import Link from "next/link";
import { formatDateHe } from "@/lib/util";

/**
 * Recipe card with layout variants for the (uneven) home grid:
 *  - size: "md" (default) | "lg" (hero card — larger type, taller image, 2×2 span handled by parent)
 *  - highlight: true → "מומלץ" badge + terracotta ring + slight lift
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
      className={`group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full ${
        lg ? "rounded-3xl" : ""
      } ${highlight ? "ring-2 ring-[#c0562f]/70 ring-offset-2 ring-offset-[#faf6f0]" : "border border-amber-100"}`}
    >
      <Link
        href={`/recipe/${post.slug}`}
        className={`block relative overflow-hidden bg-amber-50 ${lg ? "aspect-[16/10]" : "aspect-[4/3]"}`}
      >
        {post.featured_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.featured_image_url}
            alt={post.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center opacity-30 ${lg ? "text-7xl" : "text-5xl"}`}>🍳</div>
        )}
        {chips.length > 0 && (
          <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
            {chips.map((c, i) => (
              <span
                key={c.slug || c.name || i}
                className="bg-[#c0562f] text-white text-xs font-bold px-3 py-1 rounded-full shadow"
              >
                {c.name}
              </span>
            ))}
          </div>
        )}
        {highlight && (
          <span className="absolute bottom-3 left-3 bg-[#4a3728]/90 text-amber-200 text-xs font-bold px-3 py-1.5 rounded-full shadow flex items-center gap-1">
            ★ מומלץ
          </span>
        )}
      </Link>
      <div className={`flex flex-col flex-1 ${lg ? "p-6" : "p-4"}`}>
        <Link href={`/recipe/${post.slug}`}>
          <h3
            className={`font-black leading-snug text-[#4a3728] group-hover:text-[#c0562f] transition line-clamp-2 ${
              lg ? "text-2xl md:text-3xl" : "text-lg"
            }`}
          >
            {post.title}
          </h3>
        </Link>
        {post.excerpt && (
          <p className={`mt-1 text-gray-500 line-clamp-2 flex-1 ${lg ? "text-base" : "text-sm"}`}>{post.excerpt}</p>
        )}
        <time className={`mt-3 text-gray-400 ${lg ? "text-sm" : "text-xs"}`}>{formatDateHe(post.created_at)}</time>
      </div>
    </article>
  );
}
