import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function sitemap() {
  const db = getDb();
  const base = process.env.SITE_URL || "http://localhost:3000";
  const posts = db.prepare("SELECT slug, created_at FROM posts WHERE published = 1 AND deleted_at IS NULL").all();
  const cats = db.prepare("SELECT slug FROM categories").all();
  const pages = db.prepare("SELECT slug FROM pages WHERE published = 1").all();
  const tags = db.prepare("SELECT slug FROM tags").all();
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/recipes`, changeFrequency: "daily", priority: 0.9 },
    ...cats.map((c) => ({ url: `${base}/category/${c.slug}`, changeFrequency: "weekly", priority: 0.7 })),
    ...tags.map((t) => ({ url: `${base}/tag/${t.slug}`, changeFrequency: "weekly", priority: 0.5 })),
    ...posts.map((p) => ({
      url: `${base}/recipe/${p.slug}`,
      lastModified: p.created_at ? new Date(p.created_at) : undefined,
      priority: 0.8,
    })),
    ...pages.map((p) => ({ url: `${base}/page/${p.slug}`, priority: 0.4 })),
  ];
}
