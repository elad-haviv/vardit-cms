// Apply iteration-1 migrations to the committed DB (data/vardit.db).
// Idempotent — same code path as lib/db.js runs on boot.
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { ensureSchema } from "../lib/migrations.mjs";

const dbPath = process.env.VARDIT_DB_PATH || path.join(process.cwd(), "data", "vardit.db");
const db = new DatabaseSync(dbPath);
ensureSchema(db);

const counts = {};
for (const t of ["post_categories", "tags", "post_tags", "post_versions"]) {
  counts[t] = db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c;
}
console.log("migrations applied to", dbPath);
console.log("counts:", JSON.stringify(counts));
console.log("links setting:", db.prepare("SELECT value FROM settings WHERE key = 'links'").get()?.value || "(none)");
