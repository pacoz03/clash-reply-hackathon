import { z } from "zod";
import { annotationSchema, uid, type Page, type Selection } from "../model";
import { citationMatches, type SourceExcerpt } from "./materials";
import { findDrawingArea, visualSchema } from "../canvas-visual";
import { demoDrawing } from "./visual-demo";

export const tutorMode = import.meta.env.VITE_TUTOR_API_URL
  ? "connected"
  : "demo";
export interface TutorRequest {
  pageId: string;
  revision: number;
  image: string;
  selection: Selection | null;
  question: string;
  previousHints: string[];
  notebookId?: string;
  intent?: "hint" | "explain" | "check";
  sources?: SourceExcerpt[];
  observations?: { summary: string; outcome: string; revision: number }[];
  presentation?: "note" | "canvas";
  drawingArea?: Selection | null;
}
export const tutorResponseSchema = z.object({
  pageId: z.string(),
  revision: z.number().int(),
  annotation: annotationSchema,
  observation: z
    .object({
      summary: z.string().min(1).max(300),
      outcome: z.enum(["needs-work", "progress", "uncertain", "demo"]),
    })
    .optional(),
});
export type TutorResponse = z.infer<typeof tutorResponseSchema>;

export async function requestTutor(
  request: TutorRequest,
  page: Page,
  signal: AbortSignal,
): Promise<TutorResponse> {
  if (tutorMode === "connected") {
    const response = await fetch(
      `${import.meta.env.VITE_TUTOR_API_URL.replace(/\/$/, "")}/tutor/help`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...request, pageHeight: page.height }),
        signal,
      },
    );
    if (!response.ok) {
      const error = z.object({
        detail: z.object({ code: z.literal("provider_authentication_failed") }),
      }).safeParse(await response.json().catch(() => null));
      if (error.success)
        throw new Error(
          "AI authentication failed. Update the server API key and restart the backend. Your writing is safe.",
        );
      throw new Error(
        response.status === 503
          ? "The tutor is not configured yet. Your writing is safe on this device."
          : "The tutor is unavailable. Your writing is safe: please try again.",
      );
    }
    const result = tutorResponseSchema.parse(await response.json());
    if (
      result.pageId !== request.pageId ||
      result.revision !== request.revision
    )
      throw new Error(
        "This reply refers to different writing. Ask for a new review.",
      );
    const a = result.annotation.anchor;
    if (
      a.x < 0 ||
      a.y < 0 ||
      a.x + a.width > 794 ||
      a.y + a.height > page.height
    )
      throw new Error(
        "The tutor pointed outside the page. Try selecting the step again.",
      );
    if (
      result.annotation.sourceRef &&
      !citationMatches(request.sources ?? [], result.annotation.sourceRef)
    ) {
      delete result.annotation.sourceRef;
      delete result.annotation.source;
    }
    result.annotation.revision = request.revision;
    result.annotation.mode = "connected";
    if (result.annotation.visual) {
      const frame = request.drawingArea;
      if (request.presentation !== "canvas" || !frame) delete result.annotation.visual;
      else result.annotation.visual = visualSchema.parse({ ...result.annotation.visual, frame });
    }
    return result;
  }
  // Deliberately scripted: never claim to have read or verified the student's work.
  await new Promise<void>((resolve, reject) => {
    if (signal.aborted)
      return reject(new DOMException("Aborted", "AbortError"));
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, 650);
    signal.addEventListener("abort", onAbort, { once: true });
  });
  const hints =
    page.template === "chain-rule"
      ? [
          "Guided example: identify the outer and inner functions. What is the derivative of each?",
          "Guided example: set u = x² + 1. How do you combine the derivative of sin(u) with the derivative of u?",
        ]
      : [
          "Demo hint: which principle or rule supports this step? Try writing it beside your work.",
          "Demo hint: check your assumptions. Are the symbols, domain and units consistent?",
        ];
  return {
    pageId: request.pageId,
    revision: request.revision,
    annotation: {
      id: uid(),
      kind: "question",
      anchor: request.selection ?? {
        x: 60,
        y: Math.min(page.template ? 355 : 210, Math.max(0, page.height - 70)),
        width: 420,
        height: Math.min(70, page.height),
      },
      text:
        request.intent === "check"
          ? "Demo review: compare your new attempt with the earlier hint. This scripted example cannot assess whether your work is correct."
          : hints[Math.min(request.previousHints.length, hints.length - 1)],
      source: "Local demo · scripted guidance, no AI analysis",
      revision: request.revision,
      mode: "demo",
      ...(request.presentation === "canvas" ? {
        visual: { frame: request.drawingArea ?? findDrawingArea(page, request.selection)!, drawing: demoDrawing(page.template === "chain-rule") },
      } : {}),
    },
    observation: {
      summary:
        request.intent === "check"
          ? "A new review was requested. The demo cannot assess the change."
          : "A scripted hint was requested. No difficulty has been assessed by AI.",
      outcome: "demo",
    },
  };
}
