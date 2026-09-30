import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function robots() {
  const base = process.env.SITE_URL || "http://localhost:3000";
  const posts = getDb().prepare("SELECT slug FROM posts WHERE published = 1").all();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
