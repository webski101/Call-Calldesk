# CallDesk

A front-desk voice line for small businesses. Callers ask about hours, the menu, directions, wifi, or a table — the desk answers out loud, fast, and you can interrupt mid-sentence.

Demo shop: **Harbor Roast**.

## Features

- Pick up the line and get a spoken greeting
- Ask by typing, quick prompts, or mic (Chrome/Edge speech recognition)
- Streaming text-to-speech via [AssemblyAI](https://www.assemblyai.com/) (`assemblyai-tts-1`)
- **Interrupt** barges in and stops playback immediately
- Shows time-to-first-audio for each spoken reply

## Setup

```bash
cp .env.example .env.local
```

Add your AssemblyAI API key:

```bash
ASSEMBLYAI_API_KEY=your_key_here
```

Then:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Try it

1. Click **Pick up the line**
2. Ask something like “What are your hours?” or “Can I book a table for 4 tonight?”
3. While the desk is speaking, hit **Interrupt**
4. Hang up when you’re done

## How it works

| Piece | Role |
| --- | --- |
| `src/lib/business.ts` | Harbor Roast knowledge + replies (no LLM required) |
| `src/app/api/agent` | Turns caller text into a desk reply |
| `src/app/api/speak` | Streams PCM audio from AssemblyAI TTS |
| `src/lib/pcmPlayer.ts` | Plays the stream in the browser; stop = barge-in |
| `src/components/CallDeskApp.tsx` | Call UI |

## Scripts

```bash
npm run dev      # local development
npm run build    # production build
npm run start    # serve the build
```
