import { newPage, PAGE_WIDTH, type Page } from '../model';

export async function importDocument(file: File, start: number): Promise<Page[]> {
  if (file.size > 20 * 1024 * 1024) throw new Error('Choose a file smaller than 20 MB.');
  const title = file.name.replace(/\.[^.]+$/, '');
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
    const task = pdfjs.getDocument({ data: await file.arrayBuffer() });
    try {
      const document = await task.promise;
      if (document.numPages > 20) throw new Error('Import a PDF with at most 20 pages.');
      const pages: Page[] = [];
      for (let i = 1; i <= document.numPages; i++) {
        const pdfPage = await document.getPage(i);
        const natural = pdfPage.getViewport({ scale: 1 });
        const height = Math.round(natural.height * PAGE_WIDTH / natural.width);
        if (height > 6000) throw new Error('A PDF page is too tall. Use a standard page format.');
        const viewport = pdfPage.getViewport({ scale: PAGE_WIDTH * 1.5 / natural.width });
        const canvas = window.document.createElement('canvas');
        canvas.width = Math.round(viewport.width); canvas.height = Math.round(viewport.height);
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not open this PDF.');
        await pdfPage.render({ canvasContext: context, viewport }).promise;
        pages.push({ ...newPage(start + i), title: `${title} · ${i}`, height, paper: 'plain', background: canvas.toDataURL('image/jpeg', 0.85) });
        canvas.width = 0; canvas.height = 0;
      }
      return pages;
    } finally { await task.destroy(); }
  }
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('You can import PDF, PNG, JPG or WebP.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = url; await image.decode();
    const height = Math.round(image.height * PAGE_WIDTH / image.width);
    if (height > 6000) throw new Error('This image is too tall. Crop it before importing.');
    const canvas = document.createElement('canvas'); canvas.width = PAGE_WIDTH * 1.5; canvas.height = height * 1.5;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not open this image.');
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return [{ ...newPage(start + 1), title, height, paper: 'plain', background: canvas.toDataURL('image/jpeg', 0.85) }];
  } finally { URL.revokeObjectURL(url); }
}
