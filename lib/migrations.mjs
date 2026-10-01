// Iteration-1 schema: multi-category join, tags, versions, trash, comments_enabled,
// enriched categories, links setting. Idempotent — safe to run on every boot.
// Pure node:sqlite (no Next imports) so scripts can apply it to data/vardit.db directly.

export function ensureSchema(db) {
  db.exec(`
CREATE TABLE IF NOT EXISTS post_categories (
  post_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  UNIQUE(post_id, category_id)
);
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS post_tags (
  post_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  UNIQUE(post_id, tag_id)
);
CREATE TABLE IF NOT EXISTS post_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  slug TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  excerpt TEXT NOT NULL DEFAULT '',
  featured_image_url TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT '',
  comment TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_post_categories_post ON post_categories(post_id);
CREATE INDEX IF NOT EXISTS idx_post_categories_cat ON post_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_post ON post_tags(post_id);
CREATE INDEX IF NOT EXISTS idx_post_tags_tag ON post_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_post_versions_post ON post_versions(post_id);
`);

  const tryAlter = (sql) => {
    try { db.exec(sql); } catch { /* column already exists */ }
  };
  tryAlter("ALTER TABLE posts ADD COLUMN deleted_at");
  tryAlter("ALTER TABLE posts ADD COLUMN comments_enabled INTEGER NOT NULL DEFAULT 1");
  tryAlter("ALTER TABLE categories ADD COLUMN description TEXT NOT NULL DEFAULT ''");
  tryAlter("ALTER TABLE categories ADD COLUMN image_url TEXT NOT NULL DEFAULT ''");

  // Backfill join table from legacy posts.category_id (idempotent via UNIQUE pair).
  db.exec(`
INSERT OR IGNORE INTO post_categories (post_id, category_id)
SELECT id, category_id FROM posts WHERE category_id IS NOT NULL;
`);

  // Migrate the fixed YouTube/Facebook URLs into the 'links' setting (JSON list).
  const hasLinks = db.prepare("SELECT value FROM settings WHERE key = 'links'").get();
  if (!hasLinks) {
    const yt = db.prepare("SELECT value FROM settings WHERE key = 'youtube_url'").get()?.value || "";
    const fb = db.prepare("SELECT value FROM settings WHERE key = 'facebook_url'").get()?.value || "";
    const links = [];
    if (yt) links.push({ name: "YouTube", url: yt });
    if (fb) links.push({ name: "Facebook", url: fb });
    if (links.length > 0) {
      db.prepare("INSERT INTO settings (key, value) VALUES ('links', ?)").run(JSON.stringify(links));
    }
  }
  return db;
}
