import { expect, it } from "vitest";
import { annotationGroupId, findAnnotationGroup, groupAnnotations } from "./annotation-groups";
import { editorReducer, initialNotebook, notebookSchema, type Annotation } from "./model";

const note = (id: string, y = 100, groupId?: string): Annotation => ({
  id, groupId, kind: "hint", text: "Check this step.",
  anchor: { x: 40, y, width: 200, height: 60 },
});

it("keeps follow-ups together and separate request locations independent, including legacy notes", () => {
  const groups = groupAnnotations([note("a"), note("b"), note("c", 300), note("d", 400, "follow-up"), note("e", 420, "follow-up")]);
  expect(groups.map((g) => g.annotations.map((a) => a.id))).toEqual([["a", "b"], ["c"], ["d", "e"]]);
});

it("recognizes a slightly redrawn selection without merging adjacent steps", () => {
  const a = note("a", 100, "step-a");
  expect(findAnnotationGroup([a], { ...a.anchor, x: 43, y: 103 })).toBe("step-a");
  expect(findAnnotationGroup([a], { ...a.anchor, y: 160 })).toBeUndefined();
});

it("persists independent group visibility without changing writing revision or history, and reopens only the group receiving a current reply", () => {
  const notebook = initialNotebook(), pageId = notebook.activePageId;
  notebook.pages[0].annotations = [note("a", 100, "first"), note("b", 300, "second")];
  let state = { notebook, history: {} };
  for (const groupId of ["first", "second"]) {
    state = editorReducer(state, { type: "toggle-hint-group", pageId, groupId });
  }
  const restored = notebookSchema.parse(JSON.parse(JSON.stringify(state.notebook)));
  expect(restored.pages[0].hiddenHintGroups).toEqual(["first", "second"]);
  expect(restored.pages[0].revision).toBe(0);
  expect(state.history).toEqual({});
  const stale = editorReducer(state, { type: "annotate", pageId, revision: 1, annotation: note("c", 100, "first") });
  expect(stale).toBe(state);
  state = editorReducer(state, { type: "annotate", pageId, revision: 0, annotation: note("c", 100, "first") });
  expect(state.notebook.pages[0].hiddenHintGroups).toEqual(["second"]);
  expect(state.notebook.pages[0].annotations).toHaveLength(3);
  state = editorReducer(state, { type: "toggle-hint-group", pageId, groupId: "second" });
  expect(state.notebook.pages[0].hiddenHintGroups).toEqual([]);
  expect(annotationGroupId(note("legacy"))).toBe(annotationGroupId(note("legacy-2")));
});
