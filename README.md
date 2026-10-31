# CallDesk

A voice front desk for **any business**. Owners add their shop (hours, address, services, booking rules, voice). Callers ask questions; the desk answers out loud and can be interrupted mid-sentence.

## What you can do on the site

1. **Add your business** — blank form or templates (café, clinic, salon, gym)
2. **Pick a voice** — AssemblyAI voices
3. **Open the desk** — pick up the line and test like a real caller
4. **Call log** — recent test calls saved in this browser

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
| Add business | Profile + voice |
| Desk | Live call with streaming TTS |
| Call log | Recent conversations |
| `src/lib/business.ts` | Generic replies from any profile |
| `src/app/api/speak` | AssemblyAI TTS stream |

## Scripts

```bash
npm run dev
npm run build
npm run start
```
