export function decodeSlug(s) {
  if (!s) return s;
  try { return decodeURIComponent(s); } catch { return s; }
}

export function formatDateHe(d) {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date)) return "";
  return date.toLocaleDateString("he-IL", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function stripHtml(html, max = 200) {
  return (html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** Inject an ad block after the 2nd paragraph (or 2nd top-level block) of HTML. */
export function injectInContentAd(html, adHtml) {
  if (!adHtml || !html) return { html, ad: null };
  const adBlock = `<div class="ad-slot in-content my-6">${adHtml}</div>`;
  // find closing </p> occurrences
  let idx = -1;
  let count = 0;
  const re = /<\/p\s*>/gi;
  let m;
  while ((m = re.exec(html))) {
    count++;
    if (count === 2) {
      idx = m.index + m[0].length;
      break;
    }
  }
  if (idx === -1) {
    // fallback: after first heading or start
    const h = html.match(/<\/h[12]\s*>/i);
    if (h && h.index !== undefined) idx = h.index + h[0].length;
  }
  if (idx === -1) return { html: adBlock + html, ad: "top" };
  return { html: html.slice(0, idx) + adBlock + html.slice(idx), ad: "p2" };
}
