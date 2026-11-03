# CallDesk

A voice front desk for **any business**. Owners add their shop (hours, address, services, booking rules, voice, optional pitch). Callers ask questions; the desk answers out loud and can be interrupted mid-sentence.

## Built for AssemblyAI Voice Hackathon Week

CallDesk uses **AssemblyAI streaming TTS** (`assemblyai-tts-1`) end to end:

- Server route `POST /api/speak` calls `client.tts.stream()` and returns raw **24 kHz PCM** as it arrives
- The browser plays chunks immediately via Web Audio and shows **first-audio latency**
- **Interrupt** aborts the fetch and stops playback mid-sentence (barge-in)

That keeps the voice desk feeling like a live call, not a download-then-play toy.

## What you can do on the site

1. **Add your business** — blank form or templates (café, clinic, salon, gym)
2. **Pick a voice** — AssemblyAI voices
3. **Optional pitch** — spoken after the greeting / when callers ask what you do
4. **Open the desk** — pick up the line and test like a real caller
5. **Call log** — recent test calls saved in this browser

Business profiles are stored in the browser (`localStorage`) for this demo.

## Setup

```bash
cp .env.example .env.local
```

```bash
ASSEMBLYAI_API_KEY=your_key_here
```

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How it works

| Piece | Role |
| --- | --- |
| Home | Your saved businesses |
| Add business | Profile + voice + pitch |
| Desk | Live call with streaming TTS |
| Call log | Recent conversations |
| `src/lib/business.ts` | Generic replies from any profile |
| `src/app/api/speak` | AssemblyAI TTS stream (rate-limited) |

## Scripts

```bash
npm run dev
npm run build
npm run start
```
