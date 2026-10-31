"use client";

import { useEffect, useRef, useState } from "react";
import {
  PRESETS,
  blankBusiness,
  clonePreset,
  promptsFor,
  type BusinessProfile,
} from "@/lib/business";
import { playPcmStream, type PcmPlayerHandle } from "@/lib/pcmPlayer";
import {
  addCallLog,
  deleteBusiness,
  getActiveBusiness,
  loadBusinesses,
  loadCallLog,
  setActiveBusinessId,
  upsertBusiness,
  type CallLogEntry,
} from "@/lib/storage";
import BusinessSetup from "@/components/BusinessSetup";

type Turn = {
  id: string;
  role: "caller" | "desk";
  text: string;
};

type Status = "idle" | "listening" | "thinking" | "speaking";
type Screen = "home" | "setup" | "desk" | "log";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function CallDeskApp() {
  const [screen, setScreen] = useState<Screen>("home");
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [active, setActive] = useState<BusinessProfile | null>(null);
  const [draft, setDraft] = useState<BusinessProfile>(blankBusiness());
  const [setupMode, setSetupMode] = useState<"create" | "edit">("create");
  const [callLog, setCallLog] = useState<CallLogEntry[]>([]);

  const [live, setLive] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draftMsg, setDraftMsg] = useState("");
  const [ttfaMs, setTtfaMs] = useState<number | null>(null);
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listeningMic, setListeningMic] = useState(false);

  const playerRef = useRef<PcmPlayerHandle | null>(null);
  const speakAbortRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const turnsRef = useRef<Turn[]>([]);
  const activeRef = useRef<BusinessProfile | null>(null);

  useEffect(() => {
    const list = loadBusinesses();
    setBusinesses(list);
    setCallLog(loadCallLog());
    const current = getActiveBusiness() ?? list[0] ?? null;
    setActive(current);
    activeRef.current = current;
  }, []);

  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

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

  function refreshBusinesses() {
    const list = loadBusinesses();
    setBusinesses(list);
    const current = getActiveBusiness() ?? list[0] ?? null;
    setActive(current);
    activeRef.current = current;
  }

  function selectBusiness(business: BusinessProfile) {
    setActiveBusinessId(business.id);
    setActive(business);
    activeRef.current = business;
  }

  function interruptSpeech() {
    speakAbortRef.current?.abort();
    speakAbortRef.current = null;
    playerRef.current?.stop();
    playerRef.current = null;
  }

  async function speak(text: string, voiceId: string) {
    interruptSpeech();
    const abort = new AbortController();
    speakAbortRef.current = abort;
    setStatus("speaking");
    setError(null);

    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceId }),
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
    const business = activeRef.current;
    if (!business) {
      setError("Add a business first.");
      return;
    }

    const cleaned = message.trim();
    if (!opts?.greet && !cleaned) return;

    if (!opts?.greet) {
      setTurns((prev) => [...prev, { id: uid(), role: "caller", text: cleaned }]);
      setDraftMsg("");
    }

    setStatus("thinking");
    setError(null);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          opts?.greet
            ? { greet: true, business }
            : { message: cleaned, business },
        ),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || !data.reply) throw new Error(data.error || "Agent failed.");

      setTurns((prev) => [...prev, { id: uid(), role: "desk", text: data.reply! }]);
      await speak(data.reply, business.voiceId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Turn failed.";
      setError(msg);
      setStatus("idle");
    }
  }

  async function startCall() {
    if (!activeRef.current) {
      setError("Add or select a business first.");
      return;
    }
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

    const biz = activeRef.current;
    const finalTurns = turnsRef.current;
    if (biz && finalTurns.length > 0) {
      const entry: CallLogEntry = {
        id: uid(),
        businessId: biz.id,
        businessName: biz.name,
        at: Date.now(),
        turns: finalTurns.map((t) => ({ role: t.role, text: t.text })),
      };
      addCallLog(entry);
      setCallLog(loadCallLog());
    }
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
    };
    recognition.start();
  }

  function openCreate() {
    setSetupMode("create");
    setDraft(clonePreset(PRESETS[0]));
    setScreen("setup");
  }

  function openEdit(business: BusinessProfile) {
    selectBusiness(business);
    setSetupMode("edit");
    setDraft(structuredClone(business));
    setScreen("setup");
  }

  function saveDraft() {
    const saved = upsertBusiness(draft);
    refreshBusinesses();
    selectBusiness(saved);
    setScreen("desk");
  }

  const prompts = active ? promptsFor(active) : [];

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
          Put your business on a voice line that answers before callers hang up.
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-[var(--ink-soft)]/80">
          Add any shop, clinic, salon, or gym. Callers ask about hours, services, or
          bookings — your desk talks back. Interrupt anytime.
        </p>
      </header>

      <nav className="relative mt-8 flex flex-wrap gap-2 rise rise-delay-1">
        {(
          [
            ["home", "Home"],
            ["desk", "Desk"],
            ["setup", "Add business"],
            ["log", "Call log"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              if (id === "setup") openCreate();
              else setScreen(id);
            }}
            className={`rounded-full px-4 py-2 text-sm transition ${
              screen === id || (id === "setup" && screen === "setup")
                ? "bg-[var(--ink)] text-[var(--foam)]"
                : "border border-[var(--line)] bg-white/50 text-[var(--ink-soft)]"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      <section className="relative mt-8 rise rise-delay-2">
        {screen === "home" && (
          <div className="space-y-8">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={openCreate}
                className="rounded-full bg-[var(--harbor)] px-6 py-3 text-sm font-medium text-[var(--foam)] shadow-[0_18px_40px_var(--glow)]"
              >
                Add your business
              </button>
              {active && (
                <button
                  type="button"
                  onClick={() => setScreen("desk")}
                  className="rounded-full border border-[var(--line)] bg-white/60 px-6 py-3 text-sm text-[var(--ink)]"
                >
                  Open desk — {active.name}
                </button>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-soft)]/70">
                Your businesses
              </p>
              {businesses.length === 0 ? (
                <p className="text-sm text-[var(--ink-soft)]">
                  None yet. Add your own business to get started.
                </p>
              ) : (
                <ul className="space-y-2">
                  {businesses.map((b) => (
                    <li
                      key={b.id}
                      className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] py-3"
                    >
                      <div>
                        <p className="font-medium text-[var(--ink)]">
                          {b.name}
                          {b.id.startsWith("example-") && (
                            <span className="ml-2 text-[10px] uppercase tracking-[0.14em] text-[var(--harbor)]">
                              Example
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-[var(--ink-soft)]">{b.kind}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            selectBusiness(b);
                            setScreen("desk");
                          }}
                          className="rounded-full bg-[var(--ink)] px-4 py-2 text-xs text-[var(--foam)]"
                        >
                          Use desk
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(b)}
                          className="rounded-full border border-[var(--line)] px-4 py-2 text-xs text-[var(--ink-soft)]"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            deleteBusiness(b.id);
                            refreshBusinesses();
                          }}
                          className="rounded-full border border-[var(--line)] px-4 py-2 text-xs text-red-700/80"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {hasKey === false && (
              <p className="text-sm text-[var(--ink-soft)]">
                Speech needs <code className="rounded bg-white/60 px-1.5 py-0.5">ASSEMBLYAI_API_KEY</code>{" "}
                on the server.
              </p>
            )}
          </div>
        )}

        {screen === "setup" && (
          <BusinessSetup
            draft={draft}
            onChange={setDraft}
            onSave={saveDraft}
            onCancel={() => setScreen(businesses.length ? "home" : "home")}
            mode={setupMode}
          />
        )}

        {screen === "log" && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--ink-soft)]">
              Recent test calls from this browser.
            </p>
            {callLog.length === 0 ? (
              <p className="text-sm text-[var(--ink-soft)]">No calls logged yet.</p>
            ) : (
              callLog.map((entry) => (
                <article
                  key={entry.id}
                  className="border-b border-[var(--line)] pb-4"
                >
                  <p className="font-medium text-[var(--ink)]">{entry.businessName}</p>
                  <p className="text-xs text-[var(--ink-soft)]/70">
                    {new Date(entry.at).toLocaleString()}
                  </p>
                  <div className="mt-2 space-y-1">
                    {entry.turns.slice(0, 6).map((t, i) => (
                      <p key={i} className="text-sm text-[var(--ink-soft)]">
                        <span className="uppercase tracking-wide text-[10px]">
                          {t.role}:
                        </span>{" "}
                        {t.text}
                      </p>
                    ))}
                  </div>
                </article>
              ))
            )}
          </div>
        )}

        {screen === "desk" && (
          <div>
            {!active ? (
              <div className="space-y-4">
                <p className="text-sm text-[var(--ink-soft)]">
                  No business selected yet.
                </p>
                <button
                  type="button"
                  onClick={openCreate}
                  className="rounded-full bg-[var(--harbor)] px-6 py-3 text-sm font-medium text-[var(--foam)]"
                >
                  Add your business
                </button>
              </div>
            ) : !live ? (
              <div className="space-y-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--harbor)]">
                    Ready
                  </p>
                  <p className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
                    {active.name}
                  </p>
                  <p className="mt-1 text-sm text-[var(--ink-soft)]">
                    {active.kind} · {active.address}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void startCall()}
                    className="inline-flex items-center gap-3 rounded-full bg-[var(--harbor)] px-7 py-3.5 text-base font-medium text-[var(--foam)] shadow-[0_18px_40px_var(--glow)]"
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--signal)]" />
                    Pick up the line
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(active)}
                    className="rounded-full border border-[var(--line)] px-5 py-3 text-sm text-[var(--ink-soft)]"
                  >
                    Edit business
                  </button>
                </div>
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
                        {active.name}
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

                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {prompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        disabled={status === "thinking" || status === "speaking"}
                        onClick={() => void runTurn(prompt)}
                        className="rounded-full border border-[var(--line)] bg-white/50 px-3 py-1.5 text-left text-sm text-[var(--ink-soft)] transition hover:border-[var(--harbor)] disabled:opacity-40"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>

                  <form
                    className="flex flex-col gap-3 sm:flex-row"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void runTurn(draftMsg);
                    }}
                  >
                    <input
                      value={draftMsg}
                      onChange={(e) => setDraftMsg(e.target.value)}
                      placeholder="Type what the caller says…"
                      className="min-h-12 flex-1 rounded-2xl border border-[var(--line)] bg-white/70 px-4 text-[var(--ink)] outline-none focus:ring-2 focus:ring-[var(--harbor)]"
                    />
                    <button
                      type="submit"
                      disabled={!draftMsg.trim() || status === "thinking"}
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
                    <span className="font-medium text-[var(--ink)]">{status}</span>
                    {ttfaMs != null && (
                      <>
                        {" · "}first audio{" "}
                        <span className="font-medium text-[var(--harbor)]">
                          {ttfaMs} ms
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="mt-6 text-sm text-red-700/90" role="alert">
            {error}
          </p>
        )}
      </section>

      <footer className="relative mt-auto pt-16 text-xs text-[var(--ink-soft)]/70">
        CallDesk · voice front desk for any business
      </footer>
    </main>
  );
}
