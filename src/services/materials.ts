import type { Material } from "../library";
import { loadMaterial } from "./storage";

export interface SourceExcerpt {
  materialId: string;
  name: string;
  page: number;
  text: string;
}

async function openPdf(blob: Blob) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  return pdfjs.getDocument({
    data: await blob.arrayBuffer(),
    isEvalSupported: false,
  });
}

export async function extractMaterialText(
  material: Material,
): Promise<string[]> {
  if (material.type !== "application/pdf") return [];
  const task = await openPdf(await loadMaterial(material.id));
  try {
    const pdf = await task.promise;
    if (pdf.numPages > 100)
      throw new Error(
        "Attach a PDF with at most 100 pages, or split it into chapters.",
      );
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      pages.push(
        content.items
          .map((item) =>
            "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : "",
          )
          .join("")
          .slice(0, 30000),
      );
      page.cleanup();
    }
    return pages;
  } finally {
    await task.destroy();
  }
}

export async function previewMaterial(
  material: Material,
  pageNumber: number,
): Promise<{ image: string; total: number }> {
  const blob = await loadMaterial(material.id);
  if (material.type !== "application/pdf")
    return { image: URL.createObjectURL(blob), total: 1 };
  const task = await openPdf(blob);
  try {
    const pdf = await task.promise;
    const page = await pdf.getPage(
      Math.min(pdf.numPages, Math.max(1, pageNumber)),
    );
    const natural = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({
      scale: Math.min(2, 900 / natural.width),
    });
    if (viewport.height > 10000)
      throw new Error(
        "This page is too tall to preview. Download the original instead.",
      );
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser cannot preview the document.");
    await page.render({ canvasContext: context, viewport }).promise;
    const image = canvas.toDataURL("image/png");
    canvas.width = 0;
    canvas.height = 0;
    return { image, total: pdf.numPages };
  } finally {
    await task.destroy();
  }
}

// Small local lexical retrieval: only explicitly attached materials are considered.
// The original document remains local; a bounded set of page excerpts is sent per request.
export function selectSourceExcerpts(
  materials: Material[],
  query: string,
): SourceExcerpt[] {
  const terms = [
    ...new Set(query.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []),
  ];
  const candidates: (SourceExcerpt & { score: number; order: number })[] = [];
  for (const material of materials.slice(0, 6)) {
    material.textPages?.forEach((text, index) => {
      for (let offset = 0; offset < text.length; offset += 2400) {
        const chunk = text.slice(offset, offset + 2800).trim();
        if (!chunk) continue;
        const lower = chunk.toLowerCase();
        const score = terms.reduce(
          (sum, term) => sum + (lower.includes(term) ? 1 : 0),
          0,
        );
        candidates.push({
          materialId: material.id,
          name: material.name,
          page: index + 1,
          text: chunk,
          score,
          order: candidates.length,
        });
      }
    });
  }
  return candidates
    .sort((a, b) => b.score - a.score || a.page - b.page || a.order - b.order)
    .slice(0, 8)
    .map(({ materialId, name, page, text }) => ({
      materialId,
      name,
      page,
      text,
    }));
}

export function citationMatches(
  excerpts: SourceExcerpt[],
  ref: { materialId: string; page: number; quote: string },
) {
  const normalize = (text: string) =>
    text.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
  const quote = normalize(ref.quote);
  return (
    quote.length >= 12 &&
    excerpts.some(
      (e) =>
        e.materialId === ref.materialId &&
        e.page === ref.page &&
        normalize(e.text).includes(quote),
    )
  );
}
