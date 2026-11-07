import { expect, it } from "vitest";
import { drawingSchema, findDrawingArea, visualSchema } from "./canvas-visual";
import { demoDrawing } from "./services/visual-demo";
import { editorReducer, initialNotebook, newPage, notebookSchema } from "./model";

it("validates both demo scenes and rejects malformed geometry and duplicate IDs", () => {
  for (const type of [true, false]) expect(drawingSchema.safeParse(demoDrawing(type)).success).toBe(true);
  const drawing = demoDrawing(true);
  expect(drawingSchema.safeParse({ ...drawing, elements: [drawing.elements[0], drawing.elements[0]] }).success).toBe(false);
  expect(drawingSchema.safeParse({ ...drawing, elements: [{ ...drawing.elements[0], x: .9, width: .5 }] }).success).toBe(false);
  expect(drawingSchema.safeParse({ ...drawing, elements: [{ ...drawing.elements[0], width: -.1 }] }).success).toBe(false);
});

it("places a sketch below the selected work and avoids student strokes and existing sketches", () => {
  const page = newPage(1), anchor = { x: 40, y: 50, width: 400, height: 80 };
  page.strokes = [{ id: "s", points: [30, 200, 700, 200], tool: "pen", color: "ink", width: 3 }];
  const first = findDrawingArea(page, anchor)!;
  expect(first.y).toBeGreaterThan(219);
  page.annotations = [{ id: "a", text: "A sketch", kind: "hint", anchor, visual: { frame: first, drawing: demoDrawing(true) } }];
  const next = findDrawingArea(page, anchor)!;
  expect(next.y).toBeGreaterThan(first.y + first.height + 280);
});

it("extends imported pages without covering the original and refuses an oversized notebook", () => {
  const page = { ...newPage(1), background: "data:image/png;base64,test" };
  const area = findDrawingArea(page, null)!;
  expect(area.y).toBeGreaterThan(page.height);
  expect(findDrawingArea({ ...page, height: 5900 }, null)).toBeNull();
  expect(visualSchema.safeParse({ frame: { ...area, y: 5800 }, drawing: demoDrawing(false) }).success).toBe(false);
});

it("persists a canvas reply atomically and extends paper without changing writing or its revision", () => {
  const notebook = initialNotebook(), page = notebook.pages[0];
  const frame = { x: 64, y: 1200, width: 640, height: 300 };
  const state = { notebook, history: {} };
  const annotation = { id: "a", kind: "hint" as const, text: "Look at these functions", anchor: { x: 40, y: 200, width: 300, height: 80 }, visual: { frame, drawing: demoDrawing(true) } };
  expect(editorReducer(state, { type: "annotate", pageId: page.id, revision: 1, annotation })).toBe(state);
  const next = editorReducer(state, { type: "annotate", pageId: page.id, revision: 0, annotation });
  expect(next.notebook.pages[0].height).toBe(1780);
  expect(next.notebook.pages[0].revision).toBe(0);
  expect(next.notebook.pages[0].strokes).toEqual(page.strokes);
  expect(notebookSchema.parse(JSON.parse(JSON.stringify(next.notebook))).pages[0].annotations[0].visual).toEqual(annotation.visual);
});

it("preserves the original imported image height when a drawing extends its sheet", () => {
  const notebook = initialNotebook(), page = notebook.pages[0];
  page.background = "data:image/png;base64,synthetic";
  page.height = 200;
  const annotation = { id: "a", kind: "hint" as const, text: "A sketch", anchor: { x: 40, y: 40, width: 300, height: 50 }, visual: { frame: { x: 64, y: 250, width: 640, height: 300 }, drawing: demoDrawing(false) } };
  const result = editorReducer({ notebook, history: {} }, { type: "annotate", pageId: page.id, revision: 0, annotation });
  expect(result.notebook.pages[0].height).toBe(830);
  expect(result.notebook.pages[0].backgroundHeight).toBe(200);
});
