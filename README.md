# vardit-cms — אתר המתכונים של ורדית חביב

אתר מתכונים מודרני (Next.js 15 + Tailwind + SQLite מובנה ב-Node) שנבנה כתחליף לאתר וורדפרס קיים (vardit.co.il). עברית מלאה, RTL, מותאם SEO.

## English

Modern recipe CMS recreating vardit.co.il (Tunisian-Jewish home cooking, ~231 recipes) — Next.js 15 App Router, Tailwind CSS 4, and Node's built-in `node:sqlite` (no external DB, no native modules). Fully Hebrew RTL, SSR'd, SEO-ready (titles, meta, OpenGraph, sitemap.xml, robots.txt), with an admin panel, comment moderation, and a configurable ad-slot system.

## Quick start

```bash
npm ci            # install
npm run build     # production build
npm start         # serve on :3000 (DB ships pre-seeded in data/vardit.db)
```

Dev: `npm run dev`

## Re-import from WordPress (optional)

The repo ships with a pre-seeded SQLite database. To re-sync from the live WordPress API:

```bash
npm run import    # fetches categories/posts/pages/comments from https://vardit.co.il/wp-json (idempotent, upserts by slug)
```

## Admin panel

Visit `/admin` (user: `admin`). Password comes from `ADMIN_PASSWORD` (default: `changeme` — **change it in production**).

### Env vars

| Variable | Default | Description |
|---|---|---|
| `ADMIN_PASSWORD` | `changeme` | Admin panel password |
| `SESSION_SECRET` | dev fallback | Secret for HMAC-signed session cookies — set a random string in production |
| `VARDIT_DATA_DIR` | `/app/data` (Docker) / `./data` (local) | SQLite data directory |
| `VARDIT_DB_PATH` | `<data dir>/vardit.db` | SQLite file path override |
| `SITE_URL` | `http://localhost:3000` | Used for sitemap/robots canonical URLs |

## Deploy (Coolify / Docker)

A `Dockerfile` is included: multi-stage build on `node:24-alpine`, standalone Next.js server, listening on port **3000**. The seeded DB (`data/vardit.db`) is baked into the image at `/app/data/vardit.db` — no network needed at boot. Mount a volume on `/app/data` to persist admin edits across deploys.

## Data model

`categories`, `posts`, `pages`, `comments`, `settings`, `ads` — schema auto-created on first run.

Ad slots: `header`, `sidebar` (sticky, desktop, after ~600px scroll), `in_content` (after 2nd paragraph), `between_cards` (every 8 cards), `footer`. An ad renders only when enabled **and** has HTML; empty slots reserve zero space.
