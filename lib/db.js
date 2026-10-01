import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { ensureSchema } from "./migrations.mjs";

const DATA_DIR = process.env.VARDIT_DATA_DIR || path.join(process.cwd(), "data");
const DB_PATH = process.env.VARDIT_DB_PATH || path.join(DATA_DIR, "vardit.db");

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL;");
ensureSchema(db);

db.exec(`
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL DEFAULT '',
  excerpt TEXT NOT NULL DEFAULT '',
  category_id INTEGER,
  featured_image_url TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT '',
  published INTEGER NOT NULL DEFAULT 1,
  featured INTEGER NOT NULL DEFAULT 0,
  views INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  html TEXT NOT NULL DEFAULT '',
  published INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT '',
  approved INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS ads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slot TEXT NOT NULL UNIQUE,
  html TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS features (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  start_date TEXT NOT NULL DEFAULT '',
  end_date TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_features_dates ON features(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category_id);
CREATE INDEX IF NOT EXISTS idx_posts_published ON posts(published);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
`);

// Seed defaults if empty
const seedIfEmpty = (slot) => {
  db.prepare("INSERT OR IGNORE INTO ads (slot, html, enabled) VALUES (?, '', 0)").run(slot);
};
for (const s of ["header", "sidebar", "in_content", "between_cards", "footer"]) seedIfEmpty(s);

const settingDefaults = {
  site_title: "ורדית חביב",
  site_subtitle: "מתכונים מבית סבתא",
  youtube_url: "https://www.youtube.com/channel/UC0CXSMXspDmGrtJ876QU6QA",
  facebook_url: "https://www.facebook.com/1504309176316516",
};
const st = db.prepare("SELECT COUNT(*) c FROM settings");
if (st.get().c === 0) {
  const ins = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");
  for (const [k, v] of Object.entries(settingDefaults)) ins.run(k, v);
}

export function getDb() {
  return db;
}

export function getSetting(key, fallback = "") {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  return row ? row.value : fallback;
}

export function setSetting(key, value) {
  db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(key, value);
}

export function getAds() {
  return db.prepare("SELECT * FROM ads ORDER BY id").all();
}

export function getActiveAd(slot) {
  const row = db
    .prepare("SELECT * FROM ads WHERE slot = ? AND enabled = 1 AND TRIM(html) != ''")
    .get(slot);
  return row || null;
}

export default db;
