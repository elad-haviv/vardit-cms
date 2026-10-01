import Link from "next/link";
import { formatDateHe } from "@/lib/util";

/** categories: array of {id, name, slug} — renders up to 2 chips on the image. */
export default function RecipeCard({ post, categories, categoryName }) {
  const cats = Array.isArray(categories) && categories.length > 0
    ? categories
    : categoryName
      ? [{ name: categoryName }]
      : [];
  const chips = cats.slice(0, 2);
  return (
    <article className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-amber-100 flex flex-col">
      <Link href={`/recipe/${post.slug}`} className="block relative aspect-[4/3] overflow-hidden bg-amber-50">
        {post.featured_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.featured_image_url}
            alt={post.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl opacity-30">🍳</div>
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
      </Link>
      <div className="p-4 flex flex-col flex-1">
        <Link href={`/recipe/${post.slug}`}>
          <h3 className="font-bold text-lg leading-snug text-[#4a3728] group-hover:text-[#c0562f] transition line-clamp-2">
            {post.title}
          </h3>
        </Link>
        {post.excerpt && (
          <p className="mt-1 text-sm text-gray-500 line-clamp-2 flex-1">{post.excerpt}</p>
        )}
        <time className="mt-3 text-xs text-gray-400">{formatDateHe(post.created_at)}</time>
      </div>
    </article>
  );
}
