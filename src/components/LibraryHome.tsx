import { useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  BookOpen,
  ChevronRight,
  FileText,
  FileUp,
  FolderOpen,
  LoaderCircle,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { uid } from "../model";
import type {
  Library,
  LibraryAction,
  Material,
  NotebookEntry,
} from "../library";

interface Props {
  library: Library;
  subjectId: string;
  onSubject: (id: string) => void;
  dispatch: (action: LibraryAction) => void;
  onOpen: (id: string) => void;
  onUpload: (file: File, subjectId: string) => Promise<void>;
  onDownload: (material: Material) => void;
  onRemoveMaterial: (material: Material) => void;
  onUseMaterial: (material: Material, notebookId: string) => void;
  importing: boolean;
}
const date = (value: number) =>
  new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short" }).format(
    value,
  );
export function LibraryHome({
  library,
  subjectId,
  onSubject,
  dispatch,
  onOpen,
  onUpload,
  onDownload,
  onRemoveMaterial,
  onUseMaterial,
  importing,
}: Props) {
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState<"subject" | "notebook" | null>(null);
  const [name, setName] = useState("");
  const [newSubjectId, setNewSubjectId] = useState(subjectId);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [using, setUsing] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const subject =
    library.subjects.find((s) => s.id === subjectId) ?? library.subjects[0];
  const entries = library.notebooks.filter((n) => n.subjectId === subject.id);
  const notebooks = entries
    .filter((n) =>
      n.notebook.title
        .toLocaleLowerCase("it")
        .includes(search.toLocaleLowerCase("it")),
    )
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const materials = library.materials.filter(
    (m) =>
      m.subjectId === subject.id &&
      m.name.toLocaleLowerCase("it").includes(search.toLocaleLowerCase("it")),
  );
  const recent = [...library.notebooks].sort(
    (a, b) => b.updatedAt - a.updatedAt,
  )[0];
  const begin = (type: "subject" | "notebook") => {
    setCreating(type);
    setName("");
    setNewSubjectId(subject.id);
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    const id = uid();
    if (creating === "subject") {
      dispatch({ type: "subject", id, name: name.trim() });
      onSubject(id);
    } else {
      dispatch({
        type: "create-notebook",
        id,
        subjectId: newSubjectId,
        title: name.trim(),
      });
      onOpen(id);
    }
    setCreating(null);
    setName("");
  };
  const notebookItem = (entry: NotebookEntry, index: number) => (
    <article className="notebook-item" key={entry.id}>
      <button className="notebook-open" onClick={() => onOpen(entry.id)}>
        <div className={`notebook-cover cover-${index % 3}`} aria-hidden="true">
          <span>M</span>
          <div>{entry.notebook.title}</div>
          <small>
            MARGINE / {String(entry.notebook.pages.length).padStart(2, "0")}
          </small>
        </div>
        <div className="notebook-info">
          <h3>{entry.notebook.title || "Quaderno senza titolo"}</h3>
          <p>
            {entry.notebook.pages.length}{" "}
            {entry.notebook.pages.length === 1 ? "foglio" : "fogli"}
            <span>·</span>
            {date(entry.updatedAt)}
          </p>
        </div>
        <ArrowRight className="open-arrow" size={18} />
      </button>
      {confirmDelete === entry.id ? (
        <div className="delete-confirm">
          <span>Eliminare questo quaderno e tutti i suoi fogli?</span>
          <button
            onClick={() => {
              dispatch({ type: "delete-notebook", id: entry.id });
              setConfirmDelete(null);
            }}
          >
            Elimina
          </button>
          <button onClick={() => setConfirmDelete(null)}>Annulla</button>
        </div>
      ) : (
        <button
          className="icon-button notebook-delete"
          aria-label={`Elimina ${entry.notebook.title}`}
          onClick={() => setConfirmDelete(entry.id)}
        >
          <Trash2 size={15} />
        </button>
      )}
    </article>
  );
  return (
    <main className="library-home">
      <div className="library-topline">
        <span className="eyebrow">IL TUO SPAZIO DI STUDIO</span>
        <span className="local-label">
          <span className="status-dot" /> Sul tuo dispositivo
        </span>
      </div>
      <section className="library-intro">
        <div>
          <h1>
            Spazio ai tuoi
            <br />
            <em>ragionamenti.</em>
          </h1>
          <p>
            Una materia, i suoi materiali, i tuoi quaderni.
            <br />
            Riparti da dove si è fermata la penna.
          </p>
        </div>
        {recent ? (
          <button className="resume-notebook" onClick={() => onOpen(recent.id)}>
            <span className="resume-icon">
              <BookOpen size={25} strokeWidth={1.3} />
            </span>
            <span>
              <small>CONTINUA A SCRIVERE</small>
              <strong>
                {recent.notebook.title || "Quaderno senza titolo"}
              </strong>
              <span>
                {library.subjects.find((s) => s.id === recent.subjectId)?.name}{" "}
                · {recent.notebook.pages.length}{" "}
                {recent.notebook.pages.length === 1 ? "foglio" : "fogli"}
              </span>
            </span>
            <ArrowRight size={21} />
          </button>
        ) : null}
      </section>
      <nav className="subject-tabs" aria-label="Materie">
        {library.subjects.map((s) => (
          <button
            key={s.id}
            className={subject.id === s.id ? "active" : ""}
            aria-current={subject.id === s.id ? "page" : undefined}
            onClick={() => {
              onSubject(s.id);
              setSearch("");
              setCreating(null);
            }}
          >
            {s.name}
            <span>
              {library.notebooks.filter((n) => n.subjectId === s.id).length}
            </span>
          </button>
        ))}
        <button className="new-subject" onClick={() => begin("subject")}>
          <Plus size={16} />
          Nuova materia
        </button>
      </nav>
      {creating ? (
        <form className="inline-create" onSubmit={submit}>
          <label htmlFor="new-name">
            {creating === "subject"
              ? "Nome della materia"
              : "Nome del quaderno"}
          </label>
          <input
            id="new-name"
            autoFocus
            required
            maxLength={80}
            placeholder={
              creating === "subject"
                ? "Es. Fisica generale"
                : "Es. Esercizi del primo semestre"
            }
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {creating === "notebook" ? (
            <select
              aria-label="Materia del nuovo quaderno"
              value={newSubjectId}
              onChange={(e) => setNewSubjectId(e.target.value)}
            >
              {library.subjects.map((s) => (
                <option value={s.id} key={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          ) : null}
          <button
            className="button button-primary"
            type="submit"
            disabled={!name.trim()}
          >
            Crea {creating === "subject" ? "materia" : "quaderno"}
            <ArrowRight size={16} />
          </button>
          <button
            className="icon-button"
            type="button"
            aria-label="Annulla creazione"
            onClick={() => setCreating(null)}
          >
            <X size={18} />
          </button>
        </form>
      ) : null}
      <section className="subject-content" aria-label={subject.name}>
        <div className="subject-heading">
          <div>
            <span className="eyebrow">LA TUA MATERIA</span>
            <h2>{subject.name}</h2>
          </div>
          <label className="library-search">
            <Search size={17} />
            <input
              aria-label="Cerca quaderni e materiali"
              placeholder="Cerca in questa materia"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
        <div className="collection-heading">
          <h3>
            Quaderni <span>{entries.length}</span>
          </h3>
          <button
            className="button button-primary"
            onClick={() => begin("notebook")}
          >
            <Plus size={17} />
            Nuovo quaderno
          </button>
        </div>
        <div className="notebook-collection">
          {notebooks.map(notebookItem)}
          {!notebooks.length ? (
            <div className="collection-empty">
              <BookOpen size={25} strokeWidth={1.2} />
              <h3>
                {search
                  ? "Nessun quaderno trovato"
                  : "Il primo foglio ti aspetta."}
              </h3>
              <p>
                {search
                  ? "Prova con un altro nome."
                  : "Crea un quaderno e scrivi un esercizio, oppure importa una consegna."}
              </p>
              {!search ? (
                <button
                  className="text-button"
                  onClick={() => begin("notebook")}
                >
                  Crea il primo quaderno <ArrowRight size={16} />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="materials-section">
          <div className="collection-heading">
            <div>
              <h3>
                Materiali{" "}
                <span>
                  {
                    library.materials.filter((m) => m.subjectId === subject.id)
                      .length
                  }
                </span>
              </h3>
              <p>Dispense, appunti e consegne, nello stesso posto.</p>
            </div>
            <button
              className="button button-outline"
              disabled={importing}
              onClick={() => fileRef.current?.click()}
            >
              {importing ? (
                <LoaderCircle size={16} className="spin" />
              ) : (
                <FileUp size={16} />
              )}
              Carica materiale
            </button>
          </div>
          <input
            ref={fileRef}
            hidden
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onUpload(file, subject.id);
              e.target.value = "";
            }}
          />
          {materials.length ? (
            <div className="material-list">
              {materials.map((m) => (
                <div className="material-row" key={m.id}>
                  <FileText size={22} strokeWidth={1.3} />
                  <div className="material-name">
                    <strong>{m.name}</strong>
                    <small>
                      {m.type === "application/pdf" ? "PDF" : "Immagine"} ·{" "}
                      {m.size < 1024 * 1024
                        ? `${Math.max(1, Math.round(m.size / 1024))} KB`
                        : `${(m.size / 1024 / 1024).toLocaleString("it-IT", { maximumFractionDigits: 1 })} MB`}{" "}
                      · {date(m.addedAt)}
                    </small>
                  </div>
                  <button
                    className="text-button use-material"
                    disabled={importing}
                    onClick={() => setUsing(using === m.id ? null : m.id)}
                  >
                    Usa in un quaderno <ChevronRight size={15} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Scarica ${m.name}`}
                    onClick={() => onDownload(m)}
                  >
                    <ArrowDownToLine size={17} />
                  </button>
                  {confirmDelete === m.id ? (
                    <div className="delete-confirm">
                      <span>Eliminare il materiale?</span>
                      <button
                        onClick={() => {
                          onRemoveMaterial(m);
                          setConfirmDelete(null);
                        }}
                      >
                        Elimina
                      </button>
                      <button onClick={() => setConfirmDelete(null)}>
                        Annulla
                      </button>
                    </div>
                  ) : (
                    <button
                      className="icon-button"
                      aria-label={`Elimina ${m.name}`}
                      onClick={() => setConfirmDelete(m.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                  {using === m.id ? (
                    <div className="material-picker">
                      <span>Aggiungi come fogli in:</span>
                      {entries.map((n) => (
                        <button
                          key={n.id}
                          disabled={importing}
                          onClick={() => {
                            onUseMaterial(m, n.id);
                            setUsing(null);
                          }}
                        >
                          {n.notebook.title}
                          <ArrowRight size={14} />
                        </button>
                      ))}
                      {!entries.length ? (
                        <button onClick={() => begin("notebook")}>
                          Crea prima un quaderno <Plus size={14} />
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="materials-empty">
              <FolderOpen size={23} strokeWidth={1.2} />
              <p>
                {search
                  ? "Nessun materiale trovato."
                  : "Aggiungi un PDF o un’immagine per questa materia."}
                <small>
                  I file restano sul dispositivo. Non sono ancora consultati dal
                  tutor.
                </small>
              </p>
            </div>
          )}
        </div>
      </section>
      <footer className="library-footer">
        <span className="wordmark">
          margine<span>.</span>
        </span>
        <p>Scrivi. Ragiona. Un passaggio alla volta.</p>
      </footer>
    </main>
  );
}
