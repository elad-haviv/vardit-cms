import fs from "node:fs";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { contentTypeFor, safeImageSegments } from "@/lib/images";

export const dynamic = "force-dynamic";

export async function GET(req, { params }) {
  const { path: segments } = await params;
  const abs = safeImageSegments(Array.isArray(segments) ? segments : [segments]);
  if (!abs) return new NextResponse("Not found", { status: 404 });

  const type = contentTypeFor(abs);
  const stat = fs.statSync(abs);
  const etag = `"${stat.size}-${Math.floor(stat.mtimeMs)}"`;
  if (req.headers.get("if-none-match") === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag } });
  }

  const stream = Readable.toWeb(fs.createReadStream(abs));
  return new NextResponse(stream, {
    status: 200,
    headers: {
      "content-type": type,
      "content-length": String(stat.size),
      "cache-control": "public, max-age=31536000, immutable",
      ETag: etag,
    },
  });
}
