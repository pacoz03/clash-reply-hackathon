import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export function NotebookPanel({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    closeRef.current?.focus();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, []);
  return (
    <section
      className="notebook-panel"
      aria-label={title}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <header className="panel-heading">
        <div>
          <span className="eyebrow">IN YOUR NOTEBOOK</span>
          <h2>{title}</h2>
        </div>
        <button
          ref={closeRef}
          className="icon-button"
          aria-label={`Close ${title.toLowerCase()}`}
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </header>
      <div className="panel-content">{children}</div>
    </section>
  );
}
