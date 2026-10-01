import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { listImages, ensureImagesDir, sanitizeImageName, uniqueImageName } from "@/lib/images";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  ensureImagesDir();
  return NextResponse.json({ ok: true, files: listImages() });
}

export async function POST(req) {
  const denied = await requireAdmin();
  if (denied) return denied;
  ensureImagesDir();

  let form;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה (multipart/form-data נדרש)" }, { status: 400 });
  }

  const entries = [...form.getAll("files"), ...form.getAll("file")].filter((v) => typeof v === "object" && v !== null && "arrayBuffer" in v);
  if (entries.length === 0) {
    return NextResponse.json({ error: "לא נשלחו קבצים" }, { status: 400 });
  }

  const fs = await import("node:fs");
  const path = await import("node:path");
  const { IMAGES_DIR } = await import("@/lib/images");

  const saved = [];
  for (const file of entries) {
    const name = uniqueImageName(sanitizeImageName(file.name));
    const buf = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(IMAGES_DIR, name), buf);
    saved.push({ name, size: buf.length });
  }
  return NextResponse.json({ ok: true, saved, files: listImages() });
}
