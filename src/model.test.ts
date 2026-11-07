import { describe, expect, it } from 'vitest';
import { editorReducer, initialNotebook, newPage, selectionFromPoints, type Annotation, type EditorState, type Stroke } from './model';

const stroke: Stroke = { id: 'stroke', tool: 'pen', color: '#273c46', width: 2, points: [10, 10, 40, 40] };
function setup(): EditorState { return { notebook: initialNotebook(), history: {} }; }
describe('notebook history and asynchronous annotations', () => {
  it('undoes and redoes strokes on their own page, keeping page backgrounds intact', () => {
    let state = setup();
    const id = state.notebook.activePageId;
    state = editorReducer(state, { type: 'stroke', pageId: id, stroke });
    state = editorReducer(state, { type: 'add-pages', pages: [newPage(2)] });
    state = editorReducer(state, { type: 'undo', pageId: id });
    expect(state.notebook.pages[0].strokes).toHaveLength(0);
    expect(state.notebook.pages[0].template).toBe('chain-rule');
    expect(state.notebook.pages[1].strokes).toHaveLength(0);
    state = editorReducer(state, { type: 'redo', pageId: id });
    expect(state.notebook.pages[0].strokes).toEqual([stroke]);
    expect(state.notebook.pages[0].revision).toBe(3);
  });
  it('invalidates redo after a new stroke', () => {
    let state = setup(); const pageId = state.notebook.activePageId;
    state = editorReducer(state, { type: 'stroke', pageId, stroke });
    state = editorReducer(state, { type: 'undo', pageId });
    state = editorReducer(state, { type: 'stroke', pageId, stroke: { ...stroke, id: 'new' } });
    const same = editorReducer(state, { type: 'redo', pageId });
    expect(same).toBe(state);
    expect(state.notebook.pages[0].strokes[0].id).toBe('new');
  });
  it('can undo clearing handwriting without removing the exercise', () => {
    let state = setup(); const pageId = state.notebook.activePageId;
    state = editorReducer(state, { type: 'stroke', pageId, stroke });
    state = editorReducer(state, { type: 'clear-strokes', pageId });
    expect(state.notebook.pages[0].strokes).toHaveLength(0);
    expect(state.notebook.pages[0].template).toBe('chain-rule');
    state = editorReducer(state, { type: 'undo', pageId });
    expect(state.notebook.pages[0].strokes).toEqual([stroke]);
  });
  it('rejects tutor responses for old page revisions', () => {
    let state = setup(); const pageId = state.notebook.activePageId;
    state = editorReducer(state, { type: 'stroke', pageId, stroke });
    const annotation: Annotation = { id: 'hint', kind: 'question', text: 'Quale regola hai usato?', anchor: { x: 10, y: 10, width: 50, height: 50 } };
    expect(editorReducer(state, { type: 'annotate', pageId, revision: 0, annotation })).toBe(state);
    const updated = editorReducer(state, { type: 'annotate', pageId, revision: 1, annotation });
    expect(updated.notebook.pages[0].annotations).toHaveLength(1);
    expect(updated.notebook.pages[0].strokes).toEqual([stroke]);
  });
  it('does not erase handwriting when removing an annotation', () => {
    let state = setup(); const pageId = state.notebook.activePageId;
    state = editorReducer(state, { type: 'stroke', pageId, stroke });
    state = editorReducer(state, { type: 'annotate', pageId, revision: 1, annotation: { id: 'hint', kind: 'hint', text: 'Indizio', anchor: { x: 0, y: 0, width: 20, height: 20 } } });
    state = editorReducer(state, { type: 'remove-annotation', pageId, id: 'hint' });
    expect(state.notebook.pages[0].strokes).toEqual([stroke]);
    expect(state.notebook.pages[0].annotations).toHaveLength(0);
  });
});
describe('selection in page coordinates', () => {
  it('normalizes reverse drags and clamps to page bounds', () => {
    expect(selectionFromPoints({ x: 900, y: 1200 }, { x: -10, y: 20 }, 1123)).toEqual({ x: 0, y: 20, width: 794, height: 1103 });
  });
  it('ignores accidental taps', () => {
    expect(selectionFromPoints({ x: 10, y: 10 }, { x: 12, y: 14 }, 1123)).toBeNull();
  });
});
