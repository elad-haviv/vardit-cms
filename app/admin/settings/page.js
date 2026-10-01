import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { saveSettings } from "@/lib/actions";
import { getSetting } from "@/lib/db";
import LinksManager from "@/components/admin/LinksManager";

export const dynamic = "force-dynamic";

export const metadata = { title: "הגדרות" };

function parseLinks() {
  const raw = getSetting("links", "");
  if (raw) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length > 0) return arr;
    } catch {
      /* fall through to defaults */
    }
  }
  // first-run defaults migrated from the legacy youtube/facebook settings
  const defaults = [];
  const yt = getSetting("youtube_url", "");
  const fb = getSetting("facebook_url", "");
  if (yt) defaults.push({ name: "YouTube", url: yt });
  if (fb) defaults.push({ name: "Facebook", url: fb });
  return defaults;
}

export default async function AdminSettings({ searchParams }) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const sp = await searchParams;
  const initialLinks = parseLinks();

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-black text-[#4a3728] mb-5">הגדרות אתר</h1>
      {sp?.saved && <div className="mb-4 bg-green-50 text-green-700 rounded-lg p-3 text-sm">נשמר ✓</div>}

      <form action={saveSettings} className="bg-white rounded-2xl border border-amber-100 p-6 space-y-5">
        <div>
          <label className="block text-sm font-bold mb-1">כותרת האתר</label>
          <input
            name="site_title"
            defaultValue={getSetting("site_title", "ורדית חביב")}
            className="w-full rounded-lg border border-amber-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c0562f]/40"
          />
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">תת-כותרת</label>
          <input
            name="site_subtitle"
            defaultValue={getSetting("site_subtitle", "מתכונים מבית סבתא")}
            className="w-full rounded-lg border border-amber-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c0562f]/40"
          />
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">קישורים</label>
          <p className="text-xs text-[#8a7361] mb-2">שם וכתובת לכל קישור — נוספים בתחתית כל עמוד. ניתן למחוק שורות ולהוסיף חדשות.</p>
          <LinksManager initialLinks={initialLinks} />
        </div>
        <button className="bg-[#c0562f] hover:bg-[#9c4123] text-white font-bold px-6 py-2.5 rounded-full text-sm transition">שמור הגדרות</button>
      </form>
    </div>
  );
}
