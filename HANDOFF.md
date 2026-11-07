# Handoff — Margine

Aggiornato: 7 novembre 2026, fuso Europe/Rome.

## Obiettivo e origine

Progetto per Reply Student Tech Clash 2026, challenge AI on Campus:
`https://studentclash.reply.com/challenges/AI_on_Campus_IT.html`.

Il problema deve riguardare apprendimento, insegnamento o valutazione. Amministrazione e logistica sono fuori ambito. Level 1 richiede problema reale e soluzione progettata. Level 2 richiede un agente funzionante che usi materiali universitari reali, svolga almeno un'azione oltre alla risposta e mantenga confini pedagogici. Sono consentiti coding e no-code.

Nel testo fornito dall'utente, il percorso no-code richiede sezioni ROLE, GOAL, KNOWLEDGE, RULES, PROCEDURE, MEMORY; configurazione e scelte, descrizione di materiali e azioni, esempi inclusa una situazione limite, screenshot/export. Video consigliato. I dettagli del percorso coding e la sezione Evaluation non sono stati forniti; non inventarne vincoli o punteggi. La pagina specifica non era accessibile tramite il tool web durante l'analisi iniziale.

Level 3 è facoltativo: multi-agente, knowledge graph, campagna di lancio. Il testo disponibile sul multi-agente descrive Problem Identifier → Problem Brief comune → almeno due Solver indipendenti → confronto delle proposte → chiarimenti → controllo umano. È un flusso di scoperta e proposta di soluzioni, non automaticamente un team di tutor. Non è un requisito del prototipo attuale.

## Decisioni emerse nella conversazione

- Idea dell'utente: canvas notebook/copilot per esercizi su iPad, con annotazioni direttamente sopra o accanto al lavoro scritto. Elimina screenshot manuale → invio in chat → spiegazione separata → ritorno al quaderno.
- Il problema educativo è mantenere spiegazione e ragionamento collegati, aiutando a capire dove uno svolgimento si interrompe e a proseguire autonomamente.
- Ambito finale scelto dall'utente: **qualsiasi esercizio matematico/fisico**. Una precedente scelta di derivate/integrali è stata ampliata; non restringere il prodotto ad Analisi.
- Input: consegna, scrittura a mano, formule, unità, schemi e grafici. Libertà di input non equivale a garanzia universale di correttezza.
- Assistenza su richiesta con selezione facoltativa e contesto della pagina. Il tutor propone indizi progressivi, attende il nuovo tentativo e rivaluta.
- Conservare annotazioni AI separatamente dai tratti. Chiedere chiarimenti sui simboli ambigui e non bocciare metodi alternativi validi.
- Stile esplicitamente scelto: **quaderno minimale, carta chiara, inchiostro scuro, pochi comandi**.
- Nome provvisorio introdotto nel boilerplate: **Margine**. Interfaccia italiana, palette verde inchiostro/salvia, font DM Sans, Lora e Caveat.
- Web app proposta per l'hackathon. SwiftUI/PencilKit/PDFKit discussi come alternativa nativa se la qualità Apple Pencil diventasse prioritaria; non implementati.
- AI: proposta preferita SDK diretto e orchestrazione leggera custom, un tutor con strumenti. Python/FastAPI, Pydantic, SQLite e SymPy dove applicabile. Agno valutato, ma nessun framework agentico o backend è stato creato. Nessun addestramento, fine-tuning o modello specifico concordato.

## Stato implementato

Boilerplate completo del frontend, non dell'intero prodotto descritto in `REQUISITI.md`:

- React 19 + TypeScript + Vite 6; canvas Konva/react-konva; Zod; PDF.js lazy; IndexedDB; Vitest.
- Pagine multiple e titolo quaderno modificabile.
- Penna con tre colori/tre spessori; gomma; undo/redo per pagina; svuotamento reversibile dei tratti.
- Selezione rettangolare; zoom a pulsanti; trascinamento; modalità Solo penna con dito per spostare.
- Carta puntinata, a righe o bianca.
- Importazione PDF multipagina e PNG/JPEG/WebP, limiti 20 MB e 20 pagine PDF.
- Salvataggio automatico IndexedDB serializzato; recupero dopo ricaricamento.
- Annotazioni AI visualizzabili/nascondibili/rimuovibili su livello distinto.
- Esportazione PNG della consegna e dei tratti senza annotazioni.
- Tutor demo locale, chiaramente dichiarato: suggerimenti predefiniti, nessuna analisi AI e nessun invio a provider.
- API adapter pronto, annullamento, timeout e controllo pagina/revisione delle risposte.
- UI responsive con sidebar e pannello tutor richiudibili sui formati compatti.

Primo foglio: esempio illustrativo sulla derivata di `sin(x² + 1)`, con passaggio volutamente incompleto. Non è materiale universitario autentico.

## Mappa dei file

| File | Responsabilità |
| --- | --- |
| `src/App.tsx` | Shell, toolbar, navigazione, persistenza, richieste tutor |
| `src/model.ts` | Schema Zod/versione 1, tipi, reducer, cronologia per pagina |
| `src/components/NotebookCanvas.tsx` | Livelli del foglio, Pointer Events, snapshot |
| `src/components/PageThumbnail.tsx` | Anteprime per la navigazione |
| `src/services/storage.ts` | IndexedDB e coda di salvataggio |
| `src/services/import.ts` | Rasterizzazione PDF e immagini |
| `src/services/tutor.ts` | Modalità demo, contratto API e validazione risposta |
| `src/model.test.ts` | Test di reducer, cronologia e selezioni |
| `src/styles.css` | Tema e layout responsive |
| `README.md` | Avvio, uso, contratto API e limiti |
| `REQUISITI.md` | Specifica di prodotto v0.1, più ampia del boilerplate |
| `.impeccable.md` | Contesto di design confermato |
| `docs/VERIFICA.md` | Evidenze dei controlli eseguiti |
| `docs/notebook-preview.png` | Screenshot locale della demo verificata |

## Contratto AI da mantenere

`VITE_TUTOR_API_URL` vuoto → demo. Se impostato, il frontend chiama `POST <origine>/tutor/help`. Il backend dovrà configurare CORS e conservare le chiavi sul server.

Richiesta: `pageId`, `revision`, `image` PNG data URL (consegna + tratti, senza overlay), `selection` rettangolo o null, `question`, `previousHints`.

Risposta: stessi `pageId` e `revision`, più `annotation` con `id`, `kind` (`hint` o `question`), `anchor` (`x`, `y`, `width`, `height`), `text` e `source` opzionale verificata. Gli schemi esatti sono in `model.ts` e `services/tutor.ts`; esempi nel README.

La pagina logica è larga 794 unità, altezza variabile. Il frontend valida schema, limiti della regione e revisione; l'app rifiuta risposte se lo studente ha modificato lo svolgimento durante la richiesta.

## Verifiche già eseguite

- Ultima build TypeScript/Vite del boilerplate riuscita.
- Sette test Vitest passati: cronologia isolata per pagina, redo invalidato dopo nuovo tratto, clear undoabile, risposte obsolete, rimozione annotazione indipendente dai tratti, normalizzazione/clamp selezione, tap accidentali.
- Browser: scrittura, clear/undo/redo, pagine, selezione, indizi demo e loro rimozione, recupero dopo reload.
- Importazione di un PDF sintetico di due pagine con formule riuscita; fixture temporanea `/tmp/margine-import-test.pdf`, non necessaria per avviare il progetto.
- Controllo visivo layout compatto e viewport 1024×768; nessun errore/warning in console nel flusso osservato.
- Il browser locale usato per QA contiene anche pagine sintetiche; i nuovi browser ricevono lo stato iniziale.

Non verificati: hardware Apple Pencil, palm rejection reale, backend AI, correttezza matematica generata, hosting pubblico, uso offline dopo chiusura.

## Limiti e lavoro ancora da fare

- Nessun backend FastAPI né chiamata a un modello reale.
- Nessun materiale universitario reale associato; il requisito di grounding della challenge resta da realizzare.
- Nessun RAG, estrazione testuale o gestione delle dispense. I PDF sono immagini di sfondo rasterizzate.
- Nessuna memoria didattica delle difficoltà: le annotazioni sono persistenti e vengono riutilizzate come precedenti indizi, ma non esiste un learner model.
- Nessuna verifica simbolica/fisica implementata. I pulsanti di tipo d'aiuto inviano l'intento al servizio; il mock resta predefinito.
- Nessun pinch zoom, pressione penna o gestione avanzata del palmo. Solo penna è un filtro di input con panning al dito.
- Undo/redo rimane nella sessione; non viene ripristinato dal database. Vengono conservati i tratti finali, non l'intera cronologia.
- Miniature indicative: non riproducono la gomma o gli overlay AI.
- Nessun account, sincronizzazione, condivisione live o dashboard docente. Ogni browser/origine ha un quaderno locale distinto.
- Mancano gestione completa di eliminazione quaderni e dati, autenticazione e politiche server per un rilascio pubblico.
- La modalità demo non consente di dichiarare completato il Level 2 della challenge.

Prossime attività sensate, da coordinare con le richieste dell'utente: provare su iPad reale; implementare backend conforme all'adapter; confrontare modelli vision su scrittura reale; collegare fonti del corso; aggiungere memoria delle difficoltà e verifiche applicabili; preparare demo con casi di errore, ambiguità e confine pedagogico. Non sono attività già completate né un'autorizzazione implicita a costruire tutte le estensioni.

## Avvio e rete

```sh
npm install
npm run dev
npm test
npm run build
```

Node di riferimento 22.13.1. Vite ascolta su `0.0.0.0:5173` con porta fissa. Durante la sessione è stato avviato un server locale e comunicato l'indirizzo `http://172.21.7.26:5173` (en0). È un indirizzo osservato, non statico: verificare IP e processo prima di riutilizzarlo.

L'utente vuole accedere anche da altri PC: stessa rete, IP del Mac e porta 5173; `localhost` sull'altro computer indica quel computer. I quaderni salvati non si trasferiscono tra browser o dispositivi.

## Git e stato della consegna

Remote origin: `https://github.com/pacoz03/clash-reply-hackathon.git`.

- Il repository remoto era vuoto; creato e pubblicato commit iniziale `8ca06f8` (`Initial notebook boilerplate`) su `main`.
- Su richiesta esplicita creati e pubblicati `gian`, `andre`, `pas`, `chri`, `dev`, inizialmente tutti allo stesso commit.
- All'inizio di questo aggiornamento il checkout corrente risulta **`gian`**, collegato a `origin/gian`, e il worktree era pulito. Non presumere che sia ancora `main`.
- L'utente ha chiesto di pushare il lavoro su origin. I file di contesto vengono consegnati sul branch attivo, senza merge impliciti sugli altri branch.
- In una verifica precedente `gh auth status` segnalava un token non valido, ma `git push` HTTPS è riuscito. Non presumere che la CLI `gh` e Git usino necessariamente la stessa autenticazione.
- Non fare force push, non riscrivere la storia e non sovrascrivere il lavoro dei compagni.

## Ultima richiesta dell'utente

«salva tutto il contesto in handoff ed agent md». Questa documentazione e `AGENTS.md` ne sono la consegna. Non ci sono altri sviluppi funzionali richiesti in sospeso in questo momento.
