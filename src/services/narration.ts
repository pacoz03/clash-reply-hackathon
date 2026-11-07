import { z } from "zod";

export type NarrationSegment = { id: string; text: string };
export type NarrationClip<T> = { id: string; data: T };
type Player<T> = {
  unlock: () => Promise<void>;
  stop: () => void;
  play: (data: T, onStart: () => void, onEnd: () => void, onError: (error?: unknown) => void) => void;
};
const speechResponseSchema = z.object({
  clips: z.array(z.object({ id: z.string(), audio: z.string().min(44).max(12_000_000) })).min(1).max(6),
});

export async function loadSpeech(segments: NarrationSegment[], signal: AbortSignal) {
  const controller = new AbortController();
  const abort = () => controller.abort(signal.reason);
  if (signal.aborted) abort();
  else signal.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(() => controller.abort(new Error("The OpenAI voice took too long. Please try again.")), 50_000);
  try {
  const endpoint = import.meta.env.VITE_VOICE_API_URL || import.meta.env.VITE_TUTOR_API_URL || "/api";
  const response = await fetch(`${endpoint.replace(/\/$/, "")}/tutor/speech`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ segments }), signal: controller.signal,
  });
  if (!response.ok) throw new Error(response.status === 503
    ? "Configure the OpenAI voice model on the server to hear explanations."
    : "The OpenAI voice is unavailable. Please try again.");
  const result = speechResponseSchema.parse(await response.json());
  if (result.clips.length !== segments.length || result.clips.some((clip, i) => clip.id !== segments[i].id))
    throw new Error("This audio does not match the current explanation.");
  return result.clips;
  } finally { clearTimeout(timeout); signal.removeEventListener("abort", abort); }
}

// Highlight actual clip playback, never estimated word durations. Cancel stale loads and callbacks.
export function createNarrator<T>(load: (segments: NarrationSegment[], signal: AbortSignal) => Promise<NarrationClip<T>[]>, player: Player<T>) {
  let generation = 0;
  let controller: AbortController | null = null;
  const stop = () => { generation++; controller?.abort(); player.stop(); };
  return {
    stop,
    async play(segments: NarrationSegment[], onSegment: (id: string | null) => void, onError: (error: unknown) => void) {
      stop();
      const token = generation;
      controller = new AbortController();
      const signal = controller.signal;
      const fail = (error: unknown) => {
        if (token !== generation) return;
        stop(); onSegment(null); onError(error);
      };
      try {
        const unlocked = player.unlock();
        const [clips] = await Promise.all([load(segments, signal), unlocked]);
        if (token !== generation) return;
        const next = (index: number) => {
          if (token !== generation) return;
          const clip = clips[index];
          if (!clip) { stop(); onSegment(null); return; }
          try {
            player.play(clip.data, () => { if (token === generation) onSegment(clip.id); }, () => next(index + 1), (reason) => fail(reason ?? new Error("Audio playback failed. Try again.")));
          } catch (error) { fail(error); }
        };
        next(0);
      } catch (error) { fail(error); }
    },
  };
}
