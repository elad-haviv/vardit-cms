import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const names = getDb().prepare("SELECT name FROM tags ORDER BY name").all().map((r) => r.name);
  return NextResponse.json({ ok: true, tags: names });
}
