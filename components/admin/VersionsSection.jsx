import { isAuthenticated } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { restorePostVersion } from "@/lib/actions";
import { deletePostVersion } from "@/lib/versionActions";
import { formatDateHe, stripHtml } from "@/lib/util";
import ConfirmSubmit from "@/components/admin/ConfirmSubmit";

export default async function VersionsSection({ postId }) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const db = getDb();
  const versions = db
    .prepare("SELECT * FROM post_versions WHERE post_id = ? ORDER BY id DESC")
    .all(postId);

  return (
    <section className="mt-8 max-w-3xl" id="versions">
      <h2 className="text-xl font-black text-[#4a3728] mb-3">גרסאות ({versions.length}/20)</h2>
      {versions.length === 0 ? (
        <p className="text-sm text-gray-400 bg-white border border-amber-100 rounded-2xl p-4">
          עדיין אין גרסאות — בכל שמירה נשמר תצלום המצב הקודם (עד 20 גרסאות אחרונות לכל מתכון).
        </p>
      ) : (
        <div className="space-y-2">
          {versions.map((v) => (
            <details key={v.id} className="bg-white border border-amber-100 rounded-2xl p-4">
              <summary className="flex items-center justify-between flex-wrap gap-2 cursor-pointer">
                <span className="text-sm">
                  <span className="font-bold">#{v.id}</span> · {formatDateHe(v.created_at) || "ללא תאריך"}
                  {v.comment && <span className="text-gray-400 mr-2">— {v.comment}</span>}
                </span>
                <span className="text-xs text-gray-400">{stripHtml(v.content, 60)}</span>
              </summary>
              <div className="mt-3 border-t border-amber-50 pt-3 space-y-3">
                <div className="text-xs text-gray-500">
                  כותרת: <span className="font-bold">{v.title}</span>
                  {v.slug && <> · slug: <span dir="ltr" className="font-mono">{v.slug}</span></>}
                  {v.featured_image_url && <> · תמונה: <span dir="ltr" className="font-mono">{v.featured_image_url}</span></>}
                </div>
                <pre
                  dir="ltr"
                  className="bg-amber-50/60 border border-amber-100 rounded-lg p-3 text-xs font-mono whitespace-pre-wrap max-h-72 overflow-auto"
                >
                  {v.content || "(תוכן ריק)"}
                </pre>
                <div className="flex items-center gap-2">
                  <ConfirmSubmit
                    action={restorePostVersion}
                    message="לשחזר את הגרסה? המצב הנוכחי יישמר אוטומטית כגרסה חדשה."
                    label="שחזור גרסה"
                    hidden={[{ name: "version_id", value: v.id }]}
                    className="bg-[#c0562f] hover:bg-[#9c4123] text-white font-bold text-xs px-4 py-2 rounded-full"
                  />
                  <ConfirmSubmit
                    action={deletePostVersion}
                    message="למחוק גרסה זו לצמיתות?"
                    label="מחיקת גרסה"
                    hidden={[{ name: "version_id", value: v.id }]}
                    className="text-xs text-red-600 hover:underline"
                  />
                </div>
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
