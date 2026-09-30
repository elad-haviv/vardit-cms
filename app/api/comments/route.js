import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

// simple in-memory rate limiter: 1 comment per IP per 60s
const rateMap = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const last = rateMap.get(ip) || 0;
  if (now - last < 60_000) return true;
  rateMap.set(ip, now);
  // prune
  if (rateMap.size > 1000) {
    for (const [k, v] of rateMap) if (now - v > 120_000) rateMap.delete(k);
  }
  return false;
}

export async function POST(req) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "שלחת תגובה לאחרונה. נסה שוב בעוד דקה." }, { status: 429 });
  }
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }
  // honeypot
  if (body.website) return NextResponse.json({ ok: true });
  const name = (body.name || "").trim().slice(0, 100);
  const text = (body.body || "").trim().slice(0, 5000);
  const postId = Number(body.post_id);
  if (!name || !text || !postId) {
    return NextResponse.json({ error: "נא למלא שם ותוכן תגובה" }, { status: 400 });
  }
  const post = getDb().prepare("SELECT id FROM posts WHERE id = ?").get(postId);
  if (!post) return NextResponse.json({ error: "מתכון לא נמצא" }, { status: 404 });
  getDb()
    .prepare("INSERT INTO comments (post_id, name, body, created_at, approved) VALUES (?, ?, ?, ?, 0)")
    .run(postId, name, text, new Date().toISOString());
  return NextResponse.json({ ok: true, message: "תודה! התגובה התקבלה ותפורסם לאחר אישור המנהל." });
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const postId = Number(searchParams.get("post_id"));
  if (!postId) return NextResponse.json([]);
  const rows = getDb()
    .prepare(
      `SELECT id, name, body, created_at FROM comments
       WHERE post_id = ? AND approved = 1 ORDER BY created_at ASC`
    )
    .all(postId);
  const e = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = rows
    .map(
      (r) => `<li class="bg-white rounded-xl border border-amber-100 p-4"><div class="flex justify-between items-baseline"><span class="font-bold text-[#9c4123]">${e(r.name)}</span><time class="text-xs text-gray-400">${new Date(r.created_at).toLocaleDateString("he-IL")}</time></div><p class="mt-1 text-sm whitespace-pre-wrap">${e(r.body)}</p></li>`
    )
    .join("");
  return new NextResponse(`<ul class="space-y-3">${html}</ul>`, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
