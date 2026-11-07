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
  it.each([
    [{ detail: { code: "provider_authentication_failed" } }, "AI authentication failed"],
    [{ detail: "private-provider-error" }, "The tutor is unavailable"],
    [null, "The tutor is unavailable"],
  ])("handles API errors without exposing arbitrary provider content: %j", async (body, message) => {
    vi.stubEnv("VITE_TUTOR_API_URL", "/api");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        if (body === null) throw new SyntaxError("Non-JSON proxy response");
        return body;
      },
    }));
    const { requestTutor } = await import("./tutor");
    await expect(requestTutor(request, newPage(1), new AbortController().signal)).rejects.toThrow(message);
  });
  it("keeps a demo review explicit and never records assessed progress", async () => {
    vi.stubEnv("VITE_TUTOR_API_URL", "");
    vi.useFakeTimers();
    const { requestTutor } = await import("./tutor");
    const pending = requestTutor(
      { ...request, intent: "check" },
      newPage(1),
      new AbortController().signal,
    );
    await vi.runAllTimersAsync();
    const result = await pending;
    expect(result.annotation.mode).toBe("demo");
    expect(result.observation?.outcome).toBe("demo");
    expect(result.annotation.text).toContain("cannot assess");
  });
  it("sends current page geometry, review intent and memory, stripping invented citations", async () => {
    vi.stubEnv("VITE_TUTOR_API_URL", "https://tutor.example");
    const fetcher = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          pageId: "page",
          revision: 2,
          annotation: {
            id: "a",
            kind: "hint",
            text: "A hint",
            anchor: { x: 0, y: 0, width: 30, height: 30 },
            source: "Fake source",
            sourceRef: {
              materialId: "missing",
              page: 1,
              quote: "This quotation was invented",
            },
          },
          observation: { summary: "Needs clarification", outcome: "uncertain" },
        }),
      });
    vi.stubGlobal("fetch", fetcher);
    const { requestTutor } = await import("./tutor");
    const observations = [
      { summary: "Earlier difficulty", outcome: "needs-work", revision: 1 },
    ];
    const result = await requestTutor(
      { ...request, intent: "check", observations },
      { ...newPage(1), height: 300 },
      new AbortController().signal,
    );
    const sent = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(sent.pageHeight).toBe(300);
    expect(sent.intent).toBe("check");
    expect(sent.observations).toEqual(observations);
    expect(result.annotation.sourceRef).toBeUndefined();
    expect(result.annotation.source).toBeUndefined();
    expect(result.annotation.mode).toBe("connected");
  });
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
        vi.fn().mockResolvedValue({
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
