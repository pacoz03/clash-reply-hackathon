import {
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  Eraser,
  Eye,
  EyeOff,
  FileUp,
  Hand,
  History,
  LoaderCircle,
  Minus,
  PenLine,
  Plus,
  Redo2,
  RotateCcw,
  Scan,
  Settings2,
  Sparkles,
  Undo2,
  X,
} from "lucide-react";
import { PageSurface } from "./components/PageSurface";
import { LibraryHome } from "./components/LibraryHome";
import {
  CourseMaterialPanel,
  type SourceView,
} from "./components/CourseMaterialPanel";
import { SessionPanel } from "./components/SessionPanel";
import {
  extractMaterialText,
  selectSourceExcerpts,
} from "./services/materials";
import type { CanvasHandle } from "./components/NotebookCanvas";
import {
  newPage,
  PAGE_WIDTH,
  uid,
  type EditorAction,
  type Selection,
  type Tool,
} from "./model";
import {
  createLibrary,
  libraryReducer,
  type LibraryState,
  type Material,
} from "./library";
import {
  deleteMaterial,
  loadLibrary,
  loadMaterial,
  saveLibrary,
  saveMaterial,
} from "./services/storage";
import { requestTutor, tutorMode } from "./services/tutor";
import { importDocument } from "./services/import";
import { downloadBlob, downloadPng } from "./services/download";

const tools = [
  { id: "pen", label: "Pen", key: "P", icon: PenLine },
  { id: "eraser", label: "Eraser", key: "E", icon: Eraser },
  { id: "select", label: "Select", key: "S", icon: Scan },
  { id: "hand", label: "Pan", key: "H", icon: Hand },
] as const;
const colors = ["#20382f", "#4c7052", "#b76e51"];
export default function App() {
  const [state, dispatch] = useReducer(
    libraryReducer,
    undefined,
    (): LibraryState => ({ library: createLibrary(), history: {} }),
  );
  const { library } = state;
  const stateRef = useRef(state);
  stateRef.current = state;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState("");
  const [ready, setReady] = useState(false);
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Loading…");
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(colors[0]);
  const [penWidth, setPenWidth] = useState(2.5);
  const [penOnly, setPenOnly] = useState(true);
  const [selection, setSelection] = useState<{
    pageId: string;
    region: Selection;
  } | null>(null);
  const [annotationsVisible, setAnnotationsVisible] = useState(true);
  const [composerPage, setComposerPage] = useState<string | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [intent, setIntent] = useState<"hint" | "explain" | "check">("hint");
  const [panel, setPanel] = useState<"materials" | "session" | null>(null);
  const [sourceView, setSourceView] = useState<SourceView | null>(null);
  const [indexing, setIndexing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState("");
  const [zoom, setZoom] = useState(1);
  const [fitScale, setFitScale] = useState(0.9);
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef(new Map<string, CanvasHandle>());
  const importRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const pendingScroll = useRef<string | null>(null);
  const entry = library.notebooks.find((n) => n.id === activeId);
  const notebook = entry?.notebook;
  const page =
    notebook?.pages.find((p) => p.id === notebook.activePageId) ??
    notebook?.pages[0];
  const history = page ? state.history[page.id] : undefined;
  const scale = Math.min(2.4, Math.max(0.25, fitScale * zoom));
  const edit = (action: EditorAction, notebookId = activeId) => {
    if (notebookId) dispatch({ type: "edit", notebookId, action });
  };

  useEffect(() => {
    let alive = true;
    loadLibrary()
      .then((saved) => {
        if (alive) {
          dispatch({ type: "load", library: saved });
          setSubjectId(saved.subjects[0].id);
        }
      })
      .catch((error) => {
        if (alive) {
          setStorageBlocked(true);
          setNotice(
            error instanceof Error
              ? error.message
              : "Local storage is unavailable.",
          );
        }
      })
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (!ready || storageBlocked) return;
    let current = true;
    setSaveStatus("Saving…");
    saveLibrary(library)
      .then(() => {
        if (current) setSaveStatus("Saved on this device");
      })
      .catch(() => {
        if (current) {
          setSaveStatus("Could not save");
          setNotice(
            "Could not save on this device. Export your pages before closing.",
          );
        }
      });
    return () => {
      current = false;
    };
  }, [library, ready, storageBlocked]);
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    let frame = 0;
    const followScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (pendingScroll.current) return;
        const line =
          viewport.getBoundingClientRect().top +
          Math.min(180, viewport.clientHeight / 3);
        const sections = Array.from(
          viewport.querySelectorAll<HTMLElement>("[data-page-id]"),
        );
        const visible =
          sections.find((el) => {
            const rect = el.getBoundingClientRect();
            return rect.top <= line && rect.bottom > line;
          }) ?? sections.find((el) => el.getBoundingClientRect().top > line);
        const id = visible?.dataset.pageId;
        const current = stateRef.current.library.notebooks.find(
          (n) => n.id === activeId,
        );
        if (id && activeId && current?.notebook.activePageId !== id)
          dispatch({
            type: "edit",
            notebookId: activeId,
            action: { type: "activate", id },
          });
      });
    };
    const resize = new ResizeObserver(([e]) => {
      const width = e.contentRect.width;
      setFitScale(
        Math.min(
          1,
          (width - (width >= 1180 ? 520 : width >= 900 ? 300 : 32)) /
            PAGE_WIDTH,
        ),
      );
      followScroll();
    });
    resize.observe(viewport);
    viewport.addEventListener("scroll", followScroll, { passive: true });
    return () => {
      resize.disconnect();
      viewport.removeEventListener("scroll", followScroll);
      cancelAnimationFrame(frame);
    };
  }, [activeId, notebook?.pages.length, ready]);
  useLayoutEffect(() => {
    if (!pendingScroll.current) return;
    const frame = requestAnimationFrame(() => {
      const viewport = viewportRef.current;
      const target = Array.from(
        viewport?.querySelectorAll<HTMLElement>("[data-page-id]") ?? [],
      ).find((el) => el.dataset.pageId === pendingScroll.current);
      if (target && viewport) {
        viewport.scrollTo({
          top:
            viewport.scrollTop +
            target.getBoundingClientRect().top -
            viewport.getBoundingClientRect().top -
            120,
        });
        pendingScroll.current = null;
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [notebook?.pages.length, activeId, scale]);
  useEffect(() => {
    setSelection(null);
    setQuestion("");
    setComposerPage((current) => (current === page?.id ? current : null));
  }, [page?.id]);
  useEffect(() => () => requestRef.current?.abort(), []);
  useEffect(() => {
    if (!page) return;
    const handler = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLElement &&
        (event.target.matches("input, textarea, select") ||
          event.target.isContentEditable)
      )
        return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        edit({ type: event.shiftKey ? "redo" : "undo", pageId: page.id });
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const found = tools.find(
        (t) => t.key.toLowerCase() === event.key.toLowerCase(),
      );
      if (found) setTool(found.id);
      if (event.key === "Escape") {
        setSelection(null);
        setComposerPage(null);
        setOptionsOpen(false);
        setPanel(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [page?.id, activeId]);

  const openNotebook = (id: string) => {
    if (!pendingScroll.current)
      pendingScroll.current =
        stateRef.current.library.notebooks.find((n) => n.id === id)?.notebook
          .activePageId ?? null;
    requestRef.current?.abort();
    setActiveId(id);
    setSelection(null);
    setComposerPage(null);
    setPanel(null);
    setQuestion("");
    setIntent("hint");
    setZoom(1);
  };
  const goHome = () => {
    requestRef.current?.abort();
    if (entry) setSubjectId(entry.subjectId);
    setActiveId(null);
    setSelection(null);
    setComposerPage(null);
    setPanel(null);
    setQuestion("");
    setIntent("hint");
  };
  const addPage = () => {
    if (!notebook) return;
    const next = newPage(notebook.pages.length + 1);
    pendingScroll.current = next.id;
    edit({ type: "add-pages", pages: [next] });
    setTool("pen");
  };
  const help = async (
    pageId: string,
    region?: Selection | null,
    requestedIntent: "hint" | "explain" | "check" = "hint",
  ) => {
    if (!activeId || busy || requestRef.current) return;
    const targetNotebookId = activeId;
    const targetEntry = stateRef.current.library.notebooks.find(
      (n) => n.id === targetNotebookId,
    );
    const target = targetEntry?.notebook.pages.find((p) => p.id === pageId);
    const canvas = canvasRefs.current.get(pageId);
    if (!target || !canvas) return;
    const prompt = composerPage === pageId ? question.trim() : "";
    setBusy(true);
    setNotice("");
    const controller = new AbortController();
    requestRef.current = controller;
    const timeout = setTimeout(() => controller.abort("timeout"), 45_000);
    try {
      const response = await requestTutor(
        {
          notebookId: targetNotebookId,
          pageId,
          revision: target.revision,
          image: canvas.snapshot(),
          selection:
            region === undefined
              ? selection?.pageId === pageId
                ? selection.region
                : null
              : region,
          question: prompt,
          intent: requestedIntent,
          previousHints: target.annotations.slice(-10).map((a) => a.text),
          observations: targetEntry?.notebook.observations
            ?.filter((o) => o.pageId === pageId && o.mode === tutorMode)
            .slice(-12)
            .map(({ summary, outcome, revision }) => ({
              summary,
              outcome,
              revision,
            })),
          sources: selectSourceExcerpts(
            stateRef.current.library.materials.filter(
              (m) =>
                targetEntry?.materialIds?.includes(m.id) &&
                m.subjectId === targetEntry.subjectId,
            ),
            [
              target.title,
              targetEntry?.notebook.title,
              prompt,
              ...target.annotations.slice(-2).map((a) => a.text),
            ].join(" "),
          ),
        },
        target,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      const latest = stateRef.current.library.notebooks
        .find((n) => n.id === targetNotebookId)
        ?.notebook.pages.find((p) => p.id === pageId);
      if (latest?.revision !== response.revision) {
        setNotice(
          "Your writing changed during the request. Ask for a new review of the updated steps.",
        );
        return;
      }
      edit(
        {
          type: "annotate",
          pageId,
          revision: response.revision,
          annotation: response.annotation,
          observation: response.observation
            ? {
                id: uid(),
                pageId,
                revision: response.revision,
                intent: requestedIntent,
                hint: response.annotation.text,
                summary: response.observation.summary,
                outcome: response.observation.outcome,
                createdAt: Date.now(),
                mode: tutorMode,
              }
            : undefined,
        },
        targetNotebookId,
      );
      setAnnotationsVisible(true);
      setQuestion("");
      setComposerPage(null);
      setSelection(null);
    } catch (error) {
      if (controller.signal.aborted) {
        if (controller.signal.reason === "timeout")
          setNotice("The tutor is taking too long. You can try again.");
      } else
        setNotice(
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
        );
    } finally {
      clearTimeout(timeout);
      setBusy(false);
      requestRef.current = null;
    }
  };
  const attachMaterial = async (material: Material, attached: boolean) => {
    if (!entry || indexing) return;
    const notebookId = entry.id;
    if (attached && (entry.materialIds?.length ?? 0) >= 6) {
      setNotice("Choose up to six documents per notebook.");
      return;
    }
    if (attached && material.textPages === undefined) {
      setIndexing(material.id);
      try {
        const pages = await extractMaterialText(material);
        dispatch({ type: "material-text", id: material.id, pages });
        if (!pages.some((text) => text.trim())) {
          setNotice(
            "No searchable text found. You can still view this file or import it as an exercise.",
          );
          return;
        }
      } catch (error) {
        setNotice(
          error instanceof Error
            ? error.message
            : "Couldn't read this document. Try again.",
        );
        return;
      } finally {
        setIndexing(null);
      }
    }
    if (attached && material.textPages?.every((text) => !text.trim())) return;
    dispatch({
      type: "attach-material",
      notebookId,
      materialId: material.id,
      attached,
    });
  };
  const importFile = async (file: File | undefined, targetId = activeId) => {
    if (!file || !targetId || importing) return;
    const target = stateRef.current.library.notebooks.find(
      (n) => n.id === targetId,
    );
    if (!target) return;
    setImporting(true);
    setNotice("");
    try {
      const pages = await importDocument(file, target.notebook.pages.length);
      pendingScroll.current = pages[0]?.id ?? null;
      edit({ type: "add-pages", pages }, targetId);
      openNotebook(targetId);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Could not open this document.",
      );
    } finally {
      setImporting(false);
      if (importRef.current) importRef.current.value = "";
    }
  };
  const upload = async (file: File, subject: string) => {
    if (storageBlocked || importing) {
      setNotice("Storage is unavailable. Reload before adding material.");
      return;
    }
    if (
      file.size > 20 * 1024 * 1024 ||
      !["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(
        file.type,
      )
    ) {
      setNotice("Choose a PDF, PNG, JPG or WebP up to 20 MB.");
      return;
    }
    setImporting(true);
    try {
      const id = uid();
      await saveMaterial(id, file);
      dispatch({
        type: "add-material",
        material: {
          id,
          subjectId: subject,
          name: file.name,
          type: file.type,
          size: file.size,
          addedAt: Date.now(),
        },
      });
    } catch {
      setNotice(
        "Could not store this material. Check the available space and try again.",
      );
    } finally {
      setImporting(false);
    }
  };
  const download = async (m: Material) => {
    try {
      const blob = await loadMaterial(m.id);
      downloadBlob(blob, m.name);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "File unavailable.");
    }
  };
  const useMaterial = async (m: Material, id: string) => {
    try {
      const blob = await loadMaterial(m.id);
      await importFile(new File([blob], m.name, { type: m.type }), id);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "File unavailable.");
    }
  };
  const removeMaterial = async (m: Material) => {
    // Persist metadata first: a failed write must not leave a listed file missing.
    const next = {
      ...stateRef.current.library,
      materials: stateRef.current.library.materials.filter(
        (item) => item.id !== m.id,
      ),
    };
    try {
      await saveLibrary(next);
      dispatch({ type: "remove-material", id: m.id });
      await deleteMaterial(m.id);
    } catch {
      setNotice("Could not delete this material. Please try again.");
    }
  };
  const exportPage = () => {
    try {
      const image = page && canvasRefs.current.get(page.id)?.snapshot();
      if (!image) return;
      downloadPng(image, `${page?.title || "exercise"}.png`);
    } catch {
      setNotice("Could not export this page. Please try again.");
    }
  };

  if (!ready)
    return (
      <div className="loading-screen">
        <span className="wordmark">margin</span>
        <LoaderCircle className="spin" size={20} />
        <p>Opening your study space…</p>
      </div>
    );
  return (
    <div className={`app-shell ${entry ? "editor-shell" : "home-shell"}`}>
      <header className="app-header">
        <div className="brand-area">
          {entry ? (
            <button
              className="icon-button back-home"
              aria-label="Back to library"
              onClick={goHome}
            >
              <ArrowLeft size={20} />
            </button>
          ) : null}
          <button
            className="wordmark"
            aria-label="margin, library"
            onClick={goHome}
          >
            margin
          </button>
          {!entry ? (
            <span className="edition">WRITE. THINK. UNDERSTAND.</span>
          ) : null}
        </div>
        {notebook && entry ? (
          <div className="notebook-name">
            <span>
              {library.subjects.find((s) => s.id === entry.subjectId)?.name}
              <span>/</span>
            </span>
            <input
              aria-label="Notebook name"
              value={notebook.title}
              maxLength={80}
              onChange={(e) => edit({ type: "title", title: e.target.value })}
            />
          </div>
        ) : null}
        <div className="header-actions">
          <span
            className={`save-state ${storageBlocked || saveStatus.startsWith("Could") ? "save-error" : ""}`}
            role="status"
          >
            {saveStatus.startsWith("Saved") ? <Check size={13} /> : null}
            {storageBlocked ? "Storage unavailable" : saveStatus}
          </span>
          {entry ? (
            <>
              <button
                className={`icon-button ${panel === "materials" ? "selected" : ""}`}
                aria-label="Course material"
                title="Course material"
                aria-expanded={panel === "materials"}
                onClick={() => {
                  setSourceView(null);
                  setPanel(panel === "materials" ? null : "materials");
                }}
              >
                <BookOpen size={18} />
              </button>
              <button
                className={`icon-button ${panel === "session" ? "selected" : ""}`}
                aria-label="Learning notes"
                title="Learning notes"
                aria-expanded={panel === "session"}
                onClick={() => setPanel(panel === "session" ? null : "session")}
              >
                <History size={18} />
              </button>
              <button
                className="icon-button"
                aria-label="Export page as PNG"
                title="Export page as PNG"
                onClick={exportPage}
              >
                <ArrowDownToLine size={18} />
              </button>
              <button
                className="button button-outline"
                aria-label="Import exercise"
                onClick={() => importRef.current?.click()}
                disabled={importing}
              >
                {importing ? (
                  <LoaderCircle size={16} className="spin" />
                ) : (
                  <FileUp size={16} />
                )}
                <span className="import-label">
                  {importing ? "Importing…" : "Import exercise"}
                </span>
              </button>
            </>
          ) : (
            <span className="header-library-label">Your library</span>
          )}
        </div>
        <input
          type="file"
          ref={importRef}
          accept="application/pdf,image/png,image/jpeg,image/webp"
          hidden
          onChange={(e) => void importFile(e.target.files?.[0])}
        />
      </header>
      {notice ? (
        <div className="notice" role="status">
          <span>{notice}</span>
          <button
            className="icon-button"
            aria-label="Dismiss message"
            onClick={() => setNotice("")}
          >
            <X size={15} />
          </button>
        </div>
      ) : null}
      {!entry || !notebook || !page ? (
        <LibraryHome
          library={library}
          subjectId={subjectId}
          onSubject={setSubjectId}
          dispatch={dispatch}
          onOpen={openNotebook}
          onUpload={upload}
          onDownload={(m) => void download(m)}
          onUseMaterial={(m, id) => void useMaterial(m, id)}
          onRemoveMaterial={(m) => void removeMaterial(m)}
          importing={importing}
        />
      ) : (
        <main className="notebook-workspace">
          <div className="editor-tool-area">
            <div className="toolbar" role="toolbar" aria-label="Notebook tools">
              <div className="tool-group">
                {tools.map(({ id, label, key, icon: Icon }) => (
                  <button
                    key={id}
                    className={`tool-button ${tool === id ? "selected" : ""}`}
                    aria-label={label}
                    aria-pressed={tool === id}
                    title={`${label} (${key})`}
                    onClick={() => setTool(id)}
                  >
                    <Icon size={20} />
                  </button>
                ))}
              </div>
              <span className="toolbar-divider" />
              <div className="history-tools">
                <button
                  className="icon-button"
                  aria-label="Undo"
                  disabled={!history?.past.length}
                  onClick={() => edit({ type: "undo", pageId: page.id })}
                >
                  <Undo2 size={19} />
                </button>
                <button
                  className="icon-button"
                  aria-label="Redo"
                  disabled={!history?.future.length}
                  onClick={() => edit({ type: "redo", pageId: page.id })}
                >
                  <Redo2 size={19} />
                </button>
              </div>
              <span className="toolbar-divider" />
              <button
                className={`icon-button ${optionsOpen ? "selected" : ""}`}
                aria-label="Writing options"
                aria-expanded={optionsOpen}
                onClick={() => setOptionsOpen(!optionsOpen)}
              >
                <Settings2 size={19} />
              </button>
              <button
                className={`tool-button tutor-tool ${composerPage ? "selected" : ""}`}
                aria-label="Ask for help on this page"
                onClick={() => setComposerPage(composerPage ? null : page.id)}
              >
                <Sparkles size={17} />
                <span>Ask margin</span>
              </button>
            </div>
            <span className="editor-instruction">
              {tool === "select"
                ? "Select a step. The guidance appears beside it."
                : "Write. Select a step. Keep thinking."}
            </span>
            {optionsOpen ? (
              <div className="writing-options">
                <div className="color-options">
                  {colors.map((c, i) => (
                    <button
                      key={c}
                      style={{ "--ink": c } as React.CSSProperties}
                      className={`color-button ${c === color ? "chosen" : ""}`}
                      aria-label={`Ink ${["deep green", "sage", "terracotta"][i]}`}
                      aria-pressed={c === color}
                      onClick={() => {
                        setColor(c);
                        setTool("pen");
                      }}
                    />
                  ))}
                </div>
                <label>
                  Stroke
                  <select
                    aria-label="Pen width"
                    value={penWidth}
                    onChange={(e) => setPenWidth(Number(e.target.value))}
                  >
                    <option value={1.5}>Fine</option>
                    <option value={2.5}>Medium</option>
                    <option value={4}>Bold</option>
                  </select>
                </label>
                <label>
                  Paper
                  <select
                    aria-label="Paper type"
                    value={page.paper}
                    onChange={(e) =>
                      edit({
                        type: "paper",
                        pageId: page.id,
                        paper: e.target.value as typeof page.paper,
                      })
                    }
                  >
                    <option value="dots">Dotted</option>
                    <option value="lines">Lined</option>
                    <option value="plain">Plain</option>
                  </select>
                </label>
                <button
                  className="icon-button"
                  aria-label={annotationsVisible ? "Hide hints" : "Show hints"}
                  onClick={() => setAnnotationsVisible(!annotationsVisible)}
                >
                  {annotationsVisible ? (
                    <Eye size={18} />
                  ) : (
                    <EyeOff size={18} />
                  )}
                </button>
                <button
                  className="icon-button"
                  aria-label="Clear handwriting"
                  disabled={!page.strokes.length}
                  onClick={() =>
                    edit({ type: "clear-strokes", pageId: page.id })
                  }
                >
                  <RotateCcw size={17} />
                </button>
              </div>
            ) : null}
          </div>
          <div className="paper-viewport" ref={viewportRef}>
            <div
              className="continuous-notebook"
              style={{ minWidth: PAGE_WIDTH * scale + 32 }}
            >
              {notebook.pages.map((p, i) => (
                <PageSurface
                  key={p.id}
                  page={p}
                  index={i}
                  active={p.id === page.id}
                  scale={scale}
                  tool={tool}
                  color={color}
                  penWidth={penWidth}
                  penOnly={penOnly}
                  selection={
                    selection?.pageId === p.id ? selection.region : null
                  }
                  annotationsVisible={annotationsVisible}
                  busy={busy}
                  viewportRef={viewportRef}
                  register={(id, handle) => {
                    if (handle) canvasRefs.current.set(id, handle);
                    else canvasRefs.current.delete(id);
                  }}
                  onActivate={() => edit({ type: "activate", id: p.id })}
                  onSelection={(region) =>
                    setSelection(region ? { pageId: p.id, region } : null)
                  }
                  onStroke={(stroke) =>
                    edit({ type: "stroke", pageId: p.id, stroke })
                  }
                  onHelp={(region, nextIntent) =>
                    void help(p.id, region, nextIntent)
                  }
                  onSource={(ref) => {
                    setSourceView(ref);
                    setPanel("materials");
                  }}
                  materials={library.materials}
                  onCompose={() => {
                    edit({ type: "activate", id: p.id });
                    setComposerPage(p.id);
                  }}
                  onRemove={(id) =>
                    edit({ type: "remove-annotation", pageId: p.id, id })
                  }
                  composer={
                    composerPage === p.id ? (
                      <form
                        className="inline-tutor"
                        style={{
                          top: Math.max(
                            12,
                            Math.min(
                              p.height * scale - 330,
                              selection?.pageId === p.id
                                ? (selection.region.y +
                                    selection.region.height) *
                                    scale +
                                    12
                                : 36,
                            ),
                          ),
                        }}
                        onSubmit={(e) => {
                          e.preventDefault();
                          void help(p.id, undefined, intent);
                        }}
                      >
                        <div className="composer-heading">
                          <span>
                            <Sparkles size={15} />
                            In the margin{" "}
                            <small>
                              {tutorMode === "demo" ? "DEMO" : "AI"}
                            </small>
                          </span>
                          <button
                            type="button"
                            className="icon-button"
                            aria-label="Close help"
                            onClick={() => setComposerPage(null)}
                          >
                            <X size={17} />
                          </button>
                        </div>
                        <label htmlFor="tutor-question">
                          A question about this{" "}
                          {selection?.pageId === p.id ? "step" : "page"}?
                        </label>
                        <select
                          aria-label="Type of help"
                          value={intent}
                          onChange={(e) =>
                            setIntent(e.target.value as typeof intent)
                          }
                        >
                          <option value="hint">Give me a hint</option>
                          <option value="explain">Explain this step</option>
                          <option value="check">Check my update</option>
                        </select>
                        <textarea
                          autoFocus
                          id="tutor-question"
                          value={question}
                          onChange={(e) => setQuestion(e.target.value)}
                          placeholder="Add a question (optional)"
                          rows={2}
                          maxLength={1000}
                        />
                        <button
                          type="submit"
                          className="button button-primary"
                          disabled={busy}
                        >
                          {busy ? (
                            <LoaderCircle size={16} className="spin" />
                          ) : (
                            <ArrowRight size={16} />
                          )}
                          {busy
                            ? "Looking at your page…"
                            : intent === "check"
                              ? "Check my update"
                              : intent === "explain"
                                ? "Explain this step"
                                : "Give me a hint"}
                        </button>
                        <small>
                          {tutorMode === "demo"
                            ? "Scripted hints. This demo does not analyse your page."
                            : "Your page and text excerpts from selected course material will be sent to the AI service."}
                        </small>
                      </form>
                    ) : null
                  }
                />
              ))}
              <button className="add-sheet" onClick={addPage}>
                <Plus size={20} />
                <span>Add a page</span>
              </button>
              <p className="below-paper">Room to find your own way.</p>
            </div>
          </div>
          {panel === "materials" ? (
            <CourseMaterialPanel
              materials={library.materials.filter(
                (m) => m.subjectId === entry.subjectId,
              )}
              attachedIds={entry.materialIds ?? []}
              indexing={indexing}
              sourceView={sourceView}
              onAttach={(m, attached) => void attachMaterial(m, attached)}
              onUpload={(file) => void upload(file, entry.subjectId)}
              uploading={importing}
              onClose={() => setPanel(null)}
            />
          ) : null}
          {panel === "session" ? (
            <SessionPanel
              notebook={notebook}
              busy={busy}
              onClose={() => setPanel(null)}
              onEdit={(id, summary) =>
                edit({ type: "edit-observation", id, summary })
              }
              onClear={() => edit({ type: "clear-observations" })}
              onReview={(id) => {
                edit({ type: "activate", id });
                setPanel(null);
                setIntent("check");
                setComposerPage(id);
                const target = Array.from(
                  viewportRef.current?.querySelectorAll<HTMLElement>(
                    "[data-page-id]",
                  ) ?? [],
                ).find((el) => el.dataset.pageId === id);
                if (target)
                  viewportRef.current?.scrollTo({
                    top: target.offsetTop - 120,
                  });
              }}
            />
          ) : null}
          {busy ? (
            <div className="request-status" role="status">
              <LoaderCircle size={16} className="spin" />
              Preparing guidance for your page…
              <button onClick={() => requestRef.current?.abort()}>
                Cancel
              </button>
            </div>
          ) : null}
          <footer className="workspace-footer">
            <label className="pen-toggle">
              <input
                type="checkbox"
                checked={penOnly}
                onChange={(e) => setPenOnly(e.target.checked)}
              />
              Pen only<span className="desktop-hint"> · finger to pan</span>
            </label>
            <span className="demo-status">
              {tutorMode === "demo"
                ? "Demo tutor · scripted hints"
                : "AI tutor · on request"}
            </span>
            <div className="footer-navigation">
              <select
                aria-label="Go to page"
                value={page.id}
                onChange={(e) => {
                  const target = Array.from(
                    viewportRef.current?.querySelectorAll<HTMLElement>(
                      "[data-page-id]",
                    ) ?? [],
                  ).find((el) => el.dataset.pageId === e.target.value);
                  if (target)
                    viewportRef.current?.scrollTo({
                      top: target.offsetTop - 120,
                    });
                  edit({ type: "activate", id: e.target.value });
                }}
              >
                {notebook.pages.map((p, i) => (
                  <option key={p.id} value={p.id}>
                    Page {i + 1} of {notebook.pages.length}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} />
              <div className="zoom-controls">
                <button
                  className="icon-button"
                  aria-label="Zoom out"
                  disabled={zoom <= 0.6}
                  onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
                >
                  <Minus size={15} />
                </button>
                <button
                  className="zoom-value"
                  aria-label="Fit page"
                  onClick={() => setZoom(1)}
                >
                  {Math.round(scale * 100)}%
                </button>
                <button
                  className="icon-button"
                  aria-label="Zoom in"
                  disabled={zoom >= 2.4}
                  onClick={() => setZoom((z) => Math.min(2.4, z + 0.2))}
                >
                  <Plus size={15} />
                </button>
              </div>
            </div>
          </footer>
        </main>
      )}
    </div>
  );
}
