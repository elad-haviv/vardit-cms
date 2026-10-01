#!/usr/bin/env node
/**
 * One-shot migration: download all remote images referenced by the DB into
 * data/images/ and rewrite featured_image_url + <img src> to relative /images/ paths.
 * Idempotent: already-relative paths are skipped; downloads skip existing files.
 */
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const DATA_DIR = process.env.VARDIT_DATA_DIR || path.join(process.cwd(), "data");
const IMG_DIR = path.join(DATA_DIR, "images");
const DB_PATH = process.env.VARDIT_DB_PATH || path.join(DATA_DIR, "vardit.db");
fs.mkdirSync(IMG_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);

// collect all remote urls
const urls = new Set();
for (const p of db.prepare("SELECT featured_image_url, content FROM posts").all()) {
  if (p.featured_image_url && /^https?:\/\//.test(p.featured_image_url)) urls.add(p.featured_image_url);
  for (const m of p.content.matchAll(/<img[^>]+src=["']([^"']+)["']/g)) {
    if (/^https?:\/\//.test(m[1])) urls.add(m[1]);
  }
}
for (const p of db.prepare("SELECT html FROM pages").all()) {
  for (const m of p.html.matchAll(/<img[^>]+src=["']([^"']+)["']/g)) {
    if (/^https?:\/\//.test(m[1])) urls.add(m[1]);
  }
}
console.log("urls:", urls.size);

// url -> local relative path (/images/<name>)
function urlToRel(url) {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean).map(decodeURIComponent);
    const base = path.basename(parts[parts.length - 1] || "img");
    const dir = parts.slice(-2, -1)[0] || "misc";
    let name = `${dir}-${base}`.replace(/[^\p{L}\p{N}._\-]/gu, "-").slice(0, 120);
    // resolve collisions deterministically
    let candidate = name, i = 2;
    while (map.has(candidate) && map.get(candidate) !== url) {
      candidate = name.replace(/(\.[^.]+)?$/, `-${i}$1`);
      i++;
    }
    return candidate;
  } catch {
    return null;
  }
}
const map = new Map(); // local name -> url (dedupe local names across distinct urls)
const relFor = new Map(); // url -> relative path
for (const url of urls) {
  const name = urlToRel(url);
  if (!name) continue;
  map.set(name, url);
  relFor.set(url, name);
}

// download sequentially (site is shared hosting; small concurrency is kinder)
async function download(url, name) {
  const dest = path.join(IMG_DIR, name);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return true;
  try {
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, redirect: "follow" });
    if (!r.ok) { console.error("FAIL", r.status, url); return false; }
    const buf = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync(dest, buf);
    return true;
  } catch (e) {
    console.error("ERR", e.message, url);
    return false;
  }
}

let ok = 0, fail = 0;
for (const [name, url] of map) {
  if (await download(url, name)) ok++; else fail++;
}
console.log(`downloaded ok=${ok} fail=${fail} of ${map.size}`);

// rewrite DB
function rewriteImgSrc(html) {
  return html.replace(/(<img[^>]+src=["'])([^"']+)(["'])/g, (all, pre, src, post) => {
    if (relFor.has(src)) return `${pre}/images/${relFor.get(src)}${post}`;
    return all;
  });
}
let n = 0;
for (const p of db.prepare("SELECT id, featured_image_url, content FROM posts").all()) {
  const fi = p.featured_image_url && relFor.has(p.featured_image_url) ? `/images/${relFor.get(p.featured_image_url)}` : p.featured_image_url;
  const c = rewriteImgSrc(p.content);
  if (fi !== p.featured_image_url || c !== p.content) {
    db.prepare("UPDATE posts SET featured_image_url = ?, content = ? WHERE id = ?").run(fi, c, p.id);
    n++;
  }
}
let np = 0;
for (const p of db.prepare("SELECT id, html FROM pages").all()) {
  const h = rewriteImgSrc(p.html);
  if (h !== p.html) { db.prepare("UPDATE pages SET html = ? WHERE id = ?").run(h, p.id); np++; }
}
// remaining img tags in posts: verify no remote vardit refs left
const leftover = db.prepare("SELECT COUNT(*) c FROM posts WHERE content LIKE '%src=\"http%vardit%'").get();
console.log(`posts updated: ${n}, pages updated: ${np}, leftover vardit refs in posts: ${leftover.c}`);
fs.writeFileSync(path.join(DATA_DIR, "images-manifest.json"), JSON.stringify(Object.fromEntries([...relFor].map(([u, n]) => [n, u])), null, 1));
console.log("manifest written");
