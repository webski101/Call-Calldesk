import { NextRequest, NextResponse } from "next/server";
import { TextToSpeechError } from "assemblyai";
import { getAssemblyClient } from "@/lib/assemblyai";
import { DEFAULT_VOICE_ID } from "@/lib/business";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CHARS = 5000;

type SpeakBody = {
  text?: string;
  voiceId?: string;
};

export async function POST(req: NextRequest) {
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
