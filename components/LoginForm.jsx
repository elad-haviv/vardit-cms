"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(false);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) router.push("/admin");
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto py-16">
      <div className="bg-[var(--card)] rounded-2xl border border-[var(--line)] shadow p-8">
        <h1 className="text-2xl font-display text-[var(--ink-deep)] mb-6 text-center">כניסה לניהול</h1>
        {error && (
          <div className="mb-4 bg-red-50 text-red-700 text-sm rounded-lg p-3 text-center">
            שם משתמש או סיסמה שגויים
          </div>
        )}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">שם משתמש</label>
            <input
              name="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-[var(--line)] px-4 py-2.5 focus:outline-none focus:ring-2 focus:border-[var(--paprika)] focus:ring-0/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">סיסמה</label>
            <input
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[var(--line)] px-4 py-2.5 focus:outline-none focus:ring-2 focus:border-[var(--paprika)] focus:ring-0/40"
            />
          </div>
          <button
            disabled={busy}
            className="w-full bg-[var(--paprika)] hover:bg-[var(--paprika-deep)] disabled:opacity-50 text-white font-bold py-2.5 rounded-lg transition"
          >
            {busy ? "..." : "כניסה"}
          </button>
        </form>
      </div>
    </div>
  );
}
