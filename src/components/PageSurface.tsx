import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { Eye, EyeOff, MessageCircle, PencilLine, Sparkles, Square, Volume2, X } from "lucide-react";
import { NotebookCanvas, type CanvasHandle } from "./NotebookCanvas";
import {
  PAGE_WIDTH,
  type Annotation,
  type Page,
  type Selection,
  type Stroke,
  type Tool,
} from "../model";
import { layoutNotes } from "../note-layout";
import { groupAnnotations } from "../annotation-groups";
import { tutorMode } from "../services/tutor";
import type { Material } from "../library";
import type { useNarration } from "../use-narration";
import { visualSpeech } from "../canvas-visual";

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
  onHelp: (region?: Selection | null, intent?: "hint" | "explain" | "check", groupId?: string, presentation?: "note" | "canvas") => void;
  narration: ReturnType<typeof useNarration>;
  onToggleGroup: (groupId: string) => void;
  onSource: (ref: NonNullable<Annotation["sourceRef"]>) => void;
  materials: Material[];
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
  const [exploring, setExploring] = useState<{ annotationId: string; elementId: string | null } | null>(null);
  const notesRef = useRef<HTMLElement>(null);
  const [heights, setHeights] = useState<Record<string, number>>({});
  const groups = groupAnnotations(page.annotations);
  const hiddenGroups = new Set(page.hiddenHintGroups ?? []);
  const visibleAnnotations = groups.filter((group) => !hiddenGroups.has(group.id)).flatMap((group) => group.annotations);
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
  }, [page.annotations, page.hiddenHintGroups, props.annotationsVisible, compact]);
  const notesLayout = layoutNotes(
    groups.map((group) => {
      const visual = compact ? group.annotations.reduce<Annotation["visual"]>((last, a) => a.visual && (!last || a.visual.frame.y > last.frame.y) ? a.visual : last, undefined) : undefined;
      return { ...group.annotations[0], id: group.id, ...(visual ? { anchor: { ...group.anchor, y: visual.frame.y + visual.frame.height + 220 / scale, height: 0 } } : {}) };
    }),
    scale,
    page.height,
    heights,
    compact,
    new Set(compact ? groups.filter((g) => g.annotations.some((a) => a.visual)).map((g) => g.id) : []),
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
      aria-label={`Page ${index + 1}: ${page.title}`}
      style={{ width: PAGE_WIDTH * scale }}
    >
      <div className="page-meta">
        <button onClick={props.onActivate}>
          PAGE {String(index + 1).padStart(2, "0")}
          <span>{page.title}</span>
        </button>
        <span>{page.background ? "Imported" : "Write freely"}</span>
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
            visibleAnnotations={visibleAnnotations}
            narration={props.narration.playing ?? exploring}
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
                  PAGE_WIDTH * scale - 280,
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
              Ask margin{tutorMode === "demo" ? <small>DEMO</small> : null}
            </button>
            <button className="context-draw" onClick={() => props.onHelp(undefined, "explain", undefined, "canvas")} disabled={props.busy}>
              <PencilLine size={15} /> Draw it
            </button>
            <button
              className="icon-button"
              aria-label="Add a question"
              onClick={props.onCompose}
            >
              <MessageCircle size={16} />
            </button>
            <button
              className="icon-button"
              aria-label="Clear selection"
              onClick={() => props.onSelection(null)}
            >
              <X size={14} />
            </button>
          </div>
        ) : null}
        {props.composer}
        {props.annotationsVisible ? groups.filter((g) => hiddenGroups.has(g.id)).map((g) => {
          const visual = g.annotations.find((a) => a.visual)?.visual;
          return visual ? <button key={g.id} className="sketch-restore" style={{ left: visual.frame.x * scale, top: visual.frame.y * scale }} onClick={() => props.onToggleGroup(g.id)}><Eye size={14} /> Show sketch · {g.annotations.length} {g.annotations.length === 1 ? "hint" : "hints"}</button> : null;
        }) : null}
        {props.annotationsVisible ? visibleAnnotations.filter((a) => a.visual).map((a) => {
          const visual = a.visual!, isPlaying = props.narration.playing?.annotationId === a.id;
          const segments = visualSpeech(visual);
          const focused = (isPlaying ? props.narration.playing : exploring)?.annotationId === a.id
            ? segments.find((s) => s.id === (isPlaying ? props.narration.playing : exploring)?.elementId) : undefined;
          return (
            <div key={a.id} className={`sketch-controls ${isPlaying ? "sketch-speaking" : ""}`} style={{ left: visual.frame.x * scale, top: (visual.frame.y + visual.frame.height) * scale, maxWidth: visual.frame.width * scale }} role="group" aria-label={`${a.mode === "demo" ? "Demo sketch" : "AI sketch"}: ${visual.drawing.title}`}>
              <button disabled={!props.narration.supported} aria-label={isPlaying ? "Stop explanation" : "Explain sketch aloud"} onClick={() => isPlaying ? props.narration.stop() : props.narration.play(a)}>
                {isPlaying ? <Square size={13} /> : <Volume2 size={15} />}{isPlaying ? props.narration.playing?.elementId ? "Stop" : "Preparing voice…" : "Explain aloud"}
              </button>
              {segments.length ? <button onClick={() => {
                props.narration.stop();
                const current = exploring?.annotationId === a.id ? segments.findIndex((s) => s.id === exploring.elementId) : -1;
                setExploring({ annotationId: a.id, elementId: segments[(current + 1) % segments.length].id });
              }}>Next detail</button> : null}
              <button onClick={() => props.onToggleGroup(groups.find((g) => g.annotations.some((note) => note.id === a.id))!.id)} aria-label="Hide this sketch group"><EyeOff size={14} /> Hide</button>
              <small>{a.mode === "demo" ? "Demo sketch" : "AI sketch · not to scale"} · OpenAI AI voice</small>
              {a.revision !== undefined && a.revision !== page.revision ? <small>Based on earlier writing</small> : null}
              {focused ? <span className="sketch-caption" role="status">{focused.text}</span> : null}
              {props.narration.error ? <span role="status" className="sketch-caption">{props.narration.error}</span> : null}
            </div>
          );
        }) : null}
        {props.annotationsVisible && page.annotations.length ? (
          <aside
            ref={notesRef}
            className="page-notes"
            aria-label={`Hints on page ${index + 1}`}
          >
            {!compact ? (
              <svg
                className="margin-connectors"
                width="24"
                height={Math.max(page.height * scale, notesLayout.bottom)}
                aria-hidden="true"
              >
                {groups.map((group, i) => {
                  if (hiddenGroups.has(group.id)) return null;
                  const anchorY =
                    (group.anchor.y + group.anchor.height / 2) *
                    scale;
                  const noteY = notesLayout.positions[i] + 24;
                  return (
                    <polyline
                      key={group.id}
                      points={`0,${anchorY} 8,${anchorY} 16,${noteY} 24,${noteY}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1"
                    />
                  );
                })}
              </svg>
            ) : null}
            {groups.map((group, groupIndex) => (
              <section
                className={`margin-note hint-group ${hiddenGroups.has(group.id) ? "hint-group-hidden" : ""}`}
                data-annotation-id={group.id}
                key={group.id}
                aria-label={`Hints for step ${groupIndex + 1}`}
                style={{ top: notesLayout.positions[groupIndex] }}
              >
                <button
                  className="hint-group-toggle"
                  aria-expanded={!hiddenGroups.has(group.id)}
                  aria-label={`${hiddenGroups.has(group.id) ? "Show" : "Hide"} ${group.annotations.length} hints for step ${groupIndex + 1}`}
                  onClick={() => props.onToggleGroup(group.id)}
                >
                  <span>Step {groupIndex + 1} <small>· {group.annotations.length} {group.annotations.length === 1 ? "hint" : "hints"}</small></span>
                  {hiddenGroups.has(group.id) ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
                {!hiddenGroups.has(group.id) ? group.annotations.map((annotation, i) => (
                  <article
                    className="hint-entry"
                    key={annotation.id}
                  >
                    <div className="note-heading">
                      <button
                        className="note-collapse"
                        aria-label={`${collapsed.has(annotation.id) ? "Expand" : "Collapse"} hint ${i + 1}`}
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
                        {annotation.mode === "demo" ||
                        annotation.source?.toLowerCase().includes("demo")
                          ? "DEMO HINT"
                          : annotation.mode === "connected"
                            ? "AI NOTE"
                            : "NOTE"}{" "}
                        · {i + 1}
                      </button>
                      <button
                        className="icon-button"
                        aria-label={`Remove hint ${i + 1} from page ${index + 1}`}
                        onClick={() => props.onRemove(annotation.id)}
                      >
                        <X size={14} />
                      </button>
                    </div>
                    {!collapsed.has(annotation.id) ? (
                      <>
                        <p>{annotation.text}</p>
                        <button className="note-next" disabled={!props.narration.supported} onClick={() => props.narration.playing?.annotationId === annotation.id ? props.narration.stop() : props.narration.play(annotation)}>
                          {props.narration.playing?.annotationId === annotation.id ? "Stop explanation" : "Explain aloud"} <Volume2 size={13} />
                        </button>
                        {annotation.visual ? <button className="note-next" onClick={() => {
                          const viewport = props.viewportRef.current, surface = sectionRef.current;
                          if (viewport && surface) viewport.scrollTo({ top: viewport.scrollTop + surface.getBoundingClientRect().top - viewport.getBoundingClientRect().top + 35 + annotation.visual!.frame.y * scale - 70, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
                        }}>View sketch on page <PencilLine size={13} /></button> : null}
                        {annotation.revision !== undefined &&
                        annotation.revision !== page.revision ? (
                          <small className="earlier-note">
                            Based on earlier writing
                          </small>
                        ) : null}
                        {annotation.sourceRef ? (
                          <button
                            className="note-source"
                            disabled={
                              !props.materials.some(
                                (m) => m.id === annotation.sourceRef?.materialId,
                              )
                            }
                            onClick={() => props.onSource(annotation.sourceRef!)}
                          >
                            {props.materials.find(
                              (m) => m.id === annotation.sourceRef?.materialId,
                            )?.name ?? "Source no longer available"}{" "}
                            · p. {annotation.sourceRef.page} ↗
                          </button>
                        ) : annotation.source ? (
                          <small>{annotation.source}</small>
                        ) : null}
                        <button
                          className="note-next"
                          disabled={props.busy}
                          onClick={() => {
                            props.onActivate();
                            props.onSelection(annotation.anchor);
                            props.onHelp(annotation.anchor, "hint", group.id);
                          }}
                        >
                          Another hint <span aria-hidden="true">↗</span>
                        </button>
                        <button
                          className="note-next"
                          disabled={props.busy}
                          onClick={() => {
                            props.onActivate();
                            props.onHelp(annotation.anchor, "check", group.id);
                          }}
                        >
                          Check my update <span aria-hidden="true">↗</span>
                        </button>
                      </>
                    ) : null}
                  </article>
                )) : null}
              </section>
            ))}
          </aside>
        ) : null}
      </div>
    </section>
  );
}
