import { useEffect, useReducer, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowRight, BookOpen, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Eraser, Eye, EyeOff, FileUp, Hand, LoaderCircle, Menu, Minus, MousePointer2, PenLine, Plus, Redo2, RotateCcw, Scan, Undo2, X } from 'lucide-react';
import { NotebookCanvas, type CanvasHandle } from './components/NotebookCanvas';
import { PageThumbnail } from './components/PageThumbnail';
import { editorReducer, initialNotebook, newPage, PAGE_WIDTH, type EditorState, type Selection, type Tool } from './model';
import { loadNotebook, saveNotebook } from './services/storage';
import { requestTutor, tutorMode } from './services/tutor';
import { importDocument } from './services/import';

const tools = [
  { id: 'pen', label: 'Penna', key: 'P', icon: PenLine },
  { id: 'eraser', label: 'Gomma', key: 'E', icon: Eraser },
  { id: 'select', label: 'Seleziona', key: 'S', icon: Scan },
  { id: 'hand', label: 'Sposta', key: 'H', icon: Hand },
] as const;
const colors = ['#273c46', '#2a5c8a', '#b4532f'];

export default function App() {
  const [state, dispatch] = useReducer(editorReducer, undefined, (): EditorState => ({ notebook: initialNotebook(), history: {} }));
  const { notebook } = state;
  const notebookRef = useRef(notebook); notebookRef.current = notebook;
  const [ready, setReady] = useState(false);
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Caricamento…');
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState(colors[0]);
  const [penWidth, setPenWidth] = useState(2.5);
  const [penOnly, setPenOnly] = useState(true);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [annotationsVisible, setAnnotationsVisible] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [intent, setIntent] = useState('Un indizio');
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState('');
  const [zoom, setZoom] = useState(1);
  const [fitScale, setFitScale] = useState(0.85);
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<CanvasHandle>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const page = notebook.pages.find(p => p.id === notebook.activePageId) ?? notebook.pages[0];
  const pageIndex = notebook.pages.indexOf(page);
  const history = state.history[page.id];
  const scale = Math.min(2.4, Math.max(0.25, fitScale * zoom));

  useEffect(() => {
    let alive = true;
    loadNotebook().then(saved => { if (alive && saved) dispatch({ type: 'replace', notebook: saved }); })
      .catch(error => { if (alive) { setStorageBlocked(true); setNotice(error instanceof Error ? error.message : 'Il salvataggio locale non è disponibile. Esporta il lavoro prima di chiudere.'); } })
      .finally(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    if (!ready || storageBlocked) return;
    let current = true;
    setSaveStatus('Salvataggio…');
    saveNotebook(notebook).then(() => { if (current) setSaveStatus('Salvato sul dispositivo'); })
      .catch(() => { if (current) { setSaveStatus('Salvataggio non riuscito'); setNotice('Non riesco a salvare sul dispositivo. Esporta il foglio prima di chiudere.'); } });
    return () => { current = false; };
  }, [notebook, ready, storageBlocked]);
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const resize = new ResizeObserver(([entry]) => setFitScale(Math.min(1, (entry.contentRect.width - (entry.contentRect.width < 550 ? 32 : 80)) / PAGE_WIDTH)));
    resize.observe(viewport);
    return () => resize.disconnect();
  }, [ready]);
  useEffect(() => {
    setSelection(null);
    viewportRef.current?.scrollTo({ top: 0, left: 0 });
  }, [page.id]);
  useEffect(() => () => requestRef.current?.abort(), []);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && (event.target.matches('input, textarea, select') || event.target.isContentEditable)) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault(); dispatch({ type: event.shiftKey ? 'redo' : 'undo', pageId: page.id }); return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const found = tools.find(t => t.key.toLowerCase() === event.key.toLowerCase());
      if (found) setTool(found.id);
      if (event.key === 'Escape') { setSelection(null); setSidebarOpen(false); setTutorOpen(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [page.id]);

  const addPage = () => { dispatch({ type: 'add-pages', pages: [newPage(notebook.pages.length + 1)] }); setSidebarOpen(false); setTool('pen'); };
  const activate = (id: string) => { dispatch({ type: 'activate', id }); setSidebarOpen(false); };
  const help = async () => {
    if (!canvasRef.current || busy) return;
    setBusy(true); setNotice(''); setTutorOpen(true);
    const controller = new AbortController(); requestRef.current = controller;
    const timeout = setTimeout(() => controller.abort('timeout'), 45_000);
    try {
      const response = await requestTutor({ pageId: page.id, revision: page.revision, image: canvasRef.current.snapshot(), selection, question: `${intent}. ${question}`.trim(), previousHints: page.annotations.map(a => a.text) }, page, controller.signal);
      const latest = notebookRef.current.pages.find(p => p.id === response.pageId);
      if (latest?.revision !== response.revision) { setNotice('Hai modificato il foglio durante la richiesta. Chiedi un nuovo aiuto sui passaggi aggiornati.'); return; }
      dispatch({ type: 'annotate', pageId: response.pageId, revision: response.revision, annotation: response.annotation });
      setAnnotationsVisible(true); setQuestion('');
    } catch (error) {
      if (controller.signal.aborted) setNotice(controller.signal.reason === 'timeout' ? 'Il tutor sta impiegando troppo tempo. Puoi riprovare.' : 'Richiesta annullata.');
      else setNotice(error instanceof Error ? error.message : 'Qualcosa non ha funzionato. Riprova.');
    } finally { clearTimeout(timeout); setBusy(false); requestRef.current = null; }
  };
  const importFile = async (file?: File) => {
    if (!file) return;
    setImporting(true); setNotice('');
    try { const pages = await importDocument(file, notebookRef.current.pages.length); dispatch({ type: 'add-pages', pages }); setSidebarOpen(false); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Non riesco ad aprire il documento. Prova con un altro file.'); }
    finally { setImporting(false); if (importRef.current) importRef.current.value = ''; }
  };
  const exportPage = () => {
    try {
      const image = canvasRef.current?.snapshot(); if (!image) return;
      const link = document.createElement('a'); link.href = image; link.download = `${page.title || 'esercizio'}.png`; link.click();
      setNotice('Foglio esportato in PNG con il tuo svolgimento, senza gli indizi del tutor.');
    } catch { setNotice('Non riesco a esportare il foglio. Riprova.'); }
  };

  if (!ready) return <div className="loading-screen"><span className="wordmark">margine<span>.</span></span><LoaderCircle className="spin" size={20} /><p>Apro il tuo quaderno…</p></div>;

  return <div className="app-shell">
    <header className="app-header">
      <div className="brand-area"><button className="icon-button mobile-menu" aria-label="Mostra pagine" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(!sidebarOpen)}><Menu size={20} /></button><a className="wordmark" href="#" aria-label="Margine, il tuo quaderno">margine<span>.</span></a><span className="edition">IL TUO QUADERNO</span></div>
      <div className="notebook-name"><input aria-label="Nome del quaderno" value={notebook.title} maxLength={80} onChange={e => dispatch({ type: 'title', title: e.target.value })} /><ChevronDown size={13} aria-hidden="true" /></div>
      <div className="header-actions"><span className={`save-state ${storageBlocked ? 'save-error' : ''}`} role="status">{saveStatus.startsWith('Salvato') ? <Check size={13} /> : null}{storageBlocked ? 'Salvataggio non disponibile' : saveStatus}</span><button className="icon-button export-button" aria-label="Esporta foglio PNG" title="Esporta foglio PNG" onClick={exportPage}><ArrowDownToLine size={18} /></button><button className="button button-outline import-button" onClick={() => importRef.current?.click()} disabled={importing}>{importing ? <LoaderCircle size={16} className="spin" /> : <FileUp size={16} />}<span>{importing ? 'Importazione…' : 'Importa'}</span></button></div>
      <input type="file" ref={importRef} accept="application/pdf,image/png,image/jpeg,image/webp" hidden onChange={e => void importFile(e.target.files?.[0])} />
    </header>

    <div className="workbench">
      {sidebarOpen ? <button className="drawer-backdrop" aria-label="Chiudi elenco pagine" onClick={() => setSidebarOpen(false)} /> : null}
      <aside className={`pages-sidebar ${sidebarOpen ? 'drawer-open' : ''}`} aria-label="Pagine del quaderno">
        <div className="section-label">LE TUE PAGINE <span>{String(notebook.pages.length).padStart(2, '0')}</span></div>
        <div className="pages-list">{notebook.pages.map((p, i) => <PageThumbnail key={p.id} page={p} index={i} active={p.id === page.id} onClick={() => activate(p.id)} />)}</div>
        <button className="add-page" onClick={addPage}><Plus size={17} /> Nuovo foglio</button>
        <div className="sidebar-foot"><BookOpen size={15} /><div>Spazio ai tuoi ragionamenti.<small>Matematica & fisica</small></div></div>
      </aside>

      <main className="notebook-workspace">
        <div className="workspace-heading"><div className="breadcrumb">QUADERNO <span>/</span> <strong>{page.title}</strong></div><button className={`tutor-toggle ${tutorOpen ? 'is-active' : ''}`} aria-expanded={tutorOpen} onClick={() => setTutorOpen(!tutorOpen)}><CircleHelp size={17} /> Tutor <span className="tiny-dot" /></button></div>
        <div className="toolbar" role="toolbar" aria-label="Strumenti del quaderno">
          <div className="tool-group">{tools.map(({ id, label, key, icon: Icon }) => <button key={id} className={`tool-button ${tool === id ? 'selected' : ''}`} aria-label={label} aria-pressed={tool === id} title={`${label} (${key})`} onClick={() => setTool(id)}><Icon size={19} /><span>{label}</span></button>)}</div>
          <span className="toolbar-divider" />
          <div className="ink-options"><div className="color-options" aria-label="Colore inchiostro">{colors.map((c, i) => <button key={c} style={{ '--ink': c } as React.CSSProperties} className={`color-button ${c === color ? 'chosen' : ''}`} aria-label={`Inchiostro ${['scuro', 'blu', 'terracotta'][i]}`} aria-pressed={c === color} onClick={() => { setColor(c); setTool('pen'); }} />)}</div><select className="width-select" aria-label="Spessore penna" value={penWidth} onChange={e => setPenWidth(Number(e.target.value))}><option value={1.5}>Fine</option><option value={2.5}>Medio</option><option value={4}>Spesso</option></select></div>
          <div className="history-tools"><button className="icon-button" aria-label="Annulla" title="Annulla (⌘Z)" disabled={!history?.past.length} onClick={() => dispatch({ type: 'undo', pageId: page.id })}><Undo2 size={18} /></button><button className="icon-button" aria-label="Ripristina" title="Ripristina (⇧⌘Z)" disabled={!history?.future.length} onClick={() => dispatch({ type: 'redo', pageId: page.id })}><Redo2 size={18} /></button><button className="icon-button" aria-label="Svuota i tratti" title="Svuota i tratti (puoi annullare)" disabled={!page.strokes.length} onClick={() => dispatch({ type: 'clear-strokes', pageId: page.id })}><RotateCcw size={16} /></button></div>
        </div>
        {notice ? <div className="notice" role="status"><span>{notice}</span><button className="icon-button" aria-label="Chiudi messaggio" onClick={() => setNotice('')}><X size={15} /></button></div> : null}
        <div className="paper-viewport" ref={viewportRef}>
          <div className="page-meta"><span>FOGLIO {String(pageIndex + 1).padStart(2, '0')}</span><select aria-label="Tipo di foglio" value={page.paper} onChange={e => dispatch({ type: 'paper', pageId: page.id, paper: e.target.value as typeof page.paper })}><option value="dots">Puntinato</option><option value="lines">A righe</option><option value="plain">Bianco</option></select></div>
          <div className="paper-container" style={{ minWidth: PAGE_WIDTH * scale + 32 }}>
            <NotebookCanvas key={page.id} ref={canvasRef} page={page} scale={scale} tool={tool} color={color} penWidth={penWidth} penOnly={penOnly} selection={selection} annotationsVisible={annotationsVisible} viewportRef={viewportRef} onSelection={setSelection} onStroke={stroke => dispatch({ type: 'stroke', pageId: page.id, stroke })} />
          </div>
          <p className="below-paper">Un passaggio alla volta.</p>
        </div>
        {selection ? <div className="selection-bar"><Scan size={16} /><span>Passaggio selezionato</span><button className="selection-help" onClick={() => void help()} disabled={busy}>Aiutami qui <ArrowRight size={15} /></button><button className="icon-button" aria-label="Rimuovi selezione" onClick={() => setSelection(null)}><X size={15} /></button></div> : null}
        <footer className="workspace-footer"><label className="pen-toggle"><input type="checkbox" checked={penOnly} onChange={e => setPenOnly(e.target.checked)} /><span>Solo penna</span><span className="desktop-hint"> · trascina col dito per spostarti</span></label><div className="zoom-controls"><button className="icon-button" aria-label="Riduci zoom" disabled={zoom <= 0.6} onClick={() => setZoom(z => Math.max(0.6, z - 0.2))}><Minus size={15} /></button><button className="zoom-value" aria-label="Adatta foglio alla finestra" title="Adatta alla finestra" onClick={() => setZoom(1)}>{Math.round(scale * 100)}%</button><button className="icon-button" aria-label="Aumenta zoom" disabled={zoom >= 2.4} onClick={() => setZoom(z => Math.min(2.4, z + 0.2))}><Plus size={15} /></button></div><div className="page-nav"><button className="icon-button" aria-label="Pagina precedente" disabled={pageIndex === 0} onClick={() => activate(notebook.pages[pageIndex - 1].id)}><ChevronLeft size={16} /></button><span>{pageIndex + 1} / {notebook.pages.length}</span><button className="icon-button" aria-label="Pagina successiva" disabled={pageIndex === notebook.pages.length - 1} onClick={() => activate(notebook.pages[pageIndex + 1].id)}><ChevronRight size={16} /></button></div></footer>
      </main>

      <aside className={`tutor-panel ${tutorOpen ? 'tutor-open' : ''}`} aria-label="Tutor sul foglio">
        <div className="tutor-panel-heading"><span className="section-label">NEL MARGINE</span><span className="mode-badge">{tutorMode === 'demo' ? 'DEMO' : 'AI'}</span><button className="icon-button close-tutor" aria-label="Chiudi tutor" onClick={() => setTutorOpen(false)}><X size={18} /></button></div>
        <div className="tutor-intro"><div className="margin-symbol" aria-hidden="true"><span /><PenLine size={25} strokeWidth={1.3} /></div><h1>Il prossimo passo,<br /><em>insieme.</em></h1><p>Un indizio vicino ai tuoi passaggi. Lo spazio per arrivarci resta tuo.</p></div>
        <div className="help-context"><MousePointer2 size={15} /><span>{selection ? 'Sul passaggio selezionato' : 'Su questo foglio'}<small>{selection ? 'Il tutor riceverà anche il contesto della pagina.' : 'Puoi selezionare una zona con lo strumento Seleziona.'}</small></span></div>
        <div className="intent-options" aria-label="Tipo di aiuto">{['Un indizio', 'Spiega il passaggio', 'Controlla il tentativo'].map(value => <button key={value} className={intent === value ? 'active' : ''} aria-pressed={intent === value} onClick={() => setIntent(value)}>{value}</button>)}</div>
        <label className="question-label" htmlFor="tutor-question">Dove ti sei bloccato? <span>Facoltativo</span></label>
        <textarea id="tutor-question" value={question} onChange={e => setQuestion(e.target.value)} placeholder="Perché questo passaggio non torna?" rows={3} maxLength={1000} />
        <button className="button button-primary ask-button" onClick={() => void help()} disabled={busy}>{busy ? <LoaderCircle size={17} className="spin" /> : <PenLine size={17} />} {busy ? 'Preparo un indizio…' : selection ? 'Aiutami qui' : 'Aiutami sul foglio'}{!busy ? <ArrowRight size={17} /> : null}</button>
        {busy ? <button className="text-button" onClick={() => requestRef.current?.abort()}>Annulla richiesta</button> : null}
        <p className="demo-disclosure">{tutorMode === 'demo' ? 'Tutor dimostrativo: gli indizi sono predefiniti. Nessuna analisi AI e nessun invio dei tuoi fogli.' : 'Il foglio e la richiesta vengono inviati al servizio AI configurato.'}</p>
        <div className="annotations-heading"><span>INDIZI SUL FOGLIO <b>{page.annotations.length}</b></span><button className="icon-button" aria-label={annotationsVisible ? 'Nascondi annotazioni' : 'Mostra annotazioni'} aria-pressed={annotationsVisible} onClick={() => setAnnotationsVisible(!annotationsVisible)}>{annotationsVisible ? <Eye size={17} /> : <EyeOff size={17} />}</button></div>
        <div className="annotations-list">{page.annotations.length ? page.annotations.map((a, i) => <article className="annotation-item" key={a.id}><div><span className="annotation-number">{String(i + 1).padStart(2, '0')}</span><button className="icon-button" aria-label={`Rimuovi indizio ${i + 1}`} onClick={() => dispatch({ type: 'remove-annotation', pageId: page.id, id: a.id })}><X size={14} /></button></div><p>{a.text}</p>{a.source ? <small>{a.source}</small> : null}</article>) : <p className="annotations-empty">I tuoi indizi compariranno qui<br />e direttamente sul foglio.</p>}</div>
        <div className="tutor-foot"><span className="tiny-dot" /> Il ragionamento è tuo.</div>
      </aside>
    </div>
  </div>;
}
