import { describe, expect, it } from "vitest";
import {
  createLibrary,
  libraryReducer,
  librarySchema,
  type LibraryState,
} from "./library";
import { initialNotebook, type Stroke } from "./model";
const stroke: Stroke = {
  id: "s",
  tool: "pen",
  color: "#273c46",
  width: 2,
  points: [1, 2, 3, 4],
};
function setup(): LibraryState {
  return { library: createLibrary(), history: {} };
}
describe("biblioteca e compatibilità", () => {
  it("incapsula il quaderno precedente senza perdere pagine, tratti o annotazioni", () => {
    const old = initialNotebook();
    old.pages[0].strokes.push(stroke);
    const library = createLibrary(old);
    expect(library.notebooks[0].notebook).toEqual(old);
    expect(librarySchema.parse(library)).toEqual(library);
  });
  it("crea quaderni vuoti nella materia scelta e isola scrittura e cronologia", () => {
    let state = setup();
    const first = state.library.notebooks[0];
    state = libraryReducer(state, {
      type: "subject",
      id: "physics",
      name: "Fisica",
    });
    state = libraryReducer(state, {
      type: "create-notebook",
      id: "second",
      subjectId: "physics",
      title: "Meccanica",
    });
    const second = state.library.notebooks[1];
    expect(second.subjectId).toBe("physics");
    expect(second.notebook.pages[0].template).toBeUndefined();
    state = libraryReducer(state, {
      type: "edit",
      notebookId: first.id,
      action: { type: "stroke", pageId: first.notebook.activePageId, stroke },
    });
    state = libraryReducer(state, {
      type: "edit",
      notebookId: "second",
      action: { type: "undo", pageId: second.notebook.activePageId },
    });
    expect(state.library.notebooks[0].notebook.pages[0].strokes).toEqual([
      stroke,
    ]);
    expect(state.library.notebooks[1].notebook.pages[0].strokes).toEqual([]);
  });
  it("rifiuta risposte obsolete anche dopo il cambio di quaderno", () => {
    let state = setup();
    const first = state.library.notebooks[0];
    const pageId = first.notebook.activePageId;
    state = libraryReducer(state, {
      type: "edit",
      notebookId: first.id,
      action: { type: "stroke", pageId, stroke },
    });
    const same = libraryReducer(state, {
      type: "edit",
      notebookId: first.id,
      action: {
        type: "annotate",
        pageId,
        revision: 0,
        annotation: {
          id: "a",
          kind: "hint",
          anchor: { x: 1, y: 1, width: 20, height: 20 },
          text: "Un indizio",
        },
      },
    });
    expect(same).toBe(state);
  });
  it("elimina solo il quaderno scelto e ignora aggiornamenti tardivi", () => {
    let state = setup();
    const first = state.library.notebooks[0];
    state = libraryReducer(state, {
      type: "create-notebook",
      id: "second",
      subjectId: first.subjectId,
      title: "Altro",
    });
    state = libraryReducer(state, {
      type: "edit",
      notebookId: first.id,
      action: { type: "stroke", pageId: first.notebook.activePageId, stroke },
    });
    state = libraryReducer(state, { type: "delete-notebook", id: first.id });
    expect(state.library.notebooks.map((n) => n.id)).toEqual(["second"]);
    expect(state.history[first.notebook.activePageId]).toBeUndefined();
    expect(
      libraryReducer(state, {
        type: "edit",
        notebookId: first.id,
        action: { type: "title", title: "Tardivo" },
      }),
    ).toBe(state);
  });
});
