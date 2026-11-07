import { z } from "zod";
import type { Page, Selection } from "./model";

export const visualElementSchema = z.object({
  id: z.string().min(1).max(60),
  kind: z.enum(["label", "arrow", "line", "box", "ellipse"]),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().min(-1).max(1),
  height: z.number().min(-1).max(1),
  text: z.string().max(100),
  color: z.enum(["ink", "sage", "clay"]),
  speech: z.string().max(260),
}).superRefine((e, ctx) => {
  if (e.x + e.width < 0 || e.x + e.width > 1 || e.y + e.height < 0 || e.y + e.height > 1)
    ctx.addIssue({ code: "custom", message: "Drawing element leaves its frame" });
  if (!["arrow", "line"].includes(e.kind) && (e.width <= 0 || e.height <= 0))
    ctx.addIssue({ code: "custom", message: "Shapes and labels need positive dimensions" });
});
export const drawingSchema = z.object({
  title: z.string().min(1).max(80),
  elements: z.array(visualElementSchema).min(1).max(24),
}).refine((d) => new Set(d.elements.map((e) => e.id)).size === d.elements.length, "Drawing IDs must be unique");
export const visualSchema = z.object({
  frame: z.object({ x: z.number().nonnegative(), y: z.number().nonnegative(), width: z.number().positive(), height: z.number().positive() }),
  drawing: drawingSchema,
}).refine(({ frame: f }) => f.x + f.width <= 794 && f.y + f.height + 280 <= 6000, "Drawing frame leaves the notebook");
export type CanvasVisual = z.infer<typeof visualSchema>;
export type VisualElement = z.infer<typeof visualElementSchema>;

function intersects(a: Selection, b: Selection) {
  return a.x < b.x + b.width + 16 && a.x + a.width + 16 > b.x && a.y < b.y + b.height + 16 && a.y + a.height + 16 > b.y;
}

export function findDrawingArea(page: Page, anchor: Selection | null): Selection | null {
  const width = 640, height = 300;
  const occupied: Selection[] = page.annotations.flatMap((a) => a.visual ? [{ ...a.visual.frame, height: a.visual.frame.height + 280 }] : []);
  if (page.background) occupied.push({ x: 0, y: 0, width: 794, height: page.backgroundHeight ?? page.height });
  if (page.template) occupied.push({ x: 40, y: 50, width: 715, height: 470 });
  if (anchor) occupied.push(anchor);
  for (const stroke of page.strokes) {
    if (stroke.tool === "eraser" || stroke.points.length < 2) continue;
    let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
    for (let i = 0; i < stroke.points.length - 1; i += 2) {
      left = Math.min(left, stroke.points[i]); right = Math.max(right, stroke.points[i]);
      top = Math.min(top, stroke.points[i + 1]); bottom = Math.max(bottom, stroke.points[i + 1]);
    }
    occupied.push({ x: left - stroke.width, y: top - stroke.width, width: right - left + stroke.width * 2, height: bottom - top + stroke.width * 2 });
  }
  const start = anchor ? anchor.y + anchor.height + 32 : 80;
  for (let y = start; y + height + 280 <= 6000; y += 32) {
    const candidate = { x: 64, y, width, height };
    if (!occupied.some((area) => intersects({ ...candidate, height: height + 280 }, area))) return candidate;
  }
  return null;
}

export function visualSpeech(visual: CanvasVisual) {
  return visual.drawing.elements.filter((e) => e.speech.trim()).map((e) => ({ id: e.id, text: e.speech }));
}
