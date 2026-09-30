import { NextResponse } from "next/server";
import { createSessionValue, setSessionCookie, ADMIN_PASSWORD } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const ct = req.headers.get("content-type") || "";
  let username = "";
  let password = "";
  if (ct.includes("application/json")) {
    const b = await req.json();
    username = String(b.username || "");
    password = String(b.password || "");
  } else {
    const f = await req.formData();
    username = String(f.get("username") || "");
    password = String(f.get("password") || "");
  }
  if (username !== "admin" || password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "שם משתמש או סיסמה שגויים" }, { status: 401 });
  }
  await setSessionCookie(createSessionValue("admin"));
  return NextResponse.json({ ok: true, redirect: "/admin" });
}
