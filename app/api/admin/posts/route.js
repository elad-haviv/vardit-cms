import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Admin post search: GET /api/admin/posts?q=<text>&limit=10 -> [{id, title}] */
export async function GET(req) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const limit = Math.min(30, Math.max(1, Number(url.searchParams.get("limit")) || 10));
  const db = getDb();
  let rows;
  if (q) {
    rows = db
      .prepare(
        "SELECT id, title FROM posts WHERE deleted_at IS NULL AND title LIKE ? ORDER BY created_at DESC LIMIT ?"
      )
      .all(`%${q}%`, limit);
  } else {
    rows = db
      .prepare("SELECT id, title FROM posts WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT ?")
      .all(limit);
  }
  return NextResponse.json({ ok: true, posts: rows });
}
