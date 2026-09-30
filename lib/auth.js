import crypto from "node:crypto";
import { cookies } from "next/headers";

const SECRET = process.env.SESSION_SECRET || "vardit-cms-dev-secret-change-me";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "changeme";
const COOKIE = "vardit_admin";
const TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function sign(payload) {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
}

export function createSessionValue(username) {
  const payload = JSON.stringify({ u: username, exp: Date.now() + TTL_MS });
  const b64 = Buffer.from(payload).toString("base64url");
  return `${b64}.${sign(b64)}`;
}

export function verifySessionValue(value) {
  if (!value || !value.includes(".")) return false;
  const [b64, sig] = value.split(".");
  const expected = sign(b64);
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
    const payload = JSON.parse(Buffer.from(b64, "base64url").toString());
    return payload.exp > Date.now();
  } catch {
    return false;
  }
}

export async function isAuthenticated() {
  const store = await cookies();
  return verifySessionValue(store.get(COOKIE)?.value);
}

export async function setSessionCookie(token) {
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: TTL_MS / 1000,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE);
}
