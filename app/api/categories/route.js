import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const cats = getDb()
    .prepare(
      `SELECT c.id, c.slug, c.name, COUNT(p.id) cnt FROM categories c
       LEFT JOIN posts p ON p.category_id = c.id AND p.published = 1
       GROUP BY c.id HAVING cnt > 0 ORDER BY cnt DESC`
    )
    .all();
  return NextResponse.json(cats);
}
