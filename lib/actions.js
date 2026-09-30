"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  isAuthenticated,
  createSessionValue,
  setSessionCookie,
  clearSessionCookie,
  ADMIN_PASSWORD,
} from "@/lib/auth";
import { getDb, setSetting } from "@/lib/db";

async function requireAuth() {
  if (!(await isAuthenticated())) redirect("/admin/login");
}

export async function loginAction(formData) {
  const username = String(formData.get("username") || "");
  const password = String(formData.get("password") || "");
  if (username !== "admin" || password !== ADMIN_PASSWORD) {
    redirect("/admin/login?error=1");
  }
  await setSessionCookie(createSessionValue("admin"));
  redirect("/admin");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/admin/login");
}

const slugify = (s) =>
  (s || "")
    .trim()
    .toLowerCase()
    .replace(/["'’׳]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-");

function slugUnique(table, slug, excludeId) {
  const db = getDb();
  let candidate = slug;
  let i = 2;
  while (true) {
    const row = excludeId
      ? db.prepare(`SELECT 1 FROM ${table} WHERE slug = ? AND id != ?`).get(candidate, excludeId)
      : db.prepare(`SELECT 1 FROM ${table} WHERE slug = ?`).get(candidate);
    if (!row) return candidate;
    candidate = `${slug}-${i++}`;
  }
}

export async function savePost(formData) {
  await requireAuth();
  const db = getDb();
  const id = Number(formData.get("id")) || null;
  const title = String(formData.get("title") || "").trim();
  let slug = slugify(String(formData.get("slug") || "") || title);
  const content = String(formData.get("content") || "");
  const excerpt = String(formData.get("excerpt") || "");
  const category_id = Number(formData.get("category_id")) || null;
  const featured_image_url = String(formData.get("featured_image_url") || "").trim();
  const published = formData.get("published") ? 1 : 0;
  const featured = formData.get("featured") ? 1 : 0;
  if (!title) redirect("/admin/recipes?error=missing-title");

  if (id) {
    slug = slugUnique("posts", slug, id);
    db.prepare(
      `UPDATE posts SET title=?, slug=?, content=?, excerpt=?, category_id=?, featured_image_url=?, published=?, featured=? WHERE id=?`
    ).run(title, slug, content, excerpt, category_id, featured_image_url, published, featured, id);
  } else {
    slug = slugUnique("posts", slug);
    db.prepare(
      `INSERT INTO posts (title, slug, content, excerpt, category_id, featured_image_url, published, featured, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(title, slug, content, excerpt, category_id, featured_image_url, published, featured, new Date().toISOString());
  }
  revalidatePath("/");
  revalidatePath("/recipes");
  revalidatePath(`/recipe/${slug}`);
  redirect("/admin/recipes?saved=1");
}

export async function deletePost(formData) {
  await requireAuth();
  const id = Number(formData.get("id"));
  const db = getDb();
  db.prepare("DELETE FROM comments WHERE post_id = ?").run(id);
  db.prepare("DELETE FROM posts WHERE id = ?").run(id);
  revalidatePath("/recipes");
  redirect("/admin/recipes?deleted=1");
}

export async function saveCategory(formData) {
  await requireAuth();
  const db = getDb();
  const id = Number(formData.get("id")) || null;
  const name = String(formData.get("name") || "").trim();
  const slug = slugUnique("categories", slugify(String(formData.get("slug") || "") || name), id || undefined);
  if (!name) redirect("/admin/categories?error=1");
  if (id) db.prepare("UPDATE categories SET name=?, slug=? WHERE id=?").run(name, slug, id);
  else db.prepare("INSERT INTO categories (name, slug) VALUES (?, ?)").run(name, slug);
  revalidatePath("/");
  redirect("/admin/categories?saved=1");
}

export async function deleteCategory(formData) {
  await requireAuth();
  const id = Number(formData.get("id"));
  getDb().prepare("UPDATE posts SET category_id = NULL WHERE category_id = ?").run(id);
  getDb().prepare("DELETE FROM categories WHERE id = ?").run(id);
  redirect("/admin/categories?deleted=1");
}

export async function savePage(formData) {
  await requireAuth();
  const db = getDb();
  const id = Number(formData.get("id")) || null;
  const title = String(formData.get("title") || "").trim();
  const slug = slugUnique("pages", slugify(String(formData.get("slug") || "") || title), id || undefined);
  const html = String(formData.get("html") || "");
  const published = formData.get("published") ? 1 : 0;
  if (!title) redirect("/admin/pages?error=1");
  if (id) db.prepare("UPDATE pages SET title=?, slug=?, html=?, published=? WHERE id=?").run(title, slug, html, published, id);
  else db.prepare("INSERT INTO pages (title, slug, html, published) VALUES (?, ?, ?, ?)").run(title, slug, html, published);
  revalidatePath(`/page/${slug}`);
  redirect("/admin/pages?saved=1");
}

export async function deletePage(formData) {
  await requireAuth();
  getDb().prepare("DELETE FROM pages WHERE id = ?").run(Number(formData.get("id")));
  redirect("/admin/pages?deleted=1");
}

export async function moderateComment(formData) {
  await requireAuth();
  const id = Number(formData.get("id"));
  const action = String(formData.get("action") || "");
  const db = getDb();
  if (action === "approve") db.prepare("UPDATE comments SET approved = 1 WHERE id = ?").run(id);
  else db.prepare("DELETE FROM comments WHERE id = ?").run(id);
  revalidatePath("/admin/comments");
  redirect("/admin/comments");
}

export async function saveAd(formData) {
  await requireAuth();
  const slot = String(formData.get("slot") || "");
  const html = String(formData.get("html") || "");
  const enabled = formData.get("enabled") ? 1 : 0;
  const db = getDb();
  db.prepare(
    `INSERT INTO ads (slot, html, enabled) VALUES (?, ?, ?)
     ON CONFLICT(slot) DO UPDATE SET html = excluded.html, enabled = excluded.enabled`
  ).run(slot, html, enabled);
  revalidatePath("/");
  redirect("/admin/ads?saved=1");
}

export async function saveSettings(formData) {
  await requireAuth();
  const keys = ["site_title", "site_subtitle", "youtube_url", "facebook_url"];
  for (const k of keys) {
    const v = String(formData.get(k) || "").trim();
    if (v) setSetting(k, v);
  }
  revalidatePath("/");
  redirect("/admin/settings?saved=1");
}
