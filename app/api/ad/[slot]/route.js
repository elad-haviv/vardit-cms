import { NextResponse } from "next/server";
import { getActiveAd } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const ad = getActiveAd("sidebar");
  return NextResponse.json({ html: ad ? ad.html : "" });
}
