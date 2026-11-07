import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { MessageCircle, Sparkles, X } from "lucide-react";
import { NotebookCanvas, type CanvasHandle } from "./NotebookCanvas";
import {
  PAGE_WIDTH,
  type Page,
  type Selection,
  type Stroke,
  type Tool,
} from "../model";
import { layoutNotes } from "../note-layout";
import { tutorMode } from "../services/tutor";

interface Props {
  page: Page;
  index: number;
  active: boolean;
  scale: number;
  tool: Tool;
  color: string;
  penWidth: number;
  penOnly: boolean;
  selection: Selection | null;
  annotationsVisible: boolean;
  busy: boolean;
  viewportRef: RefObject<HTMLDivElement | null>;
  register: (id: string, handle: CanvasHandle | null) => void;
  onActivate: () => void;
  onSelection: (selection: Selection | null) => void;
  onStroke: (stroke: Stroke) => void;
  onHelp: (region?: Selection | null) => void;
  onCompose: () => void;
  onRemove: (id: string) => void;
  composer: ReactNode;
}
export function PageSurface(props: Props) {
  const { page, index, active, scale, selection } = props;
  const sectionRef = useRef<HTMLElement>(null);
  const [near, setNear] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const notesRef = useRef<HTMLElement>(null);
  const [heights, setHeights] = useState<Record<string, number>>({});
  const [compact, setCompact] = useState(
    () => window.matchMedia("(max-width: 899px)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(max-width: 899px)");
    const update = () => setCompact(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    const observer = new ResizeObserver((entries) =>
      setHeights((previous) => {
        const next = { ...previous };
        let changed = false;
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.annotationId!;
          const height = (entry.target as HTMLElement).offsetHeight;
          if (next[id] !== height) {
            next[id] = height;
            changed = true;
          }
        }
        return changed ? next : previous;
      }),
    );
    notesRef.current
      ?.querySelectorAll("[data-annotation-id]")
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [page.annotations, props.annotationsVisible, compact]);
  const notesLayout = layoutNotes(
    page.annotations,
    scale,
    page.height,
    heights,
    compact,
  );
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setNear(entry.isIntersecting),
      { root: props.viewportRef.current, rootMargin: "700px 0px" },
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [props.viewportRef]);
  return (
    <section
      ref={sectionRef}
      className={`page-section ${active ? "active-page" : ""}`}
      data-page-id={page.id}
      aria-label={`Foglio ${index + 1}: ${page.title}`}
      style={{ width: PAGE_WIDTH * scale }}
    >
      <div className="page-meta">
        <button onClick={props.onActivate}>
          FOGLIO {String(index + 1).padStart(2, "0")}
          <span>{page.title}</span>
        </button>
        <span>{page.background ? "Importato" : "Scrivi liberamente"}</span>
      </div>
      <div
        className="sheet-stack"
        style={{
          minHeight: Math.max(
            page.height * scale,
            props.annotationsVisible ? notesLayout.bottom : 0,
          ),
        }}
      >
        {near || active ? (
          <NotebookCanvas
            ref={(handle) => props.register(page.id, handle)}
            page={page}
            scale={scale}
            tool={props.tool}
            color={props.color}
            penWidth={props.penWidth}
            penOnly={props.penOnly}
            selection={selection}
            annotationsVisible={props.annotationsVisible}
            viewportRef={props.viewportRef}
            onSelection={props.onSelection}
            onStroke={props.onStroke}
            onActivate={props.onActivate}
            onSelecting={setSelecting}
          />
        ) : (
          <div
            className="paper paper-placeholder"
            style={{ height: page.height * scale }}
          />
        )}
        {selection && !selecting ? (
          <div
            className="selection-actions"
            style={{
              left: Math.max(
                6,
                Math.min(
                  PAGE_WIDTH * scale - 192,
                  (selection.x + selection.width) * scale + 10,
                ),
              ),
              top: Math.max(
                8,
                Math.min(page.height * scale - 50, selection.y * scale - 48),
              ),
            }}
          >
            <button
              className="context-help"
              onClick={() => props.onHelp()}
              disabled={props.busy}
            >
              <Sparkles size={15} />
              Aiuto AI{tutorMode === "demo" ? <small>DEMO</small> : null}
            </button>
            <button
              className="icon-button"
              aria-label="Aggiungi una domanda"
              onClick={props.onCompose}
            >
              <MessageCircle size={16} />
            </button>
            <button
              className="icon-button"
              aria-label="Rimuovi selezione"
              onClick={() => props.onSelection(null)}
            >
              <X size={14} />
            </button>
          </div>
        ) : null}
        {props.composer}
        {props.annotationsVisible && page.annotations.length ? (
          <aside
            ref={notesRef}
            className="page-notes"
            aria-label={`Indizi sul foglio ${index + 1}`}
          >
            {!compact ? (
              <svg
                className="margin-connectors"
                width="24"
                height={Math.max(page.height * scale, notesLayout.bottom)}
                aria-hidden="true"
              >
                {page.annotations.map((annotation, i) => {
                  const anchorY =
                    (annotation.anchor.y + annotation.anchor.height / 2) *
                    scale;
                  const noteY = notesLayout.positions[i] + 24;
                  return (
                    <polyline
                      key={annotation.id}
                      points={`0,${anchorY} 8,${anchorY} 16,${noteY} 24,${noteY}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1"
                    />
                  );
                })}
              </svg>
            ) : null}
            {page.annotations.map((annotation, i) => (
              <article
                className="margin-note"
                data-annotation-id={annotation.id}
                key={annotation.id}
                style={{ top: notesLayout.positions[i] }}
              >
                <div className="note-heading">
                  <button
                    className="note-collapse"
                    aria-label={`${collapsed.has(annotation.id) ? "Espandi" : "Comprimi"} indizio ${i + 1}`}
                    aria-expanded={!collapsed.has(annotation.id)}
                    onClick={() =>
                      setCollapsed((previous) => {
                        const next = new Set(previous);
                        if (next.has(annotation.id)) next.delete(annotation.id);
                        else next.add(annotation.id);
                        return next;
                      })
                    }
                  >
                    <Sparkles size={12} />{" "}
                    {tutorMode === "demo" ? "INDIZIO DEMO" : "INDIZIO AI"} ·{" "}
                    {i + 1}
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Rimuovi indizio ${i + 1} dal foglio ${index + 1}`}
                    onClick={() => props.onRemove(annotation.id)}
                  >
                    <X size={14} />
                  </button>
                </div>
                {!collapsed.has(annotation.id) ? (
                  <>
                    <p>{annotation.text}</p>
                    {annotation.source ? (
                      <small>{annotation.source}</small>
                    ) : null}
                    <button
                      className="note-next"
                      disabled={props.busy}
                      onClick={() => {
                        props.onActivate();
                        props.onSelection(annotation.anchor);
                        props.onHelp(annotation.anchor);
                      }}
                    >
                      Un altro indizio <span aria-hidden="true">↗</span>
                    </button>
                  </>
                ) : null}
              </article>
            ))}
          </aside>
        ) : null}
      </div>
    </section>
  );
}
