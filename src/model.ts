import { z } from 'zod';

export const PAGE_WIDTH = 794;
export const PAGE_HEIGHT = 1123;
export const pointSchema = z.object({ x: z.number().finite(), y: z.number().finite() });
export const selectionSchema = pointSchema.extend({ width: z.number().positive(), height: z.number().positive() });
export type Selection = z.infer<typeof selectionSchema>;
export type Tool = 'pen' | 'eraser' | 'select' | 'hand';
const strokeSchema = z.object({ id: z.string(), points: z.array(z.number().finite()), color: z.string(), width: z.number().positive(), tool: z.enum(['pen', 'eraser']) });
export type Stroke = z.infer<typeof strokeSchema>;
export const annotationSchema = z.object({ id: z.string(), anchor: selectionSchema, text: z.string().min(1).max(600), kind: z.enum(['hint', 'question']), source: z.string().optional() });
export type Annotation = z.infer<typeof annotationSchema>;
export const pageSchema = z.object({
  id: z.string(), title: z.string(), revision: z.number().int().nonnegative(),
  height: z.number().positive().max(6000), paper: z.enum(['dots', 'lines', 'plain']),
  strokes: z.array(strokeSchema), annotations: z.array(annotationSchema),
  background: z.string().optional(), template: z.literal('chain-rule').optional(),
});
export type Page = z.infer<typeof pageSchema>;
export const notebookSchema = z.object({ schemaVersion: z.literal(1), title: z.string(), activePageId: z.string(), pages: z.array(pageSchema).min(1) });
export type Notebook = z.infer<typeof notebookSchema>;
export function uid() { return globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
export function newPage(index: number): Page {
  return { id: uid(), title: `Esercizio ${String(index).padStart(2, '0')}`, revision: 0, height: PAGE_HEIGHT, paper: 'dots', strokes: [], annotations: [] };
}
export function initialNotebook(): Notebook {
  const page = { ...newPage(1), title: 'La regola della catena', template: 'chain-rule' as const };
  return { schemaVersion: 1, title: 'Il mio quaderno', activePageId: page.id, pages: [page] };
}
export function selectionFromPoints(a: {x: number; y: number}, b: {x: number; y: number}, height: number): Selection | null {
  const x = Math.max(0, Math.min(PAGE_WIDTH, Math.min(a.x, b.x)));
  const y = Math.max(0, Math.min(height, Math.min(a.y, b.y)));
  const width = Math.min(PAGE_WIDTH, Math.max(a.x, b.x)) - x;
  const h = Math.min(height, Math.max(a.y, b.y)) - y;
  return width >= 8 && h >= 8 ? { x, y, width, height: h } : null;
}
export type History = { past: Stroke[][]; future: Stroke[][] };
export type EditorState = { notebook: Notebook; history: Record<string, History> };
export type EditorAction =
  | { type: 'replace'; notebook: Notebook }
  | { type: 'title'; title: string }
  | { type: 'activate'; id: string }
  | { type: 'add-pages'; pages: Page[] }
  | { type: 'stroke'; pageId: string; stroke: Stroke }
  | { type: 'undo' | 'redo' | 'clear-strokes'; pageId: string }
  | { type: 'paper'; pageId: string; paper: Page['paper'] }
  | { type: 'annotate'; pageId: string; revision: number; annotation: Annotation }
  | { type: 'remove-annotation'; pageId: string; id: string };
export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  if (action.type === 'replace') return { notebook: action.notebook, history: {} };
  if (action.type === 'title') return { ...state, notebook: { ...state.notebook, title: action.title } };
  if (action.type === 'activate') return { ...state, notebook: { ...state.notebook, activePageId: action.id } };
  if (action.type === 'add-pages') return { ...state, notebook: { ...state.notebook, pages: [...state.notebook.pages, ...action.pages], activePageId: action.pages[0]?.id ?? state.notebook.activePageId } };
  const page = state.notebook.pages.find(p => p.id === action.pageId);
  if (!page) return state;
  let next = page;
  let history = state.history;
  const h = history[page.id] ?? { past: [], future: [] };
  if (action.type === 'stroke') {
    next = { ...page, strokes: [...page.strokes, action.stroke], revision: page.revision + 1 };
    history = { ...history, [page.id]: { past: [...h.past.slice(-49), page.strokes], future: [] } };
  } else if (action.type === 'clear-strokes' && page.strokes.length) {
    next = { ...page, strokes: [], revision: page.revision + 1 };
    history = { ...history, [page.id]: { past: [...h.past.slice(-49), page.strokes], future: [] } };
  } else if (action.type === 'undo' && h.past.length) {
    next = { ...page, strokes: h.past.at(-1)!, revision: page.revision + 1 };
    history = { ...history, [page.id]: { past: h.past.slice(0, -1), future: [page.strokes, ...h.future] } };
  } else if (action.type === 'redo' && h.future.length) {
    next = { ...page, strokes: h.future[0], revision: page.revision + 1 };
    history = { ...history, [page.id]: { past: [...h.past, page.strokes], future: h.future.slice(1) } };
  } else if (action.type === 'annotate' && action.revision === page.revision) {
    next = { ...page, annotations: [...page.annotations, action.annotation] };
  } else if (action.type === 'remove-annotation') next = { ...page, annotations: page.annotations.filter(a => a.id !== action.id) };
  else if (action.type === 'paper') next = { ...page, paper: action.paper };
  if (next === page) return state;
  return { history, notebook: { ...state.notebook, pages: state.notebook.pages.map(p => p.id === page.id ? next : p) } };
}
