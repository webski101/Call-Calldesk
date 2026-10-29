/** Stream pcm_s16le mono chunks into Web Audio with interrupt support. */

export type PcmPlayerHandle = {
  stop: () => void;
  done: Promise<void>;
};

function pcm16ToAudioBuffer(
  ctx: AudioContext,
  pcm: ArrayBuffer,
  sampleRate: number,
): AudioBuffer {
  const view = new DataView(pcm);
  const samples = pcm.byteLength / 2;
  const buffer = ctx.createBuffer(1, samples, sampleRate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < samples; i++) {
    channel[i] = view.getInt16(i * 2, true) / 32768;
  }
  return buffer;
}

export async function playPcmStream(
  response: Response,
  options?: { onFirstAudio?: (ttfaHeaderMs: number | null) => void },
): Promise<PcmPlayerHandle> {
  if (!response.body) {
    throw new Error("No audio body in response.");
  }

  const sampleRate = Number(response.headers.get("X-TTS-Sample-Rate") || 24000);
  const ttfaHeader = response.headers.get("X-TTFA-Ms");
  const ttfaMs = ttfaHeader ? Number(ttfaHeader) : null;

  const ctx = new AudioContext({ sampleRate });
  await ctx.resume();

  const reader = response.body.getReader();
  let leftover = new Uint8Array(0);
  let nextTime = ctx.currentTime + 0.04;
  let stopped = false;
  let first = true;
  const sources: AudioBufferSourceNode[] = [];

  const stop = () => {
    stopped = true;
    for (const source of sources) {
      try {
        source.stop();
      } catch {
        /* already ended */
      }
    }
    void reader.cancel();
    void ctx.close();
  };

  const done = (async () => {
    try {
      while (!stopped) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        if (!value?.byteLength) continue;

        if (first) {
          first = false;
          options?.onFirstAudio?.(ttfaMs);
        }

        const merged = new Uint8Array(leftover.length + value.length);
        merged.set(leftover);
        merged.set(value, leftover.length);
        const even = merged.byteLength - (merged.byteLength % 2);
        if (even === 0) {
          leftover = merged;
          continue;
        }
        const chunk = merged.slice(0, even);
        leftover = merged.slice(even);

        const audioBuffer = pcm16ToAudioBuffer(
          ctx,
          chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength),
          sampleRate,
        );
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        const startAt = Math.max(ctx.currentTime + 0.02, nextTime);
        source.start(startAt);
        nextTime = startAt + audioBuffer.duration;
        sources.push(source);
      }

      if (!stopped && leftover.byteLength >= 2) {
        const even = leftover.byteLength - (leftover.byteLength % 2);
        const audioBuffer = pcm16ToAudioBuffer(
          ctx,
          leftover.buffer.slice(leftover.byteOffset, leftover.byteOffset + even),
          sampleRate,
        );
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        const startAt = Math.max(ctx.currentTime + 0.02, nextTime);
        source.start(startAt);
        nextTime = startAt + audioBuffer.duration;
        sources.push(source);
      }

      const waitMs = Math.max(0, (nextTime - ctx.currentTime) * 1000);
      if (!stopped && waitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitMs + 30));
      }
    } finally {
      if (!stopped) {
        void ctx.close();
      }
    }
  })();

  return { stop, done };
}
