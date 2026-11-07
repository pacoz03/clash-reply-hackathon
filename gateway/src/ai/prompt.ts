import type { Selection } from '../schemas.js';

export interface PromptContext {
  question: string;
  selection: Selection | null;
  previousHints: string[];
}

export interface TutorPrompt {
  system: string;
  user: string;
}

/**
 * Regole pedagogiche (REQUISITI.md §5): indizi brevi e concreti, mai la
 * soluzione completa, progressivi, distinguere errore vs dubbio, dichiarare
 * incertezza, non affermare mai di aver verificato. Risposta in italiano.
 */
const SYSTEM = [
  'Sei Margine, un tutor universitario calmo, preciso e incoraggiante per esercizi di matematica e fisica.',
  'Analizzi una foto di una pagina del quaderno: la consegna e lo svolgimento a mano dello studente.',
  'Regole:',
  '- Dai un intervento breve e riferito a un passaggio concreto, mai la soluzione completa.',
  '- Se hai già dato indizi (vedi sotto), approfondisci o cambia angolo: non ripeterti.',
  '- Distingui un errore osservato da un dubbio di interpretazione. Se non leggi un simbolo, chiedi di confermarlo.',
  '- Se lo svolgimento non è leggibile o mancano dati, poni una domanda mirata senza concludere.',
  '- Non affermare mai di aver verificato o corretto il lavoro.',
  '- Cita una fonte del corso solo se la conosci con certezza; altrimenti ometti "source".',
  '- Rispondi solo in italiano, in poche parole.',
  'Formato: rispondi SOLO con un oggetto JSON valido, senza testo attorno, con le chiavi:',
  '- "kind": "hint" (un principio o un metodo da provare) oppure "question" (una domanda guida).',
  '- "text": il testo breve dell\'intervento (massimo 600 caratteri).',
  '- "source": opzionale, solo se verificato (es. "Dispensa, pagina 12").',
].join('\n');

export function buildPrompt({ question, selection, previousHints }: PromptContext): TutorPrompt {
  const parts: string[] = [];
  parts.push('L\'immagine allegata mostra la pagina del quaderno (consegna e svolgimento a mano dello studente).');
  if (selection) {
    const s = selection;
    parts.push(
      `Lo studente ha selezionato la regione (x=${Math.round(s.x)}, y=${Math.round(s.y)}, larghezza=${Math.round(s.width)}, altezza=${Math.round(s.height)}) su una pagina larga 794 unità. Concentrati su quella zona.`,
    );
  } else {
    parts.push('Lo studente non ha selezionato una regione: ragiona sull\'intera pagina.');
  }
  parts.push(`Domanda dello studente: "${question}"`);
  if (previousHints.length > 0) {
    parts.push(
      `Indizi già forniti (non ripetere, approfondisci): ${previousHints.map((h, i) => `[${i + 1}] ${h}`).join(' | ')}`,
    );
  }
  parts.push('Produce il JSON richiesto.');
  return { system: SYSTEM, user: parts.join('\n') };
}
