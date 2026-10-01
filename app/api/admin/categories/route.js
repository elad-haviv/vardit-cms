import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { slugify } from "@/lib/posts.mjs";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const cats = getDb().prepare("SELECT id, name, slug FROM categories ORDER BY name").all();
  return NextResponse.json({ ok: true, categories: cats });
}

export async function POST(req) {
  const denied = await requireAdmin();
  if (denied) return denied;
  let body;
  try { body = await req.json(); } catch { body = {}; }
  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "missing name" }, { status: 400 });

  const db = getDb();
  const existing = db.prepare("SELECT id, name, slug FROM categories WHERE name = ?").get(name);
  if (existing) return NextResponse.json({ ok: true, category: existing, existed: true });

  let slug = slugify(name);
  let candidate = slug;
  let i = 2;
  while (db.prepare("SELECT 1 FROM categories WHERE slug = ?").get(candidate)) {
    candidate = `${slug}-${i++}`;
  }
  const res = db.prepare("INSERT INTO categories (name, slug) VALUES (?, ?)").run(name, candidate);
  return NextResponse.json({
    ok: true,
    category: { id: Number(res.lastInsertRowid), name, slug: candidate },
  });
}
