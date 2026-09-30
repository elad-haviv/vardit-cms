#!/usr/bin/env node
/**
 * WordPress -> SQLite migration for vardit.co.il
 * Idempotent: upserts by slug. Run with: npm run import
 */
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const BASE = process.env.WP_BASE || "https://vardit.co.il";
const DATA_DIR = process.env.VARDIT_DATA_DIR || path.join(process.cwd(), "data");
const DB_PATH = process.env.VARDIT_DB_PATH || path.join(DATA_DIR, "vardit.db");
const DELAY = Number(process.env.WP_DELAY_MS || 300);

fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL;");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url, attempt = 1) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "vardit-cms-import/1.0" },
      signal: AbortSignal.timeout(30000),
    });
    if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    if (attempt >= 4) throw e;
    console.log(`  retry ${attempt} for ${url} (${e.message})`);
    await sleep(2000 * attempt);
    return fetchJson(url, attempt + 1);
  }
}

async function fetchAll(endpoint) {
  const items = [];
  let page = 1;
  while (true) {
    const url = `${BASE}/wp-json/wp/v2/${endpoint}?per_page=100&page=${page}&_embed=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "vardit-cms-import/1.0" },
      signal: AbortSignal.timeout(30000),
    });
    if (res.status === 400 && page > 1) break; // past last page
    if (!res.ok) {
      if (res.status === 400) break;
      throw new Error(`${endpoint} page ${page}: HTTP ${res.status}`);
    }
    const batch = await res.json();
    items.push(...batch);
    console.log(`${endpoint} page ${page}: +${batch.length} (total ${items.length})`);
    if (batch.length < 100) break;
    page++;
    await sleep(DELAY);
  }
  return items;
}

function safeDecode(s) {
  if (!s) return s;
  try { return decodeURIComponent(s); } catch { return s; }
}

function stripShortcodes(html) {
  return (html || "")
    .replace(/\[\/?[a-zA-Z0-9_-]+[^\]]*\]/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .trim();
}

// schema (mirrors lib/db.js)
db.exec(`
CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, content TEXT NOT NULL DEFAULT '', excerpt TEXT NOT NULL DEFAULT '', category_id INTEGER, featured_image_url TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT '', published INTEGER NOT NULL DEFAULT 1, featured INTEGER NOT NULL DEFAULT 0, views INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS pages (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, html TEXT NOT NULL DEFAULT '', published INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY AUTOINCREMENT, post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE, name TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT '', approved INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS ads (id INTEGER PRIMARY KEY AUTOINCREMENT, slot TEXT NOT NULL UNIQUE, html TEXT NOT NULL DEFAULT '', enabled INTEGER NOT NULL DEFAULT 0);
`);

// --- settings defaults ---
const defaults = {
  site_title: "ורדית חביב",
  site_subtitle: "מתכונים מבית סבתא",
  youtube_url: "https://www.youtube.com/channel/UC0CXSMXspDmGrtJ876QU6QA",
  facebook_url: "https://www.facebook.com/1504309176316516",
};
const insSetting = db.prepare(
  "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING"
);
for (const [k, v] of Object.entries(defaults)) insSetting.run(k, v);
for (const s of ["header", "sidebar", "in_content", "between_cards", "footer"])
  db.prepare("INSERT OR IGNORE INTO ads (slot, html, enabled) VALUES (?, '', 0)").run(s);

// --- categories ---
console.log("Fetching categories...");
const cats = await fetchAll("categories");
const upCat = db.prepare(
  "INSERT INTO categories (name, slug) VALUES (?, ?) ON CONFLICT(slug) DO UPDATE SET name = excluded.name"
);
for (const c of cats) {
  if (!c.name || !c.slug) continue;
  upCat.run(c.name, safeDecode(c.slug));
}
const catRows = db.prepare("SELECT * FROM categories").all();
const catBySlug = new Map(catRows.map((c) => [c.slug, c.id]));
const catByWpId = new Map(cats.map((c) => [c.id, catBySlug.get(safeDecode(c.slug)) || null]));
console.log(`Categories: ${cats.length} fetched, ${catRows.length} in DB`);

// --- posts ---
console.log("Fetching posts...");
const posts = await fetchAll("posts");
const upPost = db.prepare(`INSERT INTO posts (title, slug, content, excerpt, category_id, featured_image_url, created_at, published)
  VALUES (@title, @slug, @content, @excerpt, @category_id, @featured_image_url, @created_at, 1)
  ON CONFLICT(slug) DO UPDATE SET
    title = excluded.title, content = excluded.content, excerpt = excluded.excerpt,
    category_id = excluded.category_id, featured_image_url = excluded.featured_image_url,
    created_at = excluded.created_at`);
const postSlugToId = new Map();
const wpIdToLocal = new Map();
let mediaMisses = 0;
for (const p of posts) {
  if (!p.slug) continue;
  let img = "";
  if (p._embedded?.["wp:featuredmedia"]?.[0]?.source_url) {
    img = p._embedded["wp:featuredmedia"][0].source_url;
  } else if (p.featured_media) {
    try {
      const m = await fetchJson(`${BASE}/wp-json/wp/v2/media/${p.featured_media}`);
      img = m?.source_url || "";
      await sleep(DELAY);
    } catch {
      mediaMisses++;
    }
  }
  // resolve category: prefer embedded term slug, else map first WP category id via fetched list
  let categoryId = null;
  const embeddedCats = (p._embedded?.["wp:term"]?.flat() || []).filter((t) => t.taxonomy === "category");
  if (embeddedCats.length && catBySlug.has(safeDecode(embeddedCats[0].slug))) {
    categoryId = catBySlug.get(safeDecode(embeddedCats[0].slug));
  } else if (p.categories?.length) {
    categoryId = catByWpId.get(p.categories[0]) || null;
  }
  const excerpt = stripShortcodes(
    (p.excerpt?.rendered || "").replace(/<[^>]+>/g, "").slice(0, 300)
  );
  const params = {
    title: (p.title?.rendered || "").trim(),
    slug: safeDecode(p.slug),
    content: stripShortcodes(p.content?.rendered || ""),
    excerpt,
    category_id: categoryId,
    featured_image_url: img,
    created_at: p.date || "",
  };
  upPost.run(params);
  const inserted = db.prepare("SELECT id FROM posts WHERE slug = ?").get(params.slug);
  if (!inserted) {
    console.error("FAILED slug:", JSON.stringify({ wpslug: p.slug, mapped: params.slug, wpId: p.id }));
    throw new Error("post upsert failed for " + p.id);
  }
  postSlugToId.set(p.slug, inserted.id);
  wpIdToLocal.set(p.id, inserted.id);
}
console.log(`Posts: ${posts.length} processed (${mediaMisses} media lookups failed)`);

// --- pages ---
console.log("Fetching pages...");
const pages = await fetchAll("pages");
const upPage = db.prepare(`INSERT INTO pages (title, slug, html, published) VALUES (?, ?, ?, 1)
  ON CONFLICT(slug) DO UPDATE SET title = excluded.title, html = excluded.html`);
for (const pg of pages) {
  if (!pg.slug) continue;
  upPage.run((pg.title?.rendered || "").trim(), safeDecode(pg.slug), stripShortcodes(pg.content?.rendered || ""));
}
console.log(`Pages: ${pages.length} processed`);

// --- comments ---
console.log("Fetching comments...");
let commentCount = 0;
const upComment = db.prepare(`INSERT OR IGNORE INTO comments (post_id, name, body, created_at, approved)
  VALUES (?, ?, ?, ?, 1)`);
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_comments_dedupe ON comments(post_id, name, created_at, substr(body,1,200));");
const pageComments = await fetchAll("comments");
for (const cm of pageComments) {
  const postId = wpIdToLocal.get(cm.post) || null;
  if (!postId) continue;
  upComment.run(postId, cm.author_name || "אורח", stripShortcodes(cm.content?.rendered || ""), cm.date || "");
  commentCount++;
  if (commentCount % 100 === 0) console.log(`  comments: ${commentCount}...`);
}
console.log(`Comments: ${commentCount} imported`);

// --- default static pages ---
const ensurePage = (slug, title, html) => {
  const exists = db.prepare("SELECT 1 FROM pages WHERE slug = ?").get(slug);
  if (!exists) upPage.run(title, slug, html);
};
ensurePage(
  "about",
  "אודות",
  `<p>אתר <strong>ורדית חביב</strong> מאגד מתכונים מבית סבתא — מטבח תוניסאי-יהודי אותנטי שעבר מדור לדור. כל מתכון נבדק במטבח הביתי ומוגש מהלב.</p>`
);
ensurePage(
  "contact",
  "צור קשר",
  `<p>נשמח לשמוע מכם! ניתן ליצור קשר דרך עמוד הפייסבוק שלנו או להשאיר תגובה תחת כל מתכון.</p>`
);

const counts = {
  categories: db.prepare("SELECT COUNT(*) c FROM categories").get().c,
  posts: db.prepare("SELECT COUNT(*) c FROM posts").get().c,
  pages: db.prepare("SELECT COUNT(*) c FROM pages").get().c,
  comments: db.prepare("SELECT COUNT(*) c FROM comments").get().c,
};
console.log("DONE", JSON.stringify(counts));
db.close();
