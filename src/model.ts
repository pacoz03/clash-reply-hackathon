import { z } from "zod";
import { annotationGroupId } from "./annotation-groups";
import { visualSchema } from "./canvas-visual";

export const PAGE_WIDTH = 794;
export const PAGE_HEIGHT = 1123;
export const pointSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});
export const selectionSchema = pointSchema.extend({
  width: z.number().positive(),
  height: z.number().positive(),
});
export type Selection = z.infer<typeof selectionSchema>;
export type Tool = "pen" | "eraser" | "select" | "hand";
const strokeSchema = z.object({
  id: z.string(),
  points: z.array(z.number().finite()),
  color: z.string(),
  width: z.number().positive(),
  tool: z.enum(["pen", "eraser"]),
});
export type Stroke = z.infer<typeof strokeSchema>;
export const sourceReferenceSchema = z.object({
  materialId: z.string(),
  page: z.number().int().positive(),
  quote: z.string().min(1).max(500),
});
export const observationSchema = z.object({
  id: z.string(),
  pageId: z.string(),
  revision: z.number().int().nonnegative(),
  intent: z.enum(["hint", "explain", "check"]),
  hint: z.string().max(600),
  summary: z.string().min(1).max(300),
  outcome: z.enum(["needs-work", "progress", "uncertain", "demo"]),
  createdAt: z.number(),
  mode: z.enum(["demo", "connected"]),
});
export type Observation = z.infer<typeof observationSchema>;
export const annotationSchema = z.object({
  id: z.string(),
  anchor: selectionSchema,
  text: z.string().min(1).max(600),
  kind: z.enum(["hint", "question"]),
  source: z.string().optional(),
  sourceRef: sourceReferenceSchema.optional(),
  groupId: z.string().optional(),
  visual: visualSchema.optional(),
  revision: z.number().int().nonnegative().optional(),
  mode: z.enum(["demo", "connected"]).optional(),
});
export type Annotation = z.infer<typeof annotationSchema>;
export const pageSchema = z.object({
  id: z.string(),
  title: z.string(),
  revision: z.number().int().nonnegative(),
  height: z.number().positive().max(6000),
  paper: z.enum(["dots", "lines", "plain"]),
  strokes: z.array(strokeSchema),
  annotations: z.array(annotationSchema),
  hiddenHintGroups: z.array(z.string()).optional(),
  background: z.string().optional(),
  backgroundHeight: z.number().positive().max(6000).optional(),
  template: z.literal("chain-rule").optional(),
});
export type Page = z.infer<typeof pageSchema>;
export const notebookSchema = z.object({
  schemaVersion: z.literal(1),
  title: z.string(),
  activePageId: z.string(),
  pages: z.array(pageSchema).min(1),
  observations: z.array(observationSchema).max(100).optional(),
});
export type Notebook = z.infer<typeof notebookSchema>;
export function uid() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `id-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}
export function newPage(index: number): Page {
  return {
    id: uid(),
    title: `Exercise ${String(index).padStart(2, "0")}`,
    revision: 0,
    height: PAGE_HEIGHT,
    paper: "dots",
    strokes: [],
    annotations: [],
  };
}
export function initialNotebook(): Notebook {
  const page = {
    ...newPage(1),
    title: "The chain rule",
    template: "chain-rule" as const,
  };
  return {
    schemaVersion: 1,
    title: "My first notebook",
    activePageId: page.id,
    pages: [page],
  };
}
export function selectionFromPoints(
  a: { x: number; y: number },
  b: { x: number; y: number },
  height: number,
): Selection | null {
  const x = Math.max(0, Math.min(PAGE_WIDTH, Math.min(a.x, b.x)));
  const y = Math.max(0, Math.min(height, Math.min(a.y, b.y)));
  const width = Math.min(PAGE_WIDTH, Math.max(a.x, b.x)) - x;
  const h = Math.min(height, Math.max(a.y, b.y)) - y;
  return width >= 8 && h >= 8 ? { x, y, width, height: h } : null;
}
export type History = { past: Stroke[][]; future: Stroke[][] };
export type EditorState = {
  notebook: Notebook;
  history: Record<string, History>;
};
export type EditorAction =
  | { type: "replace"; notebook: Notebook }
  | { type: "title"; title: string }
  | { type: "activate"; id: string }
  | { type: "add-pages"; pages: Page[] }
  | { type: "stroke"; pageId: string; stroke: Stroke }
  | { type: "undo" | "redo" | "clear-strokes"; pageId: string }
  | { type: "paper"; pageId: string; paper: Page["paper"] }
  | {
      type: "annotate";
      pageId: string;
      revision: number;
      annotation: Annotation;
      observation?: Observation;
    }
  | { type: "edit-observation"; id: string; summary: string }
  | { type: "clear-observations" }
  | { type: "toggle-hint-group"; pageId: string; groupId: string }
  | { type: "remove-annotation"; pageId: string; id: string };
export function editorReducer(
  state: EditorState,
  action: EditorAction,
): EditorState {
  if (action.type === "replace")
    return { notebook: action.notebook, history: {} };
  if (action.type === "clear-observations")
    return { ...state, notebook: { ...state.notebook, observations: [] } };
  if (action.type === "edit-observation") {
    const summary = action.summary.trim().slice(0, 300);
    if (!summary) return state;
    return {
      ...state,
      notebook: {
        ...state.notebook,
        observations: state.notebook.observations?.map((o) =>
          o.id === action.id ? { ...o, summary } : o,
        ),
      },
    };
  }
  if (action.type === "title")
    return { ...state, notebook: { ...state.notebook, title: action.title } };
  if (action.type === "activate")
    return {
      ...state,
      notebook: { ...state.notebook, activePageId: action.id },
    };
  if (action.type === "add-pages")
    return {
      ...state,
      notebook: {
        ...state.notebook,
        pages: [...state.notebook.pages, ...action.pages],
        activePageId: action.pages[0]?.id ?? state.notebook.activePageId,
      },
    };
  const page = state.notebook.pages.find((p) => p.id === action.pageId);
  if (!page) return state;
  let next = page;
  let history = state.history;
  const h = history[page.id] ?? { past: [], future: [] };
  if (action.type === "stroke") {
    next = {
      ...page,
      strokes: [...page.strokes, action.stroke],
      revision: page.revision + 1,
    };
    history = {
      ...history,
      [page.id]: { past: [...h.past.slice(-49), page.strokes], future: [] },
    };
  } else if (action.type === "clear-strokes" && page.strokes.length) {
    next = { ...page, strokes: [], revision: page.revision + 1 };
    history = {
      ...history,
      [page.id]: { past: [...h.past.slice(-49), page.strokes], future: [] },
    };
  } else if (action.type === "undo" && h.past.length) {
    next = { ...page, strokes: h.past.at(-1)!, revision: page.revision + 1 };
    history = {
      ...history,
      [page.id]: {
        past: h.past.slice(0, -1),
        future: [page.strokes, ...h.future],
      },
    };
  } else if (action.type === "redo" && h.future.length) {
    next = { ...page, strokes: h.future[0], revision: page.revision + 1 };
    history = {
      ...history,
      [page.id]: { past: [...h.past, page.strokes], future: h.future.slice(1) },
    };
  } else if (action.type === "annotate" && action.revision === page.revision) {
    next = {
      ...page,
      annotations: [...page.annotations, action.annotation],
      ...(page.background && action.annotation.visual && !page.backgroundHeight ? { backgroundHeight: page.height } : {}),
      height: Math.max(page.height, action.annotation.visual ? action.annotation.visual.frame.y + action.annotation.visual.frame.height + 280 : 0),
      hiddenHintGroups: page.hiddenHintGroups?.filter((id) => id !== annotationGroupId(action.annotation)),
    };
  } else if (action.type === "toggle-hint-group") {
    const hidden = new Set(page.hiddenHintGroups ?? []);
    if (hidden.has(action.groupId)) hidden.delete(action.groupId);
    else hidden.add(action.groupId);
    next = { ...page, hiddenHintGroups: [...hidden] };
  } else if (action.type === "remove-annotation")
    next = {
      ...page,
      annotations: page.annotations.filter((a) => a.id !== action.id),
    };
  else if (action.type === "paper") next = { ...page, paper: action.paper };
  if (next === page) return state;
  const observations =
    action.type === "annotate" &&
    action.observation &&
    action.observation.pageId === page.id &&
    action.observation.revision === page.revision
      ? [...(state.notebook.observations ?? []).slice(-99), action.observation]
      : state.notebook.observations;
  return {
    history,
    notebook: {
      ...state.notebook,
      ...(observations ? { observations } : {}),
      pages: state.notebook.pages.map((p) => (p.id === page.id ? next : p)),
    },
  };
}
