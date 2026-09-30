# ---- deps ----
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---- build ----
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# build-time DB path (real DB is provided at runtime via /app/data)
RUN mkdir -p data && npm run build

# ---- runtime ----
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S app && adduser -S app -G app
RUN mkdir -p /app/data && chown -R app:app /app

# standalone server
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
# seeded SQLite database ships with the image (imported at build time)
COPY --from=builder --chown=app:app /app/data/vardit.db /app/data/vardit.db
# import script for optional re-import
COPY --from=builder --chown=app:app /app/scripts ./scripts
COPY --from=builder --chown=app:app /app/package.json ./package.json

USER app
EXPOSE 3000
CMD ["node", "server.js"]
