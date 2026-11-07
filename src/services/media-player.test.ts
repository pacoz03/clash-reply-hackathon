import { expect, it, vi } from "vitest";
import { createMediaPlayer, silentWave } from "./media-player";

function setup() {
  const audio = { preload: "", muted: true, volume: 0, src: "", setAttribute: vi.fn(), play: vi.fn().mockResolvedValue(undefined), pause: vi.fn(), onplaying: null as (() => void) | null, onended: null as (() => void) | null, onerror: null as (() => void) | null };
  return { audio, player: createMediaPlayer(audio as unknown as HTMLAudioElement, "blob:primer") };
}
it("unlocks the same media element inside the click and uses actual playing events for highlights", async () => {
  const { audio, player } = setup(), start = vi.fn(), end = vi.fn(), error = vi.fn();
  const unlocked = player.unlock();
  expect(audio.play).toHaveBeenCalledOnce();
  expect(audio.src).toBe("blob:primer");
  expect(audio.muted).toBe(false);
  expect(audio.volume).toBe(1);
  await unlocked;
  player.play("blob:openai-clip", start, end, error);
  expect(audio.src).toBe("blob:openai-clip");
  expect(start).not.toHaveBeenCalled();
  audio.onplaying?.();
  expect(start).toHaveBeenCalledOnce();
  audio.onended?.();
  expect(end).toHaveBeenCalledOnce();
  player.stop();
  expect(audio.onplaying).toBeNull();
  expect(audio.onended).toBeNull();
});
it("reports Safari autoplay rejection instead of highlighting silent playback", async () => {
  const { audio, player } = setup(), error = vi.fn(), start = vi.fn();
  audio.play.mockRejectedValue(new DOMException("Blocked", "NotAllowedError"));
  player.play("blob:voice", start, vi.fn(), error);
  await Promise.resolve();
  expect(error.mock.calls[0][0].message).toContain("Tap Explain aloud again");
  expect(start).not.toHaveBeenCalled();
});
it("creates a complete short PCM WAV for gesture activation", () => {
  const bytes = silentWave(), view = new DataView(bytes.buffer);
  expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe("RIFF");
  expect(view.getUint32(4, true)).toBe(bytes.length - 8);
  expect(view.getUint32(24, true)).toBe(24000);
  expect(view.getUint32(40, true)).toBe(bytes.length - 44);
});
