// A media element uses iPad's playback audio route; Web Audio may be silenced
// by the device's silent setting even while its clock and callbacks advance.
export function silentWave() {
  const bytes = new Uint8Array(524), view = new DataView(bytes.buffer);
  const text = (at: number, value: string) => { for (let i = 0; i < value.length; i++) bytes[at + i] = value.charCodeAt(i); };
  text(0, "RIFF"); view.setUint32(4, 516, true); text(8, "WAVEfmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, 24000, true); view.setUint32(28, 48000, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  text(36, "data"); view.setUint32(40, 480, true);
  return bytes;
}

export function createMediaPlayer(audio: HTMLAudioElement, primerUrl: string) {
  let generation = 0;
  audio.preload = "auto";
  audio.setAttribute("playsinline", "");
  const stop = () => {
    generation++;
    audio.onplaying = null; audio.onended = null; audio.onerror = null;
    audio.pause();
  };
  return {
    stop,
    unlock: async () => {
      const token = generation;
      audio.muted = false; audio.volume = 1;
      audio.src = primerUrl;
      // This call runs synchronously inside the touch/click before fetching clips.
      await audio.play();
      if (token === generation) audio.pause();
    },
    play: (url: string, onStart: () => void, onEnd: () => void, onError: (error?: unknown) => void) => {
      audio.onplaying = onStart;
      audio.onended = onEnd;
      audio.onerror = () => onError(new Error("Audio could not be played. Tap Explain aloud to retry."));
      audio.src = url;
      void audio.play().catch((error: unknown) => onError(error instanceof DOMException && error.name === "NotAllowedError"
        ? new Error("Tap Explain aloud again to allow audio on this device.") : error));
    },
  };
}
