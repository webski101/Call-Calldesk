# CallDesk

AssemblyAI Voice Hackathon submission: a **front-desk voice line** for a demo café (**Harbor Roast**). Callers ask about hours, menu, directions, wifi, or a table — the desk answers with **AssemblyAI-TTS-1** streaming speech. Hit **Interrupt** mid-sentence to barge in.

## Why this

Not a TTS playground. Judges hear a real conversation loop: caller → agent → streamed voice → barge-in.

## Setup

```bash
cp .env.example .env.local
# paste ASSEMBLYAI_API_KEY
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Hackathon credits:

- [$100 credits](https://www.assemblyai.com/dashboard/signup?utm_source=event&utm_medium=credit-grant&utm_campaign=tts_hackathon_oct_2026)
- [Extra $50](https://www.assemblyai.com/dashboard/signup?utm_source=event&utm_medium=credit-grant&utm_campaign=tts_hackathon_oct_2026_extra)

## Demo script

1. **Pick up the line** — greeting streams in Audrey’s voice  
2. Ask **“What are your hours?”** (chip or type)  
3. While it’s speaking, hit **Interrupt**  
4. Ask **“Can I book a table for 4 tonight?”**  
5. Note **first audio __ ms** under the controls  

Mic **Talk** uses browser speech recognition (Chrome/Edge). Typing always works.

## Stack

- Next.js App Router  
- Rule-based café agent (`src/lib/business.ts`) — no LLM key required  
- `client.tts.stream()` → raw PCM → Web Audio playback  
- Abort + player stop = barge-in  

## Submit

Form: https://forms.gle/XCW2RdZGbarVLnKEA  

Include a short screen recording of the call + interrupt, repo/demo link, and note AssemblyAI-TTS-1.
