import { useEffect, useRef, useState } from "react";
import { visualSpeech } from "./canvas-visual";
import type { Annotation } from "./model";
import { createNarrator, loadSpeech } from "./services/narration";
import { createMediaPlayer, silentWave } from "./services/media-player";

export function useNarration() {
  const supported = typeof window !== "undefined" && "HTMLAudioElement" in window;
  const narrator = useRef<ReturnType<typeof createNarrator<string>> | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const primer = useRef<string | null>(null);
  const cache = useRef(new Map<string, { id: string; data: string }[]>());
  const [playing, setPlaying] = useState<{ annotationId: string; elementId: string | null } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => () => {
    narrator.current?.stop(); audio.current?.remove();
    if (primer.current) URL.revokeObjectURL(primer.current);
    cache.current.forEach((clips) => clips.forEach((c) => URL.revokeObjectURL(c.data)));
  }, []);
  const stop = () => { narrator.current?.stop(); setPlaying(null); };
  const play = (annotation: Annotation) => {
    if (!supported) { setError("Audio playback is not available in this browser."); return; }
    try {
      const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
      if (session) session.type = "playback";
    } catch { /* Older Safari versions still use the media element's playback route. */ }
    if (!audio.current) {
      audio.current = document.createElement("audio");
      audio.current.hidden = true;
      audio.current.setAttribute("aria-hidden", "true");
      document.body.append(audio.current);
      primer.current = URL.createObjectURL(new Blob([silentWave()], { type: "audio/wav" }));
    }
    narrator.current ??= createNarrator(async (segments, signal) => {
      const key = JSON.stringify(segments);
      const cached = cache.current.get(key);
      if (cached) return cached;
      const clips = await loadSpeech(segments, signal);
      if (signal.aborted) throw new DOMException("Cancelled", "AbortError");
      const prepared = clips.map((clip) => ({ id: clip.id, data: URL.createObjectURL(new Blob([Uint8Array.from(atob(clip.audio), (c) => c.charCodeAt(0))], { type: "audio/wav" })) }));
      if (cache.current.size >= 5) {
        const oldest = cache.current.keys().next().value!;
        cache.current.get(oldest)?.forEach((c) => URL.revokeObjectURL(c.data));
        cache.current.delete(oldest);
      }
      cache.current.set(key, prepared);
      return prepared;
    }, createMediaPlayer(audio.current, primer.current!));
    const segments = annotation.visual ? visualSpeech(annotation.visual).slice(0, 5) : [];
    if (!segments.length) segments.push({ id: "note", text: annotation.text });
    setError(""); setPlaying({ annotationId: annotation.id, elementId: null });
    void narrator.current.play(segments, (id) => setPlaying(id ? { annotationId: annotation.id, elementId: id } : null), (reason) => setError(reason instanceof Error ? reason.message : "The OpenAI voice could not start. Please try again."));
  };
  return { supported, playing, error, play, stop, clearError: () => setError("") };
}
