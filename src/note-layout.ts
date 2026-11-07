import type { Annotation } from "./model";
// Keep the anchor in page coordinates; only the note layout uses screen pixels.
export function layoutNotes(
  annotations: Annotation[],
  scale: number,
  pageHeight: number,
  heights: Record<string, number>,
  compact: boolean,
  allowOverflow: Set<string> = new Set(),
) {
  let bottom = 0;
  const positions = annotations.map((annotation) => {
    const height = heights[annotation.id] ?? 260;
    const desired =
      (annotation.anchor.y + (compact ? annotation.anchor.height : 0)) * scale +
      (compact ? 14 : 0);
    const top = Math.max(
      12,
      allowOverflow.has(annotation.id) ? desired : Math.min(pageHeight * scale - height - 12, desired),
      bottom ? bottom + 12 : 0,
    );
    bottom = top + height;
    return top;
  });
  return { positions, bottom };
}
