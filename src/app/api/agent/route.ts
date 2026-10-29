import { NextRequest, NextResponse } from "next/server";
import { answerCaller, GREETING } from "@/lib/business";

export const runtime = "nodejs";

type Body = {
  message?: string;
  greet?: boolean;
};

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (body.greet) {
    return NextResponse.json({ intent: "greeting", reply: GREETING });
  }

  const result = answerCaller(body.message ?? "");
  return NextResponse.json(result);
}
