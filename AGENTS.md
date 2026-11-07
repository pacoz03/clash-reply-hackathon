# Istruzioni per lavorare su Margine

## Contesto e letture

Margine è un quaderno web per esercizi matematici e fisici, destinato a studenti universitari su iPad con penna. Il tutor interviene sul foglio per aiutare lo studente a proseguire nel proprio ragionamento.

Prima di intervenire leggere:
- `HANDOFF.md`: decisioni, stato attuale, verifiche e lavoro ancora da fare.
- `REQUISITI.md`: requisiti del prodotto completo; non sono tutti implementati.
- `README.md`: avvio, architettura e contratto del backend.
- `.impeccable.md`: contesto visivo scelto dall'utente.

Comunicare con l'utente in italiano. Usare etichette e messaggi di prodotto in italiano.

## Scelte di prodotto da rispettare

- Supportare l'inserimento di qualsiasi esercizio matematico o fisico senza imporre una categoria iniziale. La verifica della correttezza ha limiti da rendere espliciti.
- Conservare il flusso scrivi → chiedi aiuto → ricevi un'annotazione → correggi → richiedi verifica.
- Dare indizi progressivi e domande mirate. Aiutare a ragionare, evitando di consegnare automaticamente l'intero svolgimento.
- Il tutor interviene su richiesta; l'intervento continuo non fa parte del primo prototipo.
- Se grafia, dati o figure sono ambigui, chiedere chiarimenti. Considerare metodi alternativi corretti e non inventare fonti.
- Distinguere sempre gli indizi demo dalle risposte AI reali. Non dichiarare una verifica matematica che non è stata eseguita.
- Mantenere il quaderno interno all'app: non è implementata un'integrazione con Goodnotes o altre applicazioni.

## Design e interazioni

Scelta esplicita: quaderno minimale, carta chiara, inchiostro scuro, pochi comandi. Il nome Margine è un nome di lavoro. Il foglio resta il centro dell'esperienza; gli aiuti sono contestuali al passaggio.

- Preservare il livello dei tratti dello studente separatamente dalle annotazioni AI.
- Non cancellare o riscrivere automaticamente i tratti tramite il tutor.
- Mantenere l'allineamento durante zoom e spostamento.
- Verificare interazioni touch e leggibilità sui layout tablet e compatti.
- Conservare tastiera, focus visibile, etichette accessibili e supporto a reduced motion.

## Architettura e invarianti

- Stack implementato: React 19, TypeScript, Vite 6, react-konva/Konva, Zod, PDF.js, IndexedDB, Vitest. Font distribuiti localmente con Fontsource.
- `src/model.ts` contiene schema versionato, reducer e cronologia per pagina. Gestire esplicitamente la compatibilità dei dati salvati se cambia lo schema.
- Coordinate logiche: larghezza pagina 794; altezza variabile. Lo zoom è solo una trasformazione visiva.
- I movimenti della penna restano transitori nel canvas; lo stato React riceve il tratto completo al termine del gesto. Evitare render globali a ogni campione.
- La gomma agisce sul livello di scrittura, preservando consegna e livello AI.
- Le scritture IndexedDB sono serializzate per evitare sovrascritture da snapshot precedenti.
- Ogni richiesta tutor usa `pageId` e `revision`. Rifiutare risposte obsolete rispetto allo svolgimento corrente.
- `src/services/tutor.ts` è il punto di integrazione AI. Il backend deve rispettare il contratto e la validazione descritti nel README.
- La cattura inviata al tutor include consegna e tratti, escludendo selezione e annotazioni AI.
- PDF.js è caricato su richiesta. I PDF sono attualmente rasterizzati: nessun RAG o estrazione testuale è già presente.
- Non mettere chiavi private in `VITE_*`: queste variabili vengono esposte al browser.

## AI e dipendenze

Il backend AI non è ancora implementato. L'orientamento discusso è un backend Python/FastAPI leggero, SDK diretto del provider, Pydantic per gli schemi e strumenti Python; OpenAI Responses API è stata proposta. Agno è stato valutato come alternativa. Nessun modello specifico è stato selezionato e nessun framework agentico è stato installato.

Prima di scegliere un modello verificare le API correnti e confrontare casi scritti a mano su lettura, qualità dell'indizio, latenza e costo. Eventuale SymPy supporta verifiche applicabili, senza certificare universalmente ragionamento fisico, trascrizione e condizioni di validità.

## Verifiche

```sh
npm install
npm run dev
npm test
npm run build
```

Node di riferimento: 22.13.1. Testare reducer, cronologia, coordinate e gestione delle risposte asincrone quando modificati. Per cambiamenti al canvas verificare anche scrittura, selezione, zoom, importazione e recupero dopo reload nel browser. Le prove su browser desktop non sostituiscono Apple Pencil su un iPad reale.

Non presentare il prototipo come conforme a tutti i requisiti della challenge: mancano backend reale, materiale universitario autentico e memoria didattica delle difficoltà. Aggiornare `HANDOFF.md` dopo cambiamenti sostanziali.

## Git e collaborazione

Repository: `https://github.com/pacoz03/clash-reply-hackathon.git`.

Sono stati creati i branch `main`, `gian`, `andre`, `pas`, `chri`, `dev`, con i nomi esatti richiesti dall'utente. Verificare sempre il branch corrente e lo stato del worktree prima di modificare o pubblicare. Non spostare lavoro tra branch o sovrascrivere modifiche dei compagni implicitamente.

L'utente ha richiesto di pubblicare il lavoro su questo repository. Committare e fare push sul branch attivo quando il lavoro è completato e verificato, segnalando il branch nella consegna. Non fare force push o merge su altri branch senza una richiesta pertinente. Non pubblicare `.env`, credenziali, `node_modules` o build generate.
