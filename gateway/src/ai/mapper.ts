import { modelOutputSchema, type Annotation, type Selection, type TutorRequest } from '../schemas.js';
import { uid } from '../util.js';

/** Regione di ancoraggio quando lo studente non ha selezionato nulla. */
function defaultAnchor(): Selection {
  return { x: 60, y: 60, width: 620, height: 80 };
}

/** Estrae il primo oggetto JSON dal testo del modello, tollerando recinzioni. */
function extractJson(raw: string): string {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) return text.slice(start, end + 1);
  return text;
}

/**
 * Traduce il testo (JSON) del modello nell'annotazione che il frontend attende.
 * - id: generato dal gateway (mai dal modello).
 * - anchor: la selezione dello studente, o una regione di default se null.
 * - text: troncato a 600 caratteri.
 * Se l'output non è valido, degrada a una domanda di chiarimento (R12).
 */
export function mapModelToAnnotation(raw: string, request: TutorRequest): Annotation {
  const anchor: Selection = request.selection ?? defaultAnchor();

  let output: { kind: 'hint' | 'question'; text: string; source?: string } | null = null;
  try {
    const parsed = modelOutputSchema.safeParse(JSON.parse(extractJson(raw)));
    if (parsed.success) output = parsed.data;
  } catch {
    output = null;
  }

  if (!output) {
    return {
      id: uid(),
      anchor,
      kind: 'question',
      text: 'Non riesco a leggere bene questo passaggio. Puoi conferirmi un simbolo o una riga che non mi è chiara?',
    };
  }

  return {
    id: uid(),
    anchor,
    kind: output.kind,
    text: output.text.slice(0, 600),
    ...(output.source ? { source: output.source } : {}),
  };
}
