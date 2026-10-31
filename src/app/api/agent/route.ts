import { NextRequest, NextResponse } from "next/server";
import {
  answerCaller,
  greetingFor,
  type BusinessProfile,
  PRESETS,
} from "@/lib/business";

export const runtime = "nodejs";

type Body = {
  message?: string;
  greet?: boolean;
  business?: BusinessProfile;
  presetId?: string;
};

function resolveBusiness(body: Body): BusinessProfile | null {
  if (body.business?.name) return body.business;
  if (body.presetId) {
    return PRESETS.find((p) => p.id === body.presetId) ?? null;
  }
  return PRESETS[0] ?? null;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const business = resolveBusiness(body);
  if (!business) {
    return NextResponse.json(
      { error: "Business profile is required." },
      { status: 400 },
    );
  }

  if (body.greet) {
    return NextResponse.json({
      intent: "greeting",
      reply: greetingFor(business),
    });
  }

  return NextResponse.json(answerCaller(body.message ?? "", business));
}
