import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { saveSettings } from "@/lib/actions";
import { getSetting } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = { title: "הגדרות" };

export default async function AdminSettings({ searchParams }) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const sp = await searchParams;

  const fields = [
    { key: "site_title", label: "כותרת האתר" },
    { key: "site_subtitle", label: "תת-כותרת" },
    { key: "youtube_url", label: "כתובת ערוץ YouTube", ltr: true },
    { key: "facebook_url", label: "כתובת דף Facebook", ltr: true },
  ];

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-black text-[#4a3728] mb-5">הגדרות אתר</h1>
      {sp?.saved && <div className="mb-4 bg-green-50 text-green-700 rounded-lg p-3 text-sm">נשמר ✓</div>}

      <form action={saveSettings} className="bg-white rounded-2xl border border-amber-100 p-6 space-y-4">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="block text-sm font-bold mb-1">{f.label}</label>
            <input
              name={f.key}
              dir={f.ltr ? "ltr" : "rtl"}
              defaultValue={getSetting(f.key, "")}
              className="w-full rounded-lg border border-amber-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#c0562f]/40"
            />
          </div>
        ))}
        <button className="bg-[#c0562f] hover:bg-[#9c4123] text-white font-bold px-6 py-2.5 rounded-full text-sm transition">שמור הגדרות</button>
      </form>
    </div>
  );
}
