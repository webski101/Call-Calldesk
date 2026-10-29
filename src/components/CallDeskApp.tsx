"use client";

import { useEffect, useRef, useState } from "react";
import { BUSINESS } from "@/lib/business";
import { playPcmStream, type PcmPlayerHandle } from "@/lib/pcmPlayer";

type Turn = {
  id: string;
  role: "caller" | "desk";
  text: string;
};

type Status = "idle" | "listening" | "thinking" | "speaking";

const PROMPTS = [
  "What are your hours?",
  "Where are you located?",
  "What's on the menu?",
  "Can I book a table for 4 tonight?",
];

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function CallDeskApp() {
  const [live, setLive] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [ttfaMs, setTtfaMs] = useState<number | null>(null);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listeningMic, setListeningMic] = useState(false);

  const playerRef = useRef<PcmPlayerHandle | null>(null);
  const speakAbortRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void fetch("/api/health")
      .then((r) => r.json())
      .then((data: { hasApiKey?: boolean }) => setHasKey(Boolean(data.hasApiKey)))
      .catch(() => setHasKey(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, status]);

  useEffect(() => {
    return () => {
      interruptSpeech();
      recognitionRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function interruptSpeech() {
    speakAbortRef.current?.abort();
    speakAbortRef.current = null;
    playerRef.current?.stop();
    playerRef.current = null;
  }

  async function speak(text: string) {
    interruptSpeech();
    const abort = new AbortController();
    speakAbortRef.current = abort;
    setStatus("speaking");
    setError(null);

    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceId: BUSINESS.voiceId }),
        signal: abort.signal,
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error || `Speak failed (${res.status})`);
      }

      const player = await playPcmStream(res, {
        onFirstAudio: (ms) => setTtfaMs(ms),
      });
      playerRef.current = player;
      await player.done;
      if (!abort.signal.aborted) setStatus("idle");
    } catch (err) {
      if (abort.signal.aborted) {
        setStatus("idle");
        return;
      }
      const message = err instanceof Error ? err.message : "Could not play speech.";
      setError(message);
      setStatus("idle");
    } finally {
      if (speakAbortRef.current === abort) speakAbortRef.current = null;
      playerRef.current = null;
    }
  }

  async function runTurn(message: string, opts?: { greet?: boolean }) {
    const cleaned = message.trim();
    if (!opts?.greet && !cleaned) return;

    if (!opts?.greet) {
      setTurns((prev) => [...prev, { id: uid(), role: "caller", text: cleaned }]);
      setDraft("");
    }

    setStatus("thinking");
    setError(null);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opts?.greet ? { greet: true } : { message: cleaned }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || !data.reply) throw new Error(data.error || "Agent failed.");

      setTurns((prev) => [...prev, { id: uid(), role: "desk", text: data.reply! }]);
      await speak(data.reply);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Turn failed.";
      setError(message);
      setStatus("idle");
    }
  }

  async function startCall() {
    setLive(true);
    setTurns([]);
    setTtfaMs(null);
    setError(null);
    await runTurn("", { greet: true });
  }

  function endCall() {
    interruptSpeech();
    recognitionRef.current?.stop();
    setListeningMic(false);
    setLive(false);
    setStatus("idle");
  }

  function bargeIn() {
    interruptSpeech();
    setStatus("idle");
  }

  function toggleMic() {
    const SR =
      typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : undefined;

    if (!SR) {
      setError("Voice input needs Chrome/Edge speech recognition. Type instead.");
      return;
    }

    if (listeningMic) {
      recognitionRef.current?.stop();
      setListeningMic(false);
      setStatus("idle");
      return;
    }

    bargeIn();
    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;
    setListeningMic(true);
    setStatus("listening");

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      setListeningMic(false);
      setStatus("idle");
      void runTurn(transcript);
    };
    recognition.onerror = () => {
      setListeningMic(false);
      setStatus("idle");
      setError("Mic capture failed. Try typing your question.");
    };
    recognition.onend = () => {
      setListeningMic(false);
      if (status === "listening") setStatus("idle");
    };
    recognition.start();
  }

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 pb-10 pt-8 sm:px-8 sm:pt-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 50% 0%, rgba(255,255,255,0.55), transparent 70%)",
        }}
      />

      <header className="relative rise">
        <p className="font-[family-name:var(--font-display)] text-5xl leading-none tracking-tight text-[var(--ink)] sm:text-7xl">
          CallDesk
        </p>
        <h1 className="mt-4 max-w-xl text-lg leading-snug text-[var(--ink-soft)] sm:text-xl">
          A front-desk voice line that answers before callers hang up.
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-[var(--ink-soft)]/80">
          Demo shop: {BUSINESS.name}. Powered by AssemblyAI-TTS-1 streaming speech —
          interrupt anytime mid-sentence.
        </p>
      </header>

      <section className="relative mt-10 rise rise-delay-1">
        {!live ? (
          <div className="flex flex-col items-start gap-6">
            <button
              type="button"
              onClick={() => void startCall()}
              className="group relative inline-flex items-center gap-3 rounded-full bg-[var(--harbor)] px-7 py-3.5 text-base font-medium text-[var(--foam)] shadow-[0_18px_40px_var(--glow)] transition hover:bg-[var(--harbor-deep)]"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inset-0 rounded-full bg-[var(--signal)] opacity-80" />
              </span>
              Pick up the line
            </button>
            {hasKey === false && (
              <p className="max-w-md text-sm text-[var(--ink-soft)]">
                Add <code className="rounded bg-white/60 px-1.5 py-0.5">ASSEMBLYAI_API_KEY</code>{" "}
                to <code className="rounded bg-white/60 px-1.5 py-0.5">.env.local</code> to hear
                the desk speak.
              </p>
            )}
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div>
              <div className="mb-5 flex flex-wrap items-center gap-4">
                <div className="relative live-ring flex h-14 w-14 items-center justify-center rounded-full bg-[var(--harbor)] text-[var(--foam)]">
                  <span className="text-xs font-semibold tracking-wide">LIVE</span>
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-[var(--harbor)]">
                    On the line
                  </p>
                  <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
                    {BUSINESS.name}
                  </p>
                </div>
                {status === "speaking" && (
                  <div className="ml-auto flex h-8 items-end gap-1" aria-hidden>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <span
                        key={i}
                        className="wave-bar w-1 rounded-full bg-[var(--signal)]"
                        style={{ height: `${10 + i * 3}px` }}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="max-h-[48vh] space-y-4 overflow-y-auto pr-1">
                {turns.map((turn) => (
                  <div
                    key={turn.id}
                    className={
                      turn.role === "caller"
                        ? "ml-8 border-l-2 border-[var(--signal)] pl-4"
                        : "mr-8 border-l-2 border-[var(--harbor)] pl-4"
                    }
                  >
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--ink-soft)]/70">
                      {turn.role === "caller" ? "Caller" : "Desk"}
                    </p>
                    <p className="mt-1 text-[15px] leading-relaxed text-[var(--ink)]">
                      {turn.text}
                    </p>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            </div>

            <div className="rise rise-delay-2 space-y-4">
              <div className="flex flex-wrap gap-2">
                {PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    disabled={status === "thinking" || status === "speaking"}
                    onClick={() => void runTurn(prompt)}
                    className="rounded-full border border-[var(--line)] bg-white/50 px-3 py-1.5 text-left text-sm text-[var(--ink-soft)] transition hover:border-[var(--harbor)] hover:bg-white/80 disabled:opacity-40"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <form
                className="flex flex-col gap-3 sm:flex-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  void runTurn(draft);
                }}
              >
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type what the caller says…"
                  className="min-h-12 flex-1 rounded-2xl border border-[var(--line)] bg-white/70 px-4 text-[var(--ink)] outline-none ring-[var(--harbor)] placeholder:text-[var(--ink-soft)]/50 focus:ring-2"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || status === "thinking"}
                  className="rounded-2xl bg-[var(--ink)] px-5 py-3 text-sm font-medium text-[var(--foam)] disabled:opacity-40"
                >
                  Send
                </button>
              </form>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={toggleMic}
                  className="rounded-2xl border border-[var(--line)] bg-white/60 px-4 py-2.5 text-sm text-[var(--ink)]"
                >
                  {listeningMic ? "Stop mic" : "Talk"}
                </button>
                <button
                  type="button"
                  onClick={bargeIn}
                  disabled={status !== "speaking"}
                  className="rounded-2xl bg-[var(--signal)] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-35"
                >
                  Interrupt
                </button>
                <button
                  type="button"
                  onClick={endCall}
                  className="rounded-2xl border border-[var(--line)] px-4 py-2.5 text-sm text-[var(--ink-soft)]"
                >
                  Hang up
                </button>
              </div>

              <p className="text-sm text-[var(--ink-soft)]">
                Status:{" "}
                <span className="font-medium text-[var(--ink)]">
                  {status === "idle" && "ready"}
                  {status === "listening" && "listening"}
                  {status === "thinking" && "thinking"}
                  {status === "speaking" && "speaking"}
                </span>
                {ttfaMs != null && (
                  <>
                    {" · "}
                    first audio{" "}
                    <span className="font-medium text-[var(--harbor)]">{ttfaMs} ms</span>
                  </>
                )}
              </p>

              {error && (
                <p className="text-sm text-red-700/90" role="alert">
                  {error}
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      <footer className="relative mt-auto pt-16 text-xs text-[var(--ink-soft)]/70 rise rise-delay-3">
        CallDesk · AssemblyAI Voice Hackathon · Harbor Roast demo line
      </footer>
    </main>
  );
}
