import { z } from 'zod';
import { annotationSchema, uid, type Page, type Selection } from '../model';

export const tutorMode = import.meta.env.VITE_TUTOR_API_URL ? 'connected' : 'demo';
export interface TutorRequest {
  pageId: string;
  revision: number;
  image: string;
  selection: Selection | null;
  question: string;
  previousHints: string[];
}
export const tutorResponseSchema = z.object({
  pageId: z.string(), revision: z.number().int(), annotation: annotationSchema,
});
export type TutorResponse = z.infer<typeof tutorResponseSchema>;

export async function requestTutor(request: TutorRequest, page: Page, signal: AbortSignal): Promise<TutorResponse> {
  if (tutorMode === 'connected') {
    const response = await fetch(`${import.meta.env.VITE_TUTOR_API_URL.replace(/\/$/, '')}/tutor/help`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request), signal,
    });
    if (!response.ok) throw new Error('Il tutor non è disponibile. Il tuo lavoro è al sicuro: riprova tra poco.');
    const result = tutorResponseSchema.parse(await response.json());
    if (result.pageId !== request.pageId || result.revision !== request.revision) throw new Error('La risposta si riferisce a una versione diversa del foglio. Richiedi un nuovo aiuto.');
    const a = result.annotation.anchor;
    if (a.x < 0 || a.y < 0 || a.x + a.width > 794 || a.y + a.height > page.height) throw new Error('Il tutor ha indicato una zona fuori dal foglio. Riprova selezionando il passaggio.');
    return result;
  }
  // Deliberately scripted: never claim to have read or verified the student's work.
  await new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    const onAbort = () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', onAbort); resolve(); }, 650);
    signal.addEventListener('abort', onAbort, { once: true });
  });
  const hints = page.template === 'chain-rule'
    ? ['Esempio guidato: distingui la funzione esterna dalla funzione interna. Qual è la derivata di ciascuna?', 'Esempio guidato: poni u = x² + 1. Come combini la derivata di sin(u) con quella di u rispetto a x?']
    : ['Indizio dimostrativo: quale principio o regola giustifica il passaggio selezionato? Prova a scriverlo accanto.', 'Indizio dimostrativo: controlla le ipotesi del passaggio. Simboli, dominio e unità sono coerenti?'];
  return {
    pageId: request.pageId, revision: request.revision,
    annotation: {
      id: uid(), kind: 'question',
      anchor: request.selection ?? { x: 60, y: page.template ? 355 : 210, width: 420, height: 70 },
      text: hints[Math.min(request.previousHints.length, hints.length - 1)],
      source: 'Demo locale · suggerimento predefinito, nessuna analisi AI',
    },
  };
}
