import { afterEach, describe, expect, it, vi } from "vitest";
import { newPage } from "../model";
const request = {
  pageId: "page",
  revision: 2,
  image: "data:image/png;base64,abc",
  selection: null,
  question: "Un indizio",
  previousHints: [],
};
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.resetModules();
});
describe("richieste tutor", () => {
  it("interrompe una richiesta demo annullata", async () => {
    vi.stubEnv("VITE_TUTOR_API_URL", "");
    const { requestTutor } = await import("./tutor");
    const controller = new AbortController();
    const pending = requestTutor(request, newPage(1), controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });
  it("ancora il suggerimento anche a immagini importate molto basse", async () => {
    vi.stubEnv("VITE_TUTOR_API_URL", "");
    vi.useFakeTimers();
    const { requestTutor } = await import("./tutor");
    const page = { ...newPage(1), id: "page", height: 35 };
    const pending = requestTutor(request, page, new AbortController().signal);
    await vi.runAllTimersAsync();
    const response = await pending;
    expect(
      response.annotation.anchor.y + response.annotation.anchor.height,
    ).toBeLessThanOrEqual(page.height);
  });
  it.each([
    {
      pageId: "other",
      revision: 2,
      anchor: { x: 0, y: 0, width: 30, height: 30 },
    },
    {
      pageId: "page",
      revision: 1,
      anchor: { x: 0, y: 0, width: 30, height: 30 },
    },
    {
      pageId: "page",
      revision: 2,
      anchor: { x: 780, y: 0, width: 30, height: 30 },
    },
  ])(
    "rifiuta pagina, revisione o coordinate incoerenti: %j",
    async (result) => {
      vi.stubEnv("VITE_TUTOR_API_URL", "https://tutor.example");
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue({
            ok: true,
            json: async () => ({
              pageId: result.pageId,
              revision: result.revision,
              annotation: {
                id: "a",
                kind: "hint",
                text: "Un indizio",
                anchor: result.anchor,
              },
            }),
          }),
      );
      const { requestTutor } = await import("./tutor");
      await expect(
        requestTutor(request, newPage(1), new AbortController().signal),
      ).rejects.toThrow();
    },
  );
});
