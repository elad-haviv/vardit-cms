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
import {
  upsertPost,
  snapshotPostVersion,
  trashPost,
  restorePost,
  permanentDeletePost,
  parseIds,
  parseTagNames,
  slugify,
  slugUnique,
} from "@/lib/posts.mjs";

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

export async function savePost(formData) {
  await requireAuth();
  const db = getDb();
  const id = Number(formData.get("id")) || null;
  const title = String(formData.get("title") || "").trim();
  if (!title) redirect("/admin/recipes?error=missing-title");

  // Version control: snapshot the CURRENT row before applying changes.
  const versionComment = String(formData.get("version_comment") || "").trim();
  if (id) snapshotPostVersion(db, id, versionComment);

  const { id: savedId } = upsertPost(db, {
    id,
    title,
    slug: String(formData.get("slug") || ""),
    content: String(formData.get("content") || ""),
    excerpt: String(formData.get("excerpt") || ""),
    featured_image_url: String(formData.get("featured_image_url") || "").trim(),
    published: formData.get("published") ? 1 : 0,
    featured: formData.get("featured") ? 1 : 0,
    comments_enabled: formData.get("comments_enabled") ? 1 : 0,
    categoryIds: parseIds(String(formData.get("category_ids") || "[]")),
    tags: parseTagNames(String(formData.get("tags") || "[]")),
  });

  revalidatePath("/");
  revalidatePath("/recipes");
  redirect("/admin/recipes?saved=1");
}

/** Soft delete → trash (recipe disappears from all public queries and the default admin list). */
export async function trashPostAction(formData) {
  await requireAuth();
  trashPost(getDb(), Number(formData.get("id")));
  revalidatePath("/recipes");
  revalidatePath("/");
  redirect("/admin/recipes?trashed=1");
}

export async function restorePostAction(formData) {
  await requireAuth();
  restorePost(getDb(), Number(formData.get("id")));
  revalidatePath("/recipes");
  revalidatePath("/");
  redirect("/admin/recipes/trash?restored=1");
}

/** Permanent delete — deletes the row and all related rows. Confirm dialog handled client-side. */
export async function permanentDeletePostAction(formData) {
  await requireAuth();
  permanentDeletePost(getDb(), Number(formData.get("id")));
  revalidatePath("/recipes");
  revalidatePath("/");
  redirect("/admin/recipes/trash?deleted=1");
}

/** Restore a post version: snapshots the pre-restore state, then applies the version fields. */
export async function restorePostVersion(formData) {
  await requireAuth();
  const db = getDb();
  const versionId = Number(formData.get("version_id"));
  const version = db.prepare("SELECT * FROM post_versions WHERE id = ?").get(versionId);
  if (!version) redirect("/admin/recipes");
  snapshotPostVersion(db, version.post_id, `לפני שחזור גרסה #${versionId}`);
  const slug = slugUnique(db, "posts", slugify(version.slug) || "post", version.post_id);
  db.prepare(
    `UPDATE posts SET title=?, slug=?, content=?, excerpt=?, featured_image_url=? WHERE id=?`
  ).run(version.title, slug, version.content, version.excerpt, version.featured_image_url, version.post_id);
  const postSlug = db.prepare("SELECT slug FROM posts WHERE id = ?").get(version.post_id)?.slug;
  revalidatePath("/");
  revalidatePath("/recipes");
  redirect(`/admin/recipes/${version.post_id}?restored=1`);
}

export async function saveCategory(formData) {
  await requireAuth();
  const db = getDb();
  const id = Number(formData.get("id")) || null;
  const name = String(formData.get("name") || "").trim();
  if (!name) redirect("/admin/categories?error=1");
  const description = String(formData.get("description") || "");
  const image_url = String(formData.get("image_url") || "").trim();
  let slug = slugify(String(formData.get("slug") || "") || name);
  let candidate = slug;
  let i = 2;
  while (db.prepare("SELECT 1 FROM categories WHERE slug = ? AND id != ?").get(candidate, id || 0)) {
    candidate = `${slug}-${i++}`;
  }
  if (id) {
    db.prepare("UPDATE categories SET name=?, slug=?, description=?, image_url=? WHERE id=?").run(name, candidate, description, image_url, id);
  } else {
    db.prepare("INSERT INTO categories (name, slug, description, image_url) VALUES (?, ?, ?, ?)").run(name, candidate, description, image_url);
  }
  revalidatePath("/");
  redirect("/admin/categories?saved=1");
}

export async function deleteCategory(formData) {
  await requireAuth();
  const id = Number(formData.get("id"));
  const db = getDb();
  db.prepare("UPDATE posts SET category_id = NULL WHERE category_id = ?").run(id);
  db.prepare("DELETE FROM post_categories WHERE category_id = ?").run(id);
  db.prepare("DELETE FROM categories WHERE id = ?").run(id);
  revalidatePath("/");
  redirect("/admin/categories?deleted=1");
}

export async function savePage(formData) {
  await requireAuth();
  const db = getDb();
  const id = Number(formData.get("id")) || null;
  const title = String(formData.get("title") || "").trim();
  if (!title) redirect("/admin/pages?error=1");
  let slug = slugify(String(formData.get("slug") || "") || title);
  let candidate = slug;
  let i = 2;
  while (db.prepare("SELECT 1 FROM pages WHERE slug = ? AND id != ?").get(candidate, id || 0)) {
    candidate = `${slug}-${i++}`;
  }
  const html = String(formData.get("html") || "");
  const published = formData.get("published") ? 1 : 0;
  if (id) db.prepare("UPDATE pages SET title=?, slug=?, html=?, published=? WHERE id=?").run(title, candidate, html, published, id);
  else db.prepare("INSERT INTO pages (title, slug, html, published) VALUES (?, ?, ?, ?)").run(title, candidate, html, published);
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

/** Settings: site title/subtitle + the dynamic links list (JSON rows). */
export async function saveSettings(formData) {
  await requireAuth();
  const keys = ["site_title", "site_subtitle", "hero_title", "hero_subtitle"];
  for (const k of keys) {
    const v = String(formData.get(k) || "").trim();
    if (v) setSetting(k, v);
  }

  // Hero image is always settable (empty clears it back to the default gradient hero)
  const heroImage = String(formData.get("hero_image") || "").trim();
  setSetting("hero_image", heroImage);

  // Dynamic links manager: rows arrive serialized as JSON [{name, url}]
  try {
    const raw = String(formData.get("links_json") || "[]");
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      const links = arr
        .map((r) => ({ name: String(r.name || "").trim(), url: String(r.url || "").trim() }))
        .filter((r) => r.name && r.url);
      setSetting("links", JSON.stringify(links));
    }
  } catch {
    // invalid JSON — leave existing links untouched
  }
  revalidatePath("/");
  redirect("/admin/settings?saved=1");
}

/* ===== Scheduled home features (featured recipes with date ranges) ===== */

export async function saveFeature(formData) {
  await requireAuth();
  const db = getDb();
  const postId = Number(formData.get("post_id"));
  const startDate = String(formData.get("start_date") || "").trim();
  const endDate = String(formData.get("end_date") || "").trim();
  if (!postId || !db.prepare("SELECT id FROM posts WHERE id = ?").get(postId)) {
    redirect("/admin/featured?error=1");
  }
  // normalize dates to YYYY-MM-DD (without time)
  const norm = (d) => (d ? d.slice(0, 10) : "");
  db.prepare(
    "INSERT INTO features (post_id, start_date, end_date, created_at) VALUES (?, ?, ?, ?)"
  ).run(postId, norm(startDate), norm(endDate), new Date().toISOString());
  revalidatePath("/");
  redirect("/admin/featured?saved=1");
}

export async function deleteFeature(formData) {
  await requireAuth();
  const db = getDb();
  db.prepare("DELETE FROM features WHERE id = ?").run(Number(formData.get("id")));
  revalidatePath("/");
  redirect("/admin/featured?deleted=1");
}
