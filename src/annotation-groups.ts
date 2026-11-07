import type { Annotation, Selection } from "./model";

// Legacy notes remain readable without rewriting saved notebooks.
export function annotationGroupId(annotation: Annotation): string {
  const a = annotation.anchor;
  return annotation.groupId ?? `region:${a.x}:${a.y}:${a.width}:${a.height}`;
}

export function groupAnnotations(annotations: Annotation[]) {
  const groups = new Map<string, { id: string; anchor: Selection; annotations: Annotation[] }>();
  for (const annotation of annotations) {
    const id = annotationGroupId(annotation);
    const group = groups.get(id);
    if (group) group.annotations.push(annotation);
    else groups.set(id, { id, anchor: annotation.anchor, annotations: [annotation] });
  }
  return [...groups.values()];
}

export function findAnnotationGroup(annotations: Annotation[], region: Selection): string | undefined {
  // A slightly redrawn selection can refer to the same step, but adjacent steps stay separate.
  return groupAnnotations(annotations).find(({ anchor: a }) => {
    const intersection = Math.max(0, Math.min(a.x + a.width, region.x + region.width) - Math.max(a.x, region.x))
      * Math.max(0, Math.min(a.y + a.height, region.y + region.height) - Math.max(a.y, region.y));
    return intersection / (a.width * a.height + region.width * region.height - intersection) >= 0.7;
  })?.id;
}
