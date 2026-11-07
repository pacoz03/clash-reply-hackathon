import { afterEach, expect, it, vi } from "vitest";
import { createNarrator, loadSpeech } from "./narration";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
const segments = [{ id: "weight", text: "Weight points down." }, { id: "normal", text: "The normal points up." }];
function setup() {
  const clips: { data: string; start: () => void; end: () => void; error: () => void }[] = [];
  const player = { unlock: vi.fn().mockResolvedValue(undefined), stop: vi.fn(), play: (data: string, start: () => void, end: () => void, error: () => void) => clips.push({ data, start, end, error }) };
  const load = vi.fn().mockResolvedValue(segments.map((s) => ({ id: s.id, data: s.text })));
  const narrator = createNarrator<string>(load, player);
  return { narrator, clips, load, player, change: vi.fn(), error: vi.fn() };
}
it("unlocks on click and highlights clips at playback, advancing on actual end events", async () => {
  const s = setup();
  await s.narrator.play(segments, s.change, s.error);
  expect(s.player.unlock).toHaveBeenCalledOnce();
  expect(s.change).not.toHaveBeenCalled();
  s.clips[0].start();
  expect(s.change).toHaveBeenLastCalledWith("weight");
  s.clips[0].end();
  s.clips[1].start();
  expect(s.change).toHaveBeenLastCalledWith("normal");
  s.clips[1].end();
  expect(s.change).toHaveBeenLastCalledWith(null);
});
it("cancels loading and prevents old callbacks from restarting audio", async () => {
  const s = setup();
  await s.narrator.play(segments, s.change, s.error);
  s.narrator.stop();
  expect(s.load.mock.calls[0][1].aborted).toBe(true);
  s.clips[0].start(); s.clips[0].end();
  expect(s.clips).toHaveLength(1);
  expect(s.change).not.toHaveBeenCalled();
});
it("ignores audio that arrives after cancellation", async () => {
  const s = setup();
  let resolve!: (value: { id: string; data: string }[]) => void;
  s.load.mockReturnValue(new Promise((r) => { resolve = r; }));
  const pending = s.narrator.play(segments, s.change, s.error);
  s.narrator.stop();
  resolve([{ id: "weight", data: "late" }]);
  await pending;
  expect(s.clips).toHaveLength(0);
});
it("clears highlighting and reports load and playback failures", async () => {
  const s = setup();
  await s.narrator.play(segments, s.change, s.error);
  s.clips[0].error();
  expect(s.error).toHaveBeenCalledOnce();
  expect(s.change).toHaveBeenLastCalledWith(null);
  s.load.mockRejectedValue(new Error("Voice unavailable"));
  await s.narrator.play(segments, s.change, s.error);
  expect(s.error).toHaveBeenCalledTimes(2);
});
it("sends only explanation text to the voice backend and rejects mismatched clips", async () => {
  vi.stubEnv("VITE_VOICE_API_URL", "/api");
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ clips: [{ id: "different", audio: "a".repeat(44) }] }) });
  vi.stubGlobal("fetch", fetcher);
  await expect(loadSpeech(segments, new AbortController().signal)).rejects.toThrow("does not match");
  expect(fetcher.mock.calls[0][0]).toBe("/api/tutor/speech");
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ segments });
});
