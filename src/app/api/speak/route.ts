import { NextRequest, NextResponse } from "next/server";
import { TextToSpeechError } from "assemblyai";
import { getAssemblyClient } from "@/lib/assemblyai";
import { DEFAULT_VOICE_ID } from "@/lib/business";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CHARS = 1000;
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

type SpeakBody = {
  text?: string;
  voiceId?: string;
};

type Bucket = { count: number; resetAt: number };

const rateBuckets = new Map<string, Bucket>();

function clientIp(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}

function allowRequest(ip: string) {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || now >= bucket.resetAt) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (bucket.count >= RATE_LIMIT) return false;
  bucket.count += 1;
  return true;
}

function hostAllowed(hostname: string) {
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  if (hostname === "call-desk-mu.vercel.app") return true;
  if (hostname.endsWith(".vercel.app") && hostname.includes("call-desk")) {
    return true;
  }
  return false;
}

function isAllowedSource(req: NextRequest) {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const host = req.headers.get("host")?.split(":")[0] ?? "";

  for (const value of [origin, referer]) {
    if (!value) continue;
    try {
      const url = new URL(value);
      if (hostAllowed(url.hostname)) return true;
      if (host && url.host === req.headers.get("host")) return true;
    } catch {
      /* ignore bad headers */
    }
  }

  // Same-host browser navigations sometimes omit Origin; still require a
  // Referer from our app when Origin is missing.
  if (!origin && referer) {
    try {
      return hostAllowed(new URL(referer).hostname);
    } catch {
      return false;
    }
  }

  return false;
}

export async function POST(req: NextRequest) {
  if (!isAllowedSource(req)) {
    return NextResponse.json({ error: "Forbidden origin." }, { status: 403 });
  }

  const ip = clientIp(req);
  if (!allowRequest(ip)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again in a minute." },
      { status: 429 },
    );
  }

  let body: SpeakBody;
  try {
    body = (await req.json()) as SpeakBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const text = body.text?.trim() ?? "";
  if (!text) {
    return NextResponse.json({ error: "Text is required." }, { status: 400 });
  }
  if (text.length > MAX_CHARS) {
    return NextResponse.json(
      { error: `Text must be ${MAX_CHARS} characters or fewer.` },
      { status: 400 },
    );
  }

  const voiceId = body.voiceId?.trim() || DEFAULT_VOICE_ID;
  const started = performance.now();

  try {
    const client = getAssemblyClient();
    const speech = await client.tts.stream(
      {
        text,
        voice_id: voiceId,
        language: "english",
        encoding: "pcm_s16le",
        sample_rate: 24000,
        container: "raw",
      },
      { signal: req.signal },
    );

    const ttfaMs = Math.round(performance.now() - started);
    const info = speech.info;

    return new NextResponse(speech.body, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Cache-Control": "no-store",
        "X-TTFA-Ms": String(ttfaMs),
        "X-Request-Id": info.requestId ?? "",
        "X-TTS-Model": info.model ?? "assemblyai-tts-1",
        "X-TTS-Voice-Id": info.voiceId ?? voiceId,
        "X-TTS-Sample-Rate": String(info.sampleRate ?? 24000),
        "X-TTS-Encoding": info.encoding ?? "pcm_s16le",
        "X-TTS-Billed-Characters": String(info.billedCharacters ?? text.length),
      },
    });
  } catch (error) {
    if (req.signal.aborted) {
      return new NextResponse(null, { status: 499 });
    }

    if (error instanceof Error && error.message.includes("ASSEMBLYAI_API_KEY")) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    if (error instanceof TextToSpeechError) {
      return NextResponse.json(
        {
          error: error.message,
          errorCode: error.errorCode,
          retryable: error.retryable,
          requestId: error.requestId,
        },
        { status: error.status ?? 502 },
      );
    }

    const message =
      error instanceof Error ? error.message : "Speech synthesis failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
