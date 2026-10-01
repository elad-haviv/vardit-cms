"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isAuthenticated } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { snapshotPostVersion } from "@/lib/posts.mjs";

export async function deletePostVersion(formData) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const db = getDb();
  const versionId = Number(formData.get("version_id"));
  const v = db.prepare("SELECT post_id FROM post_versions WHERE id = ?").get(versionId);
  if (v) db.prepare("DELETE FROM post_versions WHERE id = ?").run(versionId);
  revalidatePath(`/admin/recipes/${v?.post_id}`);
  redirect(`/admin/recipes/${v?.post_id}`);
}
