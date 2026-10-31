import { NextResponse } from "next/server";
import { hasAssemblyKey } from "@/lib/assemblyai";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    product: "CallDesk",
    hasApiKey: hasAssemblyKey(),
    model: "assemblyai-tts-1",
  });
}
