import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { saveAd } from "@/lib/actions";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = { title: "ניהול מודעות" };

const SLOTS = [
  { key: "header", label: "באנר מתחת לתפריט", desc: "מוצג בכל העמודים מתחת להדר, לא דביק" },
  { key: "sidebar", label: "סרגל צד דביק", desc: "דסקטופ בלבד, מופיע לאחר גלילה של ~600px" },
  { key: "in_content", label: "בתוך תוכן המתכון", desc: "מוזרק אחרי הפסקה השנייה בעמוד מתכון" },
  { key: "between_cards", label: "בין כרטיסי מתכונים", desc: "מופיע כל 8 כרטיסים ברשימות" },
  { key: "footer", label: "מעל הפוטר", desc: "מוצג בכל העמודים מעל הפוטר" },
];

export default async function AdminAds({ searchParams }) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const sp = await searchParams;
  const ads = getDb().prepare("SELECT * FROM ads").all();
  const bySlot = Object.fromEntries(ads.map((a) => [a.slot, a]));

  return (
    <div>
      <h1 className="text-2xl font-black text-[#4a3728] mb-2">ניהול מודעות</h1>
      <p className="text-sm text-gray-500 mb-6">
        מודעה מוצגת רק אם היא מופעלת ומכילה HTML. מומלץ לשמור קוד AdSense/מודעות כאן במקום קוד קשוח באתר.
      </p>
      {sp?.saved && <div className="mb-4 bg-green-50 text-green-700 rounded-lg p-3 text-sm">נשמר ✓</div>}

      <div className="grid gap-5 md:grid-cols-2">
        {SLOTS.map((s) => {
          const ad = bySlot[s.key] || { html: "", enabled: 0 };
          return (
            <form key={s.key} action={saveAd} className="bg-white rounded-2xl border border-amber-100 p-5 space-y-3">
              <input type="hidden" name="slot" value={s.key} />
              <div>
                <h2 className="font-bold text-[#4a3728]">{s.label}</h2>
                <p className="text-xs text-gray-400">{s.desc}</p>
              </div>
              <textarea
                name="html"
                rows={5}
                dir="ltr"
                defaultValue={ad.html}
                placeholder="<div>קוד מודעה כאן</div>"
                className="w-full rounded-lg border border-amber-200 px-3 py-2 text-xs font-mono"
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" name="enabled" defaultChecked={!!ad.enabled} className="w-4 h-4 accent-[#c0562f]" />
                  מופעל
                </label>
                <button className="bg-[#c0562f] hover:bg-[#9c4123] text-white font-bold px-5 py-2 rounded-full text-sm transition">שמור</button>
              </div>
            </form>
          );
        })}
      </div>
    </div>
  );
}
