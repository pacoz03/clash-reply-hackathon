import { z } from "zod";
import {
  editorReducer,
  initialNotebook,
  newPage,
  notebookSchema,
  uid,
  type EditorAction,
  type History,
  type Notebook,
} from "./model";

const subjectSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(80),
});
const entrySchema = z.object({
  id: z.string(),
  subjectId: z.string(),
  updatedAt: z.number(),
  notebook: notebookSchema,
  materialIds: z.array(z.string()).optional(),
});
const materialSchema = z.object({
  id: z.string(),
  subjectId: z.string(),
  name: z.string(),
  size: z.number(),
  type: z.string(),
  addedAt: z.number(),
  textPages: z.array(z.string().max(30000)).max(100).optional(),
});
export const librarySchema = z.object({
  schemaVersion: z.literal(1),
  subjects: z.array(subjectSchema).min(1),
  notebooks: z.array(entrySchema),
  materials: z.array(materialSchema),
});
export type Library = z.infer<typeof librarySchema>;
export type NotebookEntry = Library["notebooks"][number];
export type Material = Library["materials"][number];
export function createLibrary(legacy?: Notebook | null): Library {
  const subjectId = uid();
  return {
    schemaVersion: 1,
    subjects: [{ id: subjectId, name: "My studies" }],
    notebooks: [
      {
        id: uid(),
        subjectId,
        updatedAt: Date.now(),
        notebook: legacy ?? initialNotebook(),
      },
    ],
    materials: [],
  };
}
export type LibraryState = {
  library: Library;
  history: Record<string, History>;
};
export type LibraryAction =
  | { type: "load"; library: Library }
  | { type: "subject"; id: string; name: string }
  | { type: "create-notebook"; id: string; subjectId: string; title: string }
  | { type: "delete-notebook"; id: string }
  | { type: "add-material"; material: Material }
  | { type: "remove-material"; id: string }
  | { type: "material-text"; id: string; pages: string[] }
  | {
      type: "attach-material";
      notebookId: string;
      materialId: string;
      attached: boolean;
    }
  | { type: "edit"; notebookId: string; action: EditorAction };
export function libraryReducer(
  state: LibraryState,
  action: LibraryAction,
): LibraryState {
  const { library } = state;
  if (action.type === "load") return { library: action.library, history: {} };
  if (action.type === "subject")
    return {
      ...state,
      library: {
        ...library,
        subjects: [...library.subjects, { id: action.id, name: action.name }],
      },
    };
  if (action.type === "create-notebook") {
    if (!library.subjects.some((s) => s.id === action.subjectId)) return state;
    const page = newPage(1);
    const entry: NotebookEntry = {
      id: action.id,
      subjectId: action.subjectId,
      updatedAt: Date.now(),
      notebook: {
        schemaVersion: 1,
        title: action.title,
        activePageId: page.id,
        pages: [page],
      },
    };
    return {
      ...state,
      library: { ...library, notebooks: [...library.notebooks, entry] },
    };
  }
  if (action.type === "delete-notebook") {
    const pages = new Set(
      library.notebooks
        .find((n) => n.id === action.id)
        ?.notebook.pages.map((p) => p.id),
    );
    return {
      library: {
        ...library,
        notebooks: library.notebooks.filter((n) => n.id !== action.id),
      },
      history: Object.fromEntries(
        Object.entries(state.history).filter(([id]) => !pages.has(id)),
      ),
    };
  }
  if (action.type === "add-material")
    return {
      ...state,
      library: {
        ...library,
        materials: [...library.materials, action.material],
      },
    };
  if (action.type === "remove-material")
    return {
      ...state,
      library: {
        ...library,
        materials: library.materials.filter((m) => m.id !== action.id),
        notebooks: library.notebooks.map((n) => ({
          ...n,
          materialIds: n.materialIds?.filter((id) => id !== action.id),
        })),
      },
    };
  if (action.type === "material-text")
    return {
      ...state,
      library: {
        ...library,
        materials: library.materials.map((m) =>
          m.id === action.id ? { ...m, textPages: action.pages } : m,
        ),
      },
    };
  if (action.type === "attach-material") {
    const material = library.materials.find((m) => m.id === action.materialId);
    return {
      ...state,
      library: {
        ...library,
        notebooks: library.notebooks.map((n) => {
          if (n.id !== action.notebookId || material?.subjectId !== n.subjectId)
            return n;
          const ids = new Set(n.materialIds ?? []);
          if (action.attached) ids.add(action.materialId);
          else ids.delete(action.materialId);
          return { ...n, materialIds: [...ids] };
        }),
      },
    };
  }
  const entry = library.notebooks.find((n) => n.id === action.notebookId);
  if (!entry) return state;
  const edited = editorReducer(
    { notebook: entry.notebook, history: state.history },
    action.action,
  );
  if (edited.notebook === entry.notebook && edited.history === state.history)
    return state;
  return {
    history: edited.history,
    library: {
      ...library,
      notebooks: library.notebooks.map((n) =>
        n.id === entry.id
          ? {
              ...n,
              notebook: edited.notebook,
              updatedAt:
                action.action.type === "activate" ? n.updatedAt : Date.now(),
            }
          : n,
      ),
    },
  };
}
