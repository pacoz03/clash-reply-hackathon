import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  FileUp,
  LoaderCircle,
} from "lucide-react";
import type { Material } from "../library";
import { previewMaterial } from "../services/materials";
import { NotebookPanel } from "./NotebookPanel";

export interface SourceView {
  materialId: string;
  page: number;
  quote?: string;
}
interface Props {
  materials: Material[];
  attachedIds: string[];
  indexing: string | null;
  sourceView: SourceView | null;
  onAttach: (material: Material, attached: boolean) => void;
  onUpload: (file: File) => void;
  onClose: () => void;
  uploading: boolean;
}
export function CourseMaterialPanel(props: Props) {
  const [view, setView] = useState<SourceView | null>(props.sourceView);
  const [preview, setPreview] = useState<{
    image: string;
    total: number;
  } | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const material = props.materials.find((m) => m.id === view?.materialId);
  useEffect(() => {
    setView(props.sourceView);
  }, [props.sourceView]);
  useEffect(() => {
    setPreview(null);
    setError("");
    if (!material || !view) return;
    let alive = true,
      objectUrl: string | undefined;
    previewMaterial(material, view.page)
      .then((result) => {
        if (result.image.startsWith("blob:")) objectUrl = result.image;
        if (alive) setPreview(result);
        else if (objectUrl) URL.revokeObjectURL(objectUrl);
      })
      .catch(() => {
        if (alive)
          setError("Couldn't preview this page. Try reopening the document.");
      });
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [material?.id, view?.page]);
  return (
    <NotebookPanel title="Course material" onClose={props.onClose}>
      {material && view ? (
        <>
          <button className="text-button" onClick={() => setView(null)}>
            <ArrowLeft size={16} /> All material
          </button>
          <h3 className="source-title">{material.name}</h3>
          <div className="source-navigation">
            <button
              className="icon-button"
              aria-label="Previous source page"
              disabled={view.page <= 1 || !preview}
              onClick={() =>
                setView({ ...view, page: view.page - 1, quote: undefined })
              }
            >
              <ArrowLeft size={17} />
            </button>
            <span>
              Page {view.page}
              {preview ? ` of ${preview.total}` : ""}
            </span>
            <button
              className="icon-button"
              aria-label="Next source page"
              disabled={!preview || view.page >= preview.total}
              onClick={() =>
                setView({ ...view, page: view.page + 1, quote: undefined })
              }
            >
              <ArrowRight size={17} />
            </button>
          </div>
          {error ? (
            <p role="alert">{error}</p>
          ) : preview ? (
            <img
              className="source-preview"
              src={preview.image}
              alt={`${material.name}, page ${view.page}`}
            />
          ) : (
            <p className="panel-status" role="status">
              <LoaderCircle size={17} className="spin" /> Opening page…
            </p>
          )}
          {view.quote ? (
            <blockquote className="source-quote">
              <span className="eyebrow">REFERENCED PASSAGE</span>
              <p>{view.quote}</p>
            </blockquote>
          ) : null}
          <label className="attach-material">
            <input
              type="checkbox"
              checked={props.attachedIds.includes(material.id)}
              disabled={
                !!props.indexing ||
                material.type !== "application/pdf" ||
                (!props.attachedIds.includes(material.id) &&
                  props.attachedIds.length >= 6)
              }
              onChange={(e) => props.onAttach(material, e.target.checked)}
            />
            Use this document for tutor requests
          </label>
        </>
      ) : (
        <>
          <p className="panel-intro">
            Choose the material margin can use when you ask for help. Up to six
            documents per notebook.
          </p>
          <button
            className="button button-outline"
            disabled={props.uploading}
            onClick={() => fileRef.current?.click()}
          >
            <FileUp size={16} />{" "}
            {props.uploading ? "Adding material…" : "Add course material"}
          </button>
          {props.materials.length ? (
            <ul className="course-material-list">
              {props.materials.map((m) => {
                const attached = props.attachedIds.includes(m.id);
                return (
                  <li key={m.id}>
                    <button
                      className="material-preview-link"
                      onClick={() => setView({ materialId: m.id, page: 1 })}
                    >
                      <FileText size={20} />
                      <span>
                        <strong>{m.name}</strong>
                        <small>
                          {m.type === "application/pdf" ? "PDF" : "Image"}
                          {m.textPages ? ` · ${m.textPages.length} pages` : ""}
                        </small>
                      </span>
                      <ArrowRight size={16} />
                    </button>
                    <label className="attach-material">
                      <input
                        type="checkbox"
                        aria-label={`Use ${m.name} for tutor requests`}
                        checked={attached}
                        disabled={
                          !!props.indexing ||
                          m.type !== "application/pdf" ||
                          (!attached && props.attachedIds.length >= 6)
                        }
                        onChange={(e) => props.onAttach(m, e.target.checked)}
                      />
                      {props.indexing === m.id
                        ? "Reading document…"
                        : attached
                          ? "Used for tutor requests"
                          : "Use for tutor requests"}
                    </label>
                    {m.textPages && !m.textPages.some((text) => text.trim()) ? (
                      <small className="material-explanation">
                        No searchable text found. You can still view this file
                        or import it as an exercise.
                      </small>
                    ) : null}
                    {m.type !== "application/pdf" ? (
                      <small className="material-explanation">
                        View this image here, or import it as an exercise from
                        your library.
                      </small>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="panel-empty">
              <FileText size={30} strokeWidth={1.2} />
              <h3>Bring your course along.</h3>
              <p>
                Add lecture notes or a handout. References will open at the page
                used by the tutor.
              </p>
            </div>
          )}
          <p className="panel-footnote">
            Files stay on this device. Relevant text excerpts from selected PDFs
            accompany your page only when you ask for help.
          </p>
        </>
      )}
      <input
        ref={fileRef}
        hidden
        type="file"
        accept="application/pdf,image/png,image/jpeg,image/webp"
        onChange={(e) => {
          if (e.target.files?.[0]) props.onUpload(e.target.files[0]);
          e.target.value = "";
        }}
      />
    </NotebookPanel>
  );
}
