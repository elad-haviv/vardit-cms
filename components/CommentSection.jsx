"use client";

import { useState } from "react";

export default function CommentSection({ postId }) {
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState(null); // {ok, message}
  const [sending, setSending] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    setStatus(null);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ post_id: postId, name, body, website }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setStatus({ ok: true, message: data.message });
        setName("");
        setBody("");
        // reload comments after short delay
        setTimeout(() => window.location.reload(), 1200);
      } else {
        setStatus({ ok: false, message: data.error || "שגיאה בשליחת התגובה" });
      }
    } catch {
      setStatus({ ok: false, message: "שגיאת רשת. נסו שוב." });
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="mt-12" id="comments">
      <h2 className="text-2xl font-black text-[#4a3728] mb-5">תגובות</h2>

      <div
        id="comments-list"
        className="space-y-3 mb-8"
        // approved comments injected server-side below via srcdoc-free approach:
      >
        <ApprovedComments postId={postId} />
      </div>

      <form onSubmit={submit} className="bg-white rounded-2xl border border-amber-100 p-5 shadow-sm space-y-3">
        <h3 className="font-bold text-[#9c4123]">השאירו תגובה</h3>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="השם שלכם"
          className="w-full rounded-lg border border-amber-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c0562f]/40"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={4}
          placeholder="התגובה שלכם..."
          className="w-full rounded-lg border border-amber-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c0562f]/40"
        />
        {/* honeypot: hidden from humans */}
        <input
          type="text"
          name="website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="hidden"
        />
        <div className="flex items-center gap-3">
          <button
            disabled={sending}
            className="bg-[#c0562f] hover:bg-[#9c4123] disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-full transition text-sm"
          >
            {sending ? "שולח..." : "שלח תגובה"}
          </button>
          {status && (
            <span className={`text-sm ${status.ok ? "text-green-700" : "text-red-600"}`}>{status.message}</span>
          )}
        </div>
      </form>
    </section>
  );
}

function ApprovedComments({ postId }) {
  const [items, setItems] = useState(null);
  if (items === null) {
    fetch(`/api/comments?post_id=${postId}`)
      .then((r) => r.text())
      .then((html) => setItems(html))
      .catch(() => setItems(""));
    return <p className="text-sm text-gray-400">טוען תגובות...</p>;
  }
  if (!items || items === "<ul class=\"space-y-3\"></ul>")
    return <p className="text-sm text-gray-400">עדיין אין תגובות — היו הראשונים להגיב!</p>;
  return <div dangerouslySetInnerHTML={{ __html: items }} />;
}
