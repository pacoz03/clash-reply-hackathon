# Handoff — margin

Aggiornamento corrente: 7 novembre 2026, Europe/Rome. Questo aggiornamento prevale sul contesto storico sotto riportato.

## Configurazione e prima chiamata reale a GPT-6.1 Terra

L'utente ha scelto esplicitamente `gpt-6.1-terra` e autorizzato l'uso della propria
chiave. Configurati solo i file locali ignorati da Git `backend/.env` e `.env.local`
(permessi 600), con modello server `gpt-6.1-terra` e frontend `/api`. Nessun segreto
è aggiunto ai file tracciati. Il codice continua a richiedere chiave e modello
espliciti: non è introdotto un modello di fallback.

Avviato il backend Python su `127.0.0.1:8000` usando il virtualenv disponibile
in `/tmp/margin-backend-venv`; frontend Vite già attivo sulla porta 5173.
Verificati health diretto e tramite `/api/health`, configurazione frontend `/api`
e una richiesta AI reale con `gateway/Component-of-equation.png` (equazione
sintetica stampata `5x - 20 = 5`). HTTP 200 in circa 4,61 secondi, annotazione
inglese, regione interna alla pagina, osservazione strutturata, indizio sul primo
passaggio senza soluzione completa. Non sono stati inviati quaderni dell'utente.

Questa prova supera la precedente assenza di chiamate AI reali ma non costituisce
un confronto di modelli o una validazione su grafia, materiale universitario,
nuovi tentativi e casi limite. I blocchi del gateway TypeScript restano invariati:
il percorso utilizzato è il backend Python. Configurazione locale e processo
attivo non sono distribuiti dal push; su un altro computer occorre configurarli.

## Analisi di chri e branch secondario di merge

Su richiesta dell'utente creato `codex/backup-gian-merge-chri` dalla base pulita
`gian` (`fe023f7`) e preparato il merge di `origin/chri` (`a4cd7b8`) dopo fetch.
`gian` e `chri` non sono modificati. Unico conflitto: `.env.example`, risolto
mantenendo demo esplicita e backend Python selezionabile con `/api`.

Importati gateway TypeScript/Fastify e piano storico; nessun codice frontend,
schema persistito o configurazione locale con credenziali modificato. Il gateway
è sperimentale e non pronto all'uso: importa due moduli `src/data/` assenti dal
commit e ignora i campi correnti per memoria, fonti, intenti e altezza pagina.
La compilazione gateway fallisce inoltre con TS2339 sul tipo della risposta SDK
in `src/ai/provider.ts:77`; confermati anche i quattro TS2307 per i moduli assenti.
Il backend Python resta il percorso attuale. Non sono state introdotte SQLite,
migrazioni o implementazioni sostitutive del lavoro del compagno.

Analisi, rischi, conflitto risolto e passi di integrazione funzionale in
`docs/MERGE-CHRI.md`. Verificati 28 test frontend, build e 12 test Python con il
virtualenv già disponibile in `/tmp/margin-backend-venv`. Nessuna chiamata AI
reale; qualità dei modelli e Apple Pencil restano non verificate.

## Implementazione delle cinque feature concordate

L'utente ha approvato il brand `margin`, UI in inglese e le cinque feature: quaderni/importazione, scrittura, tutor contestuale, nuovo tentativo/memoria, dispense/fonti. Ha chiesto di analizzare prima il codice esistente. Branch attivo osservato: `gian`. La cartella `output/` contiene mockup esplorativi: il commit locale `1cbaea8`, comparso durante il lavoro, li include insieme all’implementazione. Il commit è preservato; le immagini non sono usate come interfaccia dal frontend.

La base già implementava biblioteca per materia, materiali originali, pagine continue, selezione e aiuti nel margine. Queste scelte sono preservate: nessuna sidebar tutor fissa ripristinata dai mockup.

Aggiunti:
- Branding margin, payoff inglese, testi e messaggi UI inglesi. Database conserva il nome `margine-notebook` per compatibilità e non traduce contenuti dell'utente già salvati.
- Intenti hint/explain/check distinti. Note legate alla revisione mostrano quando la scrittura è cambiata. Le note demo mantengono la propria provenienza anche se cambia la configurazione del tutor.
- Osservazioni atomiche con la risposta corrente; Learning notes modificabile e cancellabile separatamente dai tratti; contesto limitato al quaderno/pagina. Risposte obsolete non scrivono né indizi né memoria.
- Allegati selezionati per quaderno, estrazione testo PDF locale, recupero lessicale limitato, lettore paginato di PDF/immagini. Citazioni strutturate controllate per documento, pagina e testo sia server sia client; apertura della fonte alla pagina citata.
- Backend FastAPI stateless in backend/app.py: image input e Structured Outputs via SDK OpenAI diretto, CORS espliciti, limiti input, ancoraggio alla selezione e istruzioni pedagogiche. Nessuna chiave e nessun modello di default. Il frontend resta demo salvo configurazione esplicita.
- Download tramite Blob URL, link temporaneamente nel DOM e revoca differita.

Campi aggiuntivi opzionali degli schemi versione 1; IndexedDB resta versione 2. Contratto backend compatibile con i campi precedenti ed esteso con pageHeight, notebookId, intent, observations e sources. Configurazione in README.md; direzione visiva in DESIGN.md.

## Limiti da mantenere espliciti

Non è stata eseguita una chiamata a un modello reale: manca OPENAI_API_KEY e non è stato selezionato OPENAI_MODEL. La demo non legge né verifica il foglio e non produce esiti di progresso AI. Prima della demo della challenge servono modelli confrontati su scrittura reale, materiale universitario autorizzato e controlli umani sui risultati.

Fonti: massimo sei documenti selezionati, PDF testuali fino a 100 pagine, otto estratti di 2.800 caratteri per richiesta. Nessun OCR o retrieval vettoriale; la ricerca usa titolo, domanda e aiuti precedenti, quindi può non trovare il materiale pertinente. Le immagini restano consultabili e importabili come esercizi. La validazione della citazione prova la corrispondenza testuale, non la correttezza matematica o la pertinenza.

Nessuna verifica simbolica, account, sync, autenticazione pubblica, pinch zoom o palm rejection avanzata. I pannelli sono temporanei e richiudibili. Apple Pencil va provata su hardware reale. Il backend non conserva pagine o conversazioni; store=False non sostituisce una politica sulla conservazione presso il provider.

Verificati 28 test frontend, 12 backend, build e flusso browser con export PNG scaricato e aperto. Le verifiche aggiornate sono in docs/VERIFICA.md. Il precedente handoff sotto è conservato come storia e non descrive tutte le nuove feature.

---

## Contesto storico della revisione precedente

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

Frontend del prototipo, non dell'intero prodotto descritto in `REQUISITI.md`:

- React 19 + TypeScript + Vite 6; Konva/react-konva; Zod; PDF.js lazy; IndexedDB; Vitest.
- Home/biblioteca con materie create dall'utente, più quaderni per materia, ricerca per nome e ripresa del quaderno modificato più recentemente.
- Creazione di quaderni vuoti, titolo modificabile nel notebook, eliminazione con conferma inline.
- Materiali per materia: PDF/PNG/JPEG/WebP fino a 20 MB, originali Blob conservati in IndexedDB, download, eliminazione con conferma, importazione in un quaderno della stessa materia.
- Nessuna restrizione di argomento imposta dalla materia. La prima materia Analisi matematica contiene il quaderno dimostrativo precedente; non si creano corsi o materiali universitari fittizi.
- Notebook senza sidebar: strumenti flottanti, pagine impilate nello stesso viewport con scorrimento continuo e selettore del foglio nel footer. Il foglio attivo segue lo scroll e determina undo/redo, esportazione e richiesta sull'intera pagina.
- Canvas montati solo per pagine vicine alla vista o attive, con recupero dei dati dal reducer. I movimenti della penna restano transitori in Konva.
- Penna con tre colori/tre spessori; gomma; undo/redo per pagina; svuotamento reversibile; modalità Solo penna con dito per spostare; carta puntinata, righe o bianca.
- Alla fine della selezione compare direttamente il pulsante **Aiuto AI** accanto alla zona. Un clic richiede l'indizio; il fumetto permette di aggiungere una domanda e scegliere l'intento.
- Compositore delle richieste sul livello sopra il foglio, anche per richieste senza selezione dalla toolbar.
- Indizi HTML accessibili in margine, collegati alle rispettive regioni evidenziate su Konva. Restano separati dai tratti e sono comprimibili, nascondibili e rimovibili. Disposizione misurata per evitare sovrapposizioni, aggiornata durante zoom e cambio formato. Sotto 900 px gli indizi stanno sul foglio, vicino al passaggio.
- Importazione PDF multipagina e immagini come nuovi fogli; massimo 20 pagine per PDF. I PDF nei quaderni rimangono rasterizzati.
- Tutor demo locale esplicito; nessuna analisi AI, verifica matematica o invio al provider. Contratto backend invariato, timeout, annullamento e controllo di pagina/revisione/quaderno sulle risposte.
- Esportazione PNG della consegna e dei tratti senza livello tutor. Il download automatico non è stato verificato end-to-end nel browser integrato in questa revisione (attesa evento download scaduta).

Primo foglio demo: esempio illustrativo sulla derivata di `sin(x² + 1)`, con passaggio volutamente incompleto. Non è materiale universitario autentico. I nuovi quaderni sono vuoti.

### Dati e compatibilità

- Lo schema di ogni `Notebook` resta versione 1.
- Nuovo involucro `Library`, versione 1, con materie, quaderni identificati da ID e metadati dei materiali.
- IndexedDB `margine-notebook` passa alla versione 2, preservando lo store `notebooks` e aggiungendo lo store Blob `materials`.
- Nuova chiave `library`. Se manca, si valida e migra il precedente quaderno da `current`, lasciando intatto il dato originale.
- Dati non validi bloccano il salvataggio automatico per evitare sovrascritture. Scritture serializzate; storico undo solo in sessione.
- I materiali salvati non sono ancora inviati al tutor o usati come fonti/RAG.

## Mappa dei file

| File | Responsabilità |
| --- | --- |
| `src/App.tsx` | Home/notebook, toolbar, scroll, persistenza e richieste tutor |
| `src/library.ts` | Schema biblioteca, materie, metadati materiali, reducer e migrazione |
| `src/model.ts` | Schema quaderno versione 1, reducer, cronologia per pagina |
| `src/note-layout.ts` | Posizione delle note e prevenzione delle sovrapposizioni |
| `src/components/LibraryHome.tsx` | Biblioteca con materie, quaderni e materiali |
| `src/components/PageSurface.tsx` | Pagina continua, canvas virtualizzato, aiuto contestuale e indizi |
| `src/components/NotebookCanvas.tsx` | Livelli del foglio, Pointer Events, snapshot senza overlay |
| `src/services/storage.ts` | IndexedDB, migrazione, Blob e coda serializzata |
| `src/services/import.ts` | Rasterizzazione PDF e immagini, caricata su richiesta |
| `src/services/tutor.ts` | Modalità demo, contratto API e validazione risposta |
| `src/**/*.test.ts` | 18 test su modello, biblioteca, layout note e richieste tutor |
| `src/styles.css` | Tema minimale e layout responsive |
| `docs/VERIFICA.md` | Evidenze dei controlli e limiti |
| `docs/ux/` | Screenshot della nuova UX |
| `.impeccable.md`, `PRODUCT.md` | Contesto di design confermato |

## Contratto AI da mantenere

`VITE_TUTOR_API_URL` vuoto → demo. Se impostato, il frontend chiama `POST <origine>/tutor/help`. Il backend dovrà configurare CORS e conservare le chiavi sul server.

Richiesta: `pageId`, `revision`, `image` PNG data URL (consegna + tratti, senza overlay), `selection` rettangolo o null, `question`, `previousHints`.

Risposta: stessi `pageId` e `revision`, più `annotation` con `id`, `kind` (`hint` o `question`), `anchor` (`x`, `y`, `width`, `height`), `text` e `source` opzionale verificata. Gli schemi esatti sono in `model.ts` e `services/tutor.ts`; esempi nel README.

La pagina logica è larga 794 unità, altezza variabile. Il frontend valida schema, limiti della regione e revisione; l'app rifiuta risposte se lo studente ha modificato lo svolgimento durante la richiesta.

## Verifiche già eseguite

- Build TypeScript/Vite riuscita; 18 test Vitest passati.
- Test: cronologia per pagina, redo, clear, risposte obsolete, separazione livelli, selezioni; migrazione del quaderno, isolamento tra materie/quaderni, eliminazione e aggiornamenti tardivi; annullamento tutor, validazione identità/revisione/limiti, immagini basse; note senza sovrapposizioni e coordinate allo zoom.
- Browser integrato: biblioteca precedente recuperata con quattro fogli; nuova materia Fisica generale e nuovo quaderno vuoto; scrittura, undo/redo, selezione con pulsante adiacente, richiesta diretta e domanda con intento; due indizi collegati e comprimibili; visibilità del livello AI; zoom.
- Caricato il PDF sintetico `/tmp/margine-import-test.pdf` come materiale, poi importato nello stesso quaderno come due pagine consecutive. Originale e metadati conservati dopo reload.
- Verificati scorrimento tra fogli e aggiornamento della pagina attiva, recupero della biblioteca e riapertura di tratti/indizi dopo reload.
- Controllati layout tablet e compatti, incluso browser con zoom del 130%; nessun overflow orizzontale del documento. Nessun errore o warning frontend osservato nella console.
- Nel browser locale rimangono i dati sintetici di prova (materia Fisica generale, quaderno Meccanica · esercizi e PDF di test). Non sono contenuti iniziali distribuiti agli altri utenti.
- Download PNG: evento non ricevuto dal browser integrato; non dichiarare il salvataggio del file verificato. La generazione snapshot usata dal tutor funziona e continua a escludere i livelli HTML/Konva AI.

Non verificati: hardware Apple Pencil, palm rejection reale, backend AI, correttezza matematica generata, hosting pubblico, uso offline dopo chiusura.

## Limiti e lavoro ancora da fare

- Nessun backend FastAPI né chiamata a un modello reale.
- Nessun materiale universitario reale associato; il requisito di grounding della challenge resta da realizzare.
- Nessun RAG o estrazione testuale. Le dispense possono essere archiviate nei materiali, ma il tutor non le consulta. I PDF importati nei quaderni sono immagini di sfondo rasterizzate.
- Nessuna memoria didattica delle difficoltà: le annotazioni sono persistenti e vengono riutilizzate come precedenti indizi, ma non esiste un learner model.
- Nessuna verifica simbolica/fisica implementata. I pulsanti di tipo d'aiuto inviano l'intento al servizio; il mock resta predefinito.
- Nessun pinch zoom, pressione penna o gestione avanzata del palmo. Solo penna è un filtro di input con panning al dito.
- Undo/redo rimane nella sessione; non viene ripristinato dal database. Vengono conservati i tratti finali, non l'intera cronologia.
- Nessun account, sincronizzazione, condivisione live o dashboard docente. Ogni browser/origine ha una biblioteca locale distinta.
- Quaderni e materiali sono eliminabili dalla home. Restano da definire autenticazione, gestione completa dei dati server e politiche per un rilascio pubblico. La chiave del quaderno legacy è conservata per compatibilità.
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
- All'inizio di questo aggiornamento il checkout corrente risulta **`gian`**, collegato a `origin/gian`, e il worktree conteneva soltanto la cartella non tracciata `output/`, prodotta in precedenza e lasciata intatta. Non presumere che sia ancora `main`.
- L'utente ha chiesto di pushare il lavoro su origin. I file di contesto vengono consegnati sul branch attivo, senza merge impliciti sugli altri branch.
- In una verifica precedente `gh auth status` segnalava un token non valido, ma `git push` HTTPS è riuscito. Non presumere che la CLI `gh` e Git usino necessariamente la stessa autenticazione.
- Non fare force push, non riscrivere la storia e non sovrascrivere il lavoro dei compagni.

## Ultima richiesta dell'utente

Riorganizzare UX e utilizzo: aiuto AI direttamente accanto alla selezione, eliminare la sidebar destra, interventi sul livello sopra il foglio come nel mockup fornito; home per gestire materiali e più notebook separati per materia; esercizi importati o scritti a mano; fogli a scorrimento continuo. Questa revisione implementa il flusso frontend richiesto. Backend AI e grounding sui materiali restano da realizzare.
