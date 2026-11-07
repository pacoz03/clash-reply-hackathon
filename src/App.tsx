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
  Check,
  ChevronDown,
  Eraser,
  Eye,
  EyeOff,
  FileUp,
  Hand,
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

const tools = [
  { id: "pen", label: "Penna", key: "P", icon: PenLine },
  { id: "eraser", label: "Gomma", key: "E", icon: Eraser },
  { id: "select", label: "Seleziona", key: "S", icon: Scan },
  { id: "hand", label: "Sposta", key: "H", icon: Hand },
] as const;
const colors = ["#273c46", "#4c7052", "#b76e51"];
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
  const [saveStatus, setSaveStatus] = useState("Caricamento…");
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
  const [intent, setIntent] = useState("Un indizio");
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
              : "Salvataggio locale non disponibile.",
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
    setSaveStatus("Salvataggio…");
    saveLibrary(library)
      .then(() => {
        if (current) setSaveStatus("Salvato sul dispositivo");
      })
      .catch(() => {
        if (current) {
          setSaveStatus("Salvataggio non riuscito");
          setNotice(
            "Non riesco a salvare sul dispositivo. Esporta i fogli prima di chiudere.",
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
    setComposerPage(null);
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
    setZoom(1);
  };
  const goHome = () => {
    requestRef.current?.abort();
    if (entry) setSubjectId(entry.subjectId);
    setActiveId(null);
    setSelection(null);
    setComposerPage(null);
  };
  const addPage = () => {
    if (!notebook) return;
    const next = newPage(notebook.pages.length + 1);
    pendingScroll.current = next.id;
    edit({ type: "add-pages", pages: [next] });
    setTool("pen");
  };
  const help = async (pageId: string, region?: Selection | null) => {
    if (!activeId || busy || requestRef.current) return;
    const targetNotebookId = activeId;
    const target = stateRef.current.library.notebooks
      .find((n) => n.id === targetNotebookId)
      ?.notebook.pages.find((p) => p.id === pageId);
    const canvas = canvasRefs.current.get(pageId);
    if (!target || !canvas) return;
    setBusy(true);
    setNotice("");
    const controller = new AbortController();
    requestRef.current = controller;
    const timeout = setTimeout(() => controller.abort("timeout"), 45_000);
    try {
      const response = await requestTutor(
        {
          pageId,
          revision: target.revision,
          image: canvas.snapshot(),
          selection:
            region === undefined
              ? selection?.pageId === pageId
                ? selection.region
                : null
              : region,
          question: `${intent}. ${question}`.trim(),
          previousHints: target.annotations.map((a) => a.text),
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
          "Hai modificato il foglio durante la richiesta. Chiedi un nuovo aiuto sui passaggi aggiornati.",
        );
        return;
      }
      edit(
        {
          type: "annotate",
          pageId,
          revision: response.revision,
          annotation: response.annotation,
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
          setNotice("Il tutor sta impiegando troppo tempo. Puoi riprovare.");
      } else
        setNotice(
          error instanceof Error
            ? error.message
            : "Qualcosa non ha funzionato. Riprova.",
        );
    } finally {
      clearTimeout(timeout);
      setBusy(false);
      requestRef.current = null;
    }
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
          : "Non riesco ad aprire il documento.",
      );
    } finally {
      setImporting(false);
      if (importRef.current) importRef.current.value = "";
    }
  };
  const upload = async (file: File, subject: string) => {
    if (storageBlocked || importing) {
      setNotice(
        "Il salvataggio non è disponibile. Ricarica prima di caricare materiali.",
      );
      return;
    }
    if (
      file.size > 20 * 1024 * 1024 ||
      !["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(
        file.type,
      )
    ) {
      setNotice("Scegli un PDF, PNG, JPG o WebP fino a 20 MB.");
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
        "Non riesco a conservare questo materiale. Controlla lo spazio disponibile e riprova.",
      );
    } finally {
      setImporting(false);
    }
  };
  const download = async (m: Material) => {
    try {
      const blob = await loadMaterial(m.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = m.name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "File non disponibile.",
      );
    }
  };
  const useMaterial = async (m: Material, id: string) => {
    try {
      const blob = await loadMaterial(m.id);
      await importFile(new File([blob], m.name, { type: m.type }), id);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "File non disponibile.",
      );
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
      setNotice("Non riesco a eliminare il materiale. Riprova.");
    }
  };
  const exportPage = () => {
    try {
      const image = page && canvasRefs.current.get(page.id)?.snapshot();
      if (!image) return;
      const link = document.createElement("a");
      link.href = image;
      link.download = `${page?.title || "esercizio"}.png`;
      link.click();
    } catch {
      setNotice("Non riesco a esportare il foglio. Riprova.");
    }
  };

  if (!ready)
    return (
      <div className="loading-screen">
        <span className="wordmark">
          margine<span>.</span>
        </span>
        <LoaderCircle className="spin" size={20} />
        <p>Apro il tuo spazio di studio…</p>
      </div>
    );
  return (
    <div className={`app-shell ${entry ? "editor-shell" : "home-shell"}`}>
      <header className="app-header">
        <div className="brand-area">
          {entry ? (
            <button
              className="icon-button back-home"
              aria-label="Torna alla biblioteca"
              onClick={goHome}
            >
              <ArrowLeft size={20} />
            </button>
          ) : null}
          <button
            className="wordmark"
            aria-label="Margine, biblioteca"
            onClick={goHome}
          >
            margine<span>.</span>
          </button>
          {!entry ? (
            <span className="edition">IL PIACERE DI CAPIRE.</span>
          ) : null}
        </div>
        {notebook && entry ? (
          <div className="notebook-name">
            <span>
              {library.subjects.find((s) => s.id === entry.subjectId)?.name}
              <span>/</span>
            </span>
            <input
              aria-label="Nome del quaderno"
              value={notebook.title}
              maxLength={80}
              onChange={(e) => edit({ type: "title", title: e.target.value })}
            />
          </div>
        ) : null}
        <div className="header-actions">
          <span
            className={`save-state ${storageBlocked || saveStatus.includes("riuscito") ? "save-error" : ""}`}
            role="status"
          >
            {saveStatus.startsWith("Salvato") ? <Check size={13} /> : null}
            {storageBlocked ? "Salvataggio non disponibile" : saveStatus}
          </span>
          {entry ? (
            <>
              <button
                className="icon-button"
                aria-label="Esporta foglio PNG"
                title="Esporta foglio PNG"
                onClick={exportPage}
              >
                <ArrowDownToLine size={18} />
              </button>
              <button
                className="button button-outline"
                aria-label="Importa esercizio"
                onClick={() => importRef.current?.click()}
                disabled={importing}
              >
                {importing ? (
                  <LoaderCircle size={16} className="spin" />
                ) : (
                  <FileUp size={16} />
                )}
                <span className="import-label">
                  {importing ? "Importazione…" : "Importa esercizio"}
                </span>
              </button>
            </>
          ) : (
            <span className="header-library-label">La tua biblioteca</span>
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
            aria-label="Chiudi messaggio"
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
            <div
              className="toolbar"
              role="toolbar"
              aria-label="Strumenti del quaderno"
            >
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
                  aria-label="Annulla"
                  disabled={!history?.past.length}
                  onClick={() => edit({ type: "undo", pageId: page.id })}
                >
                  <Undo2 size={19} />
                </button>
                <button
                  className="icon-button"
                  aria-label="Ripristina"
                  disabled={!history?.future.length}
                  onClick={() => edit({ type: "redo", pageId: page.id })}
                >
                  <Redo2 size={19} />
                </button>
              </div>
              <span className="toolbar-divider" />
              <button
                className={`icon-button ${optionsOpen ? "selected" : ""}`}
                aria-label="Opzioni di scrittura"
                aria-expanded={optionsOpen}
                onClick={() => setOptionsOpen(!optionsOpen)}
              >
                <Settings2 size={19} />
              </button>
              <button
                className={`tool-button tutor-tool ${composerPage ? "selected" : ""}`}
                aria-label="Chiedi aiuto sul foglio"
                onClick={() => setComposerPage(composerPage ? null : page.id)}
              >
                <Sparkles size={17} />
                <span>Aiuto AI</span>
              </button>
            </div>
            <span className="editor-instruction">
              {tool === "select"
                ? "Seleziona un passaggio. L’aiuto compare lì accanto."
                : "Scrivi, seleziona un dubbio, continua a ragionare."}
            </span>
            {optionsOpen ? (
              <div className="writing-options">
                <div className="color-options">
                  {colors.map((c, i) => (
                    <button
                      key={c}
                      style={{ "--ink": c } as React.CSSProperties}
                      className={`color-button ${c === color ? "chosen" : ""}`}
                      aria-label={`Inchiostro ${["blu scuro", "verde", "terracotta"][i]}`}
                      aria-pressed={c === color}
                      onClick={() => {
                        setColor(c);
                        setTool("pen");
                      }}
                    />
                  ))}
                </div>
                <label>
                  Tratto
                  <select
                    aria-label="Spessore penna"
                    value={penWidth}
                    onChange={(e) => setPenWidth(Number(e.target.value))}
                  >
                    <option value={1.5}>Fine</option>
                    <option value={2.5}>Medio</option>
                    <option value={4}>Spesso</option>
                  </select>
                </label>
                <label>
                  Carta
                  <select
                    aria-label="Tipo di foglio"
                    value={page.paper}
                    onChange={(e) =>
                      edit({
                        type: "paper",
                        pageId: page.id,
                        paper: e.target.value as typeof page.paper,
                      })
                    }
                  >
                    <option value="dots">Puntinata</option>
                    <option value="lines">A righe</option>
                    <option value="plain">Bianca</option>
                  </select>
                </label>
                <button
                  className="icon-button"
                  aria-label={
                    annotationsVisible
                      ? "Nascondi annotazioni"
                      : "Mostra annotazioni"
                  }
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
                  aria-label="Svuota i tratti"
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
                  onHelp={(region) => void help(p.id, region)}
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
                          void help(p.id);
                        }}
                      >
                        <div className="composer-heading">
                          <span>
                            <Sparkles size={15} />
                            Nel margine{" "}
                            <small>
                              {tutorMode === "demo" ? "DEMO" : "AI"}
                            </small>
                          </span>
                          <button
                            type="button"
                            className="icon-button"
                            aria-label="Chiudi aiuto"
                            onClick={() => setComposerPage(null)}
                          >
                            <X size={17} />
                          </button>
                        </div>
                        <label htmlFor="tutor-question">
                          Un dubbio su questo{" "}
                          {selection?.pageId === p.id ? "passaggio" : "foglio"}?
                        </label>
                        <select
                          aria-label="Tipo di aiuto"
                          value={intent}
                          onChange={(e) => setIntent(e.target.value)}
                        >
                          {[
                            "Un indizio",
                            "Spiega il passaggio",
                            "Controlla il tentativo",
                          ].map((value) => (
                            <option key={value}>{value}</option>
                          ))}
                        </select>
                        <textarea
                          autoFocus
                          id="tutor-question"
                          value={question}
                          onChange={(e) => setQuestion(e.target.value)}
                          placeholder="Aggiungi una domanda (facoltativo)"
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
                          {busy ? "Preparo un indizio…" : "Chiedi un indizio"}
                        </button>
                        <small>
                          {tutorMode === "demo"
                            ? "Indizi predefiniti. Nessuna analisi AI del foglio."
                            : "Consegna e tratti saranno inviati al servizio AI."}
                        </small>
                      </form>
                    ) : null
                  }
                />
              ))}
              <button className="add-sheet" onClick={addPage}>
                <Plus size={20} />
                <span>Aggiungi un foglio</span>
              </button>
              <p className="below-paper">Lo spazio per arrivarci resta tuo.</p>
            </div>
          </div>
          {busy ? (
            <div className="request-status" role="status">
              <LoaderCircle size={16} className="spin" />
              Preparo un indizio sul foglio…
              <button onClick={() => requestRef.current?.abort()}>
                Annulla
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
              Solo penna<span className="desktop-hint"> · il dito scorre</span>
            </label>
            <span className="demo-status">
              {tutorMode === "demo"
                ? "Tutor demo · indizi predefiniti"
                : "Tutor AI collegato"}
            </span>
            <div className="footer-navigation">
              <select
                aria-label="Vai al foglio"
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
                    Foglio {i + 1} di {notebook.pages.length}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} />
              <div className="zoom-controls">
                <button
                  className="icon-button"
                  aria-label="Riduci zoom"
                  disabled={zoom <= 0.6}
                  onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
                >
                  <Minus size={15} />
                </button>
                <button
                  className="zoom-value"
                  aria-label="Adatta foglio alla finestra"
                  onClick={() => setZoom(1)}
                >
                  {Math.round(scale * 100)}%
                </button>
                <button
                  className="icon-button"
                  aria-label="Aumenta zoom"
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
