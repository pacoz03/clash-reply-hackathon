import { useState } from "react";
import { ArrowRight, History } from "lucide-react";
import type { Notebook, Observation } from "../model";
import { NotebookPanel } from "./NotebookPanel";

const labels: Record<Observation["outcome"], string> = {
  "needs-work": "Keep exploring",
  progress: "Progress observed",
  uncertain: "Needs clarification",
  demo: "Demo interaction",
};
export function SessionPanel({
  notebook,
  busy,
  onClose,
  onEdit,
  onClear,
  onReview,
}: {
  notebook: Notebook;
  busy: boolean;
  onClose: () => void;
  onEdit: (id: string, summary: string) => void;
  onClear: () => void;
  onReview: (pageId: string) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null),
    [summary, setSummary] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const observations = notebook.observations ?? [];
  return (
    <NotebookPanel title="Learning notes" onClose={onClose}>
      <p className="panel-intro">
        A record of your attempts and the help you received. These observations
        can change as you work.
      </p>
      {observations.length ? (
        <>
          <ol className="session-timeline">
            {[...observations].reverse().map((o) => {
              const page = notebook.pages.find((p) => p.id === o.pageId);
              const stale = page?.revision !== o.revision;
              return (
                <li key={o.id} className={`session-event outcome-${o.outcome}`}>
                  <div className="session-event-meta">
                    <span>{labels[o.outcome]}</span>
                    <time dateTime={new Date(o.createdAt).toISOString()}>
                      {new Intl.DateTimeFormat("en", {
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(o.createdAt)}
                    </time>
                  </div>
                  <h3>{page?.title ?? "Notebook page"}</h3>
                  {editing === o.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (summary.trim()) {
                          onEdit(o.id, summary);
                          setEditing(null);
                        }
                      }}
                    >
                      <label htmlFor="edit-observation">Your observation</label>
                      <textarea
                        id="edit-observation"
                        value={summary}
                        maxLength={300}
                        onChange={(e) => setSummary(e.target.value)}
                        autoFocus
                      />
                      <div className="session-edit-actions">
                        <button
                          className="text-button"
                          disabled={!summary.trim()}
                        >
                          Save
                        </button>
                        <button
                          className="text-button"
                          type="button"
                          onClick={() => setEditing(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <p>{o.summary}</p>
                      <button
                        className="text-button"
                        onClick={() => {
                          setEditing(o.id);
                          setSummary(o.summary);
                        }}
                      >
                        Edit observation
                      </button>
                    </>
                  )}
                  <details>
                    <summary>Help received</summary>
                    <p>{o.hint}</p>
                  </details>
                  <small>
                    {o.mode === "demo"
                      ? "Scripted demo · no AI assessment"
                      : stale
                        ? "Based on an earlier version of your writing"
                        : "Based on this version of your writing"}
                  </small>
                  {page ? (
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() => onReview(page.id)}
                    >
                      Review latest writing <ArrowRight size={14} />
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ol>
          {confirmClear ? (
            <div className="clear-learning">
              <p>Clear learning notes? Your pages and annotations will stay.</p>
              <button
                className="text-button"
                onClick={() => {
                  onClear();
                  setConfirmClear(false);
                }}
              >
                Clear notes
              </button>
              <button
                className="text-button"
                onClick={() => setConfirmClear(false)}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              className="text-button"
              onClick={() => setConfirmClear(true)}
            >
              Clear learning notes
            </button>
          )}
        </>
      ) : (
        <div className="panel-empty">
          <History size={30} strokeWidth={1.2} />
          <h3>Your next attempt starts here.</h3>
          <p>
            Ask for a hint, try again, and review the change. A short
            observation will appear here.
          </p>
        </div>
      )}
      <p className="panel-footnote">
        Stored with this notebook on your device. Deleting the notebook also
        deletes these observations.
      </p>
    </NotebookPanel>
  );
}
