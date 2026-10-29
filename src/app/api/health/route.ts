import { NextResponse } from "next/server";
import { hasAssemblyKey } from "@/lib/assemblyai";
import { BUSINESS } from "@/lib/business";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    product: "CallDesk",
    business: BUSINESS.name,
    hasApiKey: hasAssemblyKey(),
    model: "assemblyai-tts-1",
  });
}
