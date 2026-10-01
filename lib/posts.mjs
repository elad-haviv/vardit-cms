// Data helpers shared by server actions and (for smoke tests) plain node scripts.
// Pure node:sqlite — no Next imports.

export const KEEP_VERSIONS = 20;

export function slugify(s) {
  return (s || "")
    .trim()
    .toLowerCase()
    .replace(/["'’׳]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-");
}

export function slugUnique(db, table, slug, excludeId) {
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

/** Snapshot the CURRENT row of a post into post_versions; keep last 20 per post. */
export function snapshotPostVersion(db, postId, comment = "") {
  const row = db.prepare("SELECT * FROM posts WHERE id = ?").get(postId);
  if (!row) return null;
  db.prepare(
    `INSERT INTO post_versions (post_id, title, slug, content, excerpt, featured_image_url, created_at, comment)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(row.id, row.title || "", row.slug || "", row.content || "", row.excerpt || "", row.featured_image_url || "", row.created_at || "", comment || "");
  const versions = db
    .prepare("SELECT id FROM post_versions WHERE post_id = ? ORDER BY id DESC")
    .all(postId);
  if (versions.length > KEEP_VERSIONS) {
    const stale = versions.slice(KEEP_VERSIONS).map((v) => v.id);
    db.prepare(
      `DELETE FROM post_versions WHERE id IN (${stale.map(() => "?").join(",")})`
    ).run(...stale);
  }
  return row.id;
}

/** Replace the category join rows for a post. */
export function setPostCategories(db, postId, categoryIds) {
  db.prepare("DELETE FROM post_categories WHERE post_id = ?").run(postId);
  const ins = db.prepare("INSERT OR IGNORE INTO post_categories (post_id, category_id) VALUES (?, ?)");
  for (const cid of categoryIds || []) {
    const id = Number(cid);
    if (id && db.prepare("SELECT 1 FROM categories WHERE id = ?").get(id)) ins.run(postId, id);
  }
}

/** Replace the tag rows for a post, creating missing tags on the fly. */
export function setPostTags(db, postId, tagNames) {
  db.prepare("DELETE FROM post_tags WHERE post_id = ?").run(postId);
  for (const raw of tagNames || []) {
    const name = String(raw || "").trim();
    if (!name) continue;
    const slug = slugify(name) || `tag-${db.prepare("SELECT COALESCE(MAX(id),0)+1 n FROM tags").get().n}`;
    let tag = db.prepare("SELECT id FROM tags WHERE name = ?").get(name) ||
      db.prepare("SELECT id FROM tags WHERE slug = ?").get(slug);
    if (!tag) {
      db.prepare("INSERT INTO tags (name, slug) VALUES (?, ?)").run(name, slug);
      tag = db.prepare("SELECT id FROM tags WHERE slug = ?").get(slug);
    }
    db.prepare("INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)").run(postId, tag.id);
  }
}

/**
 * Create/update a post. Returns {id, slug}.
 * fields: {id?, title, slug?, content?, excerpt?, featured_image_url?, published?,
 *          featured?, comments_enabled?, created_at?, categoryIds?, tags?}
 */
export function upsertPost(db, fields) {
  const id = fields.id ? Number(fields.id) : null;
  let slug = slugify(fields.slug || fields.title);
  const content = fields.content ?? "";
  const excerpt = fields.excerpt ?? "";
  const featured_image_url = (fields.featured_image_url || "").trim();
  const published = fields.published ? 1 : 0;
  const featured = fields.featured ? 1 : 0;
  const comments_enabled = fields.comments_enabled === undefined || fields.comments_enabled === null ? 1 : (fields.comments_enabled ? 1 : 0);

  if (!fields.created_at && !id) {
    fields.created_at = new Date().toISOString();
  }
  if (id) {
    slug = slugUnique(db, "posts", slug, id);
    db.prepare(
      `UPDATE posts SET title=?, slug=?, content=?, excerpt=?, featured_image_url=?, published=?, featured=?, comments_enabled=? WHERE id=?`
    ).run(fields.title, slug, content, excerpt, featured_image_url, published, featured, comments_enabled, id);
  } else {
    slug = slugUnique(db, "posts", slug);
    const res = db.prepare(
      `INSERT INTO posts (title, slug, content, excerpt, featured_image_url, published, featured, comments_enabled, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(fields.title, slug, content, excerpt, featured_image_url, published, featured, comments_enabled, fields.created_at || "");
    fields.id = Number(res.lastInsertRowid);
  }
  if (fields.categoryIds !== undefined) setPostCategories(db, fields.id, fields.categoryIds);
  if (fields.tags !== undefined) setPostTags(db, fields.id, fields.tags);
  return { id: fields.id, slug };
}

export function trashPost(db, postId) {
  db.prepare("UPDATE posts SET deleted_at = ? WHERE id = ?").run(Date.now(), postId);
}

export function restorePost(db, postId) {
  db.prepare("UPDATE posts SET deleted_at = NULL WHERE id = ?").run(postId);
}

export function permanentDeletePost(db, postId) {
  db.prepare("DELETE FROM comments WHERE post_id = ?").run(postId);
  db.prepare("DELETE FROM post_categories WHERE post_id = ?").run(postId);
  db.prepare("DELETE FROM post_tags WHERE post_id = ?").run(postId);
  db.prepare("DELETE FROM post_versions WHERE post_id = ?").run(postId);
  db.prepare("DELETE FROM posts WHERE id = ?").run(postId);
}

/** Grouped per-post category lists: Map post_id -> [{id, name, slug}] */
export function getPostCategoryLists(db, postIds) {
  const map = new Map();
  if (!postIds || postIds.length === 0) return map;
  const marks = postIds.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT pc.post_id, c.id, c.name, c.slug FROM post_categories pc
       JOIN categories c ON c.id = pc.category_id
       WHERE pc.post_id IN (${marks}) ORDER BY c.name`
    )
    .all(...postIds);
  for (const r of rows) {
    if (!map.has(r.post_id)) map.set(r.post_id, []);
    map.get(r.post_id).push({ id: r.id, name: r.name, slug: r.slug });
  }
  return map;
}

/** Grouped per-post tag lists: Map post_id -> [{id, name, slug}] */
export function getPostTagLists(db, postIds) {
  const map = new Map();
  if (!postIds || postIds.length === 0) return map;
  const marks = postIds.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT pt.post_id, t.id, t.name, t.slug FROM post_tags pt
       JOIN tags t ON t.id = pt.tag_id WHERE pt.post_id IN (${marks}) ORDER BY t.name`
    )
    .all(...postIds);
  for (const r of rows) {
    if (!map.has(r.post_id)) map.set(r.post_id, []);
    map.get(r.post_id).push({ id: r.id, name: r.name, slug: r.slug });
  }
  return map;
}

export function parseIds(json) {
  try {
    const arr = JSON.parse(json || "[]");
    return Array.isArray(arr) ? arr.map(Number).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function parseTagNames(json) {
  try {
    const arr = JSON.parse(json || "[]");
    return Array.isArray(arr) ? arr.map(String).map((s) => s.trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}
