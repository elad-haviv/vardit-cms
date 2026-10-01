import fs from "node:fs";
import path from "node:path";

// Mirror of the DATA_DIR logic in lib/db.js
export const DATA_DIR = process.env.VARDIT_DATA_DIR || path.join(process.cwd(), "data");
export const IMAGES_DIR = path.join(DATA_DIR, "images");

export function ensureImagesDir() {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

const CONTENT_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
  ".bmp": "image/bmp",
  ".ico": "image/x-icon",
  ".jfif": "image/jpeg",
};

export function contentTypeFor(name) {
  return CONTENT_TYPES[path.extname(name).toLowerCase()] || "application/octet-stream";
}

/** Reject path traversal: every segment must be a plain filename (no dots-only, no separators). */
export function safeImageSegments(segments) {
  if (!Array.isArray(segments) || segments.length === 0) return null;
  for (const s of segments) {
    if (!s || s === "." || s === ".." || s.includes("/") || s.includes("\\") || s.includes("\0")) return null;
  }
  const rel = segments.join("/");
  const abs = path.resolve(IMAGES_DIR, rel);
  if (abs !== path.resolve(IMAGES_DIR) && !abs.startsWith(path.resolve(IMAGES_DIR) + path.sep)) return null;
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return null;
  return abs;
}

/** Sanitize an uploaded filename: keep unicode letters/digits, dots, hyphen; flatten separators. */
export function sanitizeImageName(name) {
  const base = path.basename(String(name || ""));
  const cleaned = base
    .replace(/[\0/\\]+/g, "-")
    .replace(/[\p{C}\p{Z}]+/gu, "-")
    .replace(/[^\p{L}\p{N}._-]+/gu, "")
    .replace(/^[-.]+/, "") || "file";
  return cleaned.slice(0, 120);
}

/** Find a unique name in IMAGES_DIR (appends -1, -2, ... before the extension). */
export function uniqueImageName(name) {
  let candidate = name;
  let i = 1;
  const ext = path.extname(name);
  const stem = name.slice(0, name.length - ext.length);
  while (fs.existsSync(path.join(IMAGES_DIR, candidate))) {
    candidate = `${stem}-${i++}${ext}`;
  }
  return candidate;
}

export function listImages() {
  ensureImagesDir();
  return fs
    .readdirSync(IMAGES_DIR, { withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => {
      const st = fs.statSync(path.join(IMAGES_DIR, d.name));
      return { name: d.name, size: st.size, mtime: Math.floor(st.mtimeMs) };
    });
}

/** WP-style grouping: "03-name.jpg" -> prefix "03", "thumbs-x.jpg" -> "thumbs", else "". */
export function imagePrefix(name) {
  const m = name.match(/^(thumbs-|\d{2})/);
  if (!m) return "";
  return m[1].replace(/-$/, "") || m[1];
}

export const IMAGE_PREFIX_LABELS = { "": "אחר (ללא תחילית)" };
export function imagePrefixLabel(prefix) {
  if (prefix === "thumbs") return "WP — תמונות ממוזערות (thumbs)";
  if (prefix === "") return IMAGE_PREFIX_LABELS[""];
  if (/^\d{2}$/.test(prefix)) return `WP uploads — ${prefix}`;
  return prefix;
}
