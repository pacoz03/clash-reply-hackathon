# Margine

Boilerplate di un quaderno web per esercizi matematici e fisici, progettato per iPad e penna. React, TypeScript, Vite, Konva e PDF.js. Il tutor parte in **modalità demo locale**: gli indizi sono predefiniti e non analizzano il contenuto del foglio.

## Avvio

Richiede Node.js 22.13+ e npm.

```sh
npm install
npm run dev
```

Apri l'indirizzo mostrato da Vite, normalmente `http://localhost:5173`. Per provare da iPad sulla stessa rete, usa l'indirizzo Network stampato da Vite. Per test affidabili in produzione usa HTTPS.

```sh
npm run build
npm test
npm run preview
```

## Funzioni disponibili

- Scrittura a mano con mouse o penna, tre colori e tre spessori.
- Gomma, annulla/ripristina (50 passaggi per pagina, durante la sessione).
- Selezione rettangolare del passaggio e annotazioni tutor su un livello separato.
- Fogli multipli, sfondo puntinato/a righe/bianco, zoom e trascinamento.
- Importazione PDF multipagina e immagini PNG/JPEG/WebP, fino a 20 MB e 20 pagine PDF.
- Salvataggio automatico del quaderno in IndexedDB sul dispositivo.
- Esportazione PNG della consegna e dello svolgimento, senza il livello tutor.
- Flusso tutor dimostrativo, annullamento richieste e protezione contro risposte relative a versioni precedenti del foglio.
- Interfaccia adattiva, pannelli laterali richiudibili sugli schermi piccoli.

Il primo foglio è un esempio illustrativo con un passaggio volutamente incompleto. Aggiungi un foglio vuoto per lavorare su un esercizio tuo. I contenuti dell'esempio non sono materiale universitario autentico.

## Input e scorciatoie

- `P`: penna; `E`: gomma; `S`: selezione; `H`: spostamento.
- `⌘/Ctrl + Z`: annulla; `⌘/Ctrl + Shift + Z`: ripristina.
- `Esc`: rimuove la selezione e chiude i pannelli mobili.
- Con **Solo penna**, i tratti accettano penna o mouse; il dito sposta il foglio. Disattivalo per disegnare col dito.
- Lo zoom usa i pulsanti `−`/`+`; premendo la percentuale il foglio si adatta alla finestra. Il pinch zoom del canvas non è implementato.

La pressione della penna e il rifiuto avanzato del palmo non sono implementati. Va verificato il comportamento sul modello reale di iPad/Apple Pencil destinato alla demo.

## Architettura

```text
src/
  App.tsx                    shell e coordinamento delle interazioni
  model.ts                   modello versionato, reducer, cronologia
  components/
    NotebookCanvas.tsx       foglio a livelli e input Pointer Events
    PageThumbnail.tsx        navigazione pagine
  services/
    storage.ts               persistenza IndexedDB serializzata
    import.ts                rendering PDF e immagini, caricato su richiesta
    tutor.ts                 contratto API, validazione Zod, adattatore demo
```

Le coordinate sono sempre relative alla pagina logica larga 794 unità. Lo zoom riguarda la visualizzazione. I tratti provvisori vengono disegnati direttamente sul livello Konva e arrivano allo stato React soltanto alla fine del gesto.

I PDF importati vengono rasterizzati per la scrittura: non è ancora presente estrazione testuale, ricerca nei documenti o RAG. Originali PDF e storico undo non vengono conservati. Le miniature sono indicative: non ricostruiscono la gomma vettoriale né le annotazioni.

## Collegare il backend AI

Copia `.env.example` in `.env.local` e imposta `VITE_TUTOR_API_URL` con l'origine del backend. Riavvia Vite. La modalità demo viene sostituita dalla chiamata HTTP e l'interfaccia lo segnala. Nessuna chiave privata deve essere inserita in variabili `VITE_*`.

Il backend dovrà implementare `POST /tutor/help` e consentire l'origine del frontend tramite CORS. La richiesta contiene:

```json
{
  "pageId": "page-id",
  "revision": 3,
  "image": "data:image/png;base64,...",
  "selection": { "x": 60, "y": 355, "width": 420, "height": 70 },
  "question": "Un indizio. Perché questo passaggio non torna?",
  "previousHints": []
}
```

`selection` può essere `null`. `image` include consegna e tratti, escludendo selezione e annotazioni del tutor. La risposta deve rispettare `tutorResponseSchema` in `src/services/tutor.ts`:

```json
{
  "pageId": "page-id",
  "revision": 3,
  "annotation": {
    "id": "hint-id",
    "kind": "question",
    "anchor": { "x": 60, "y": 355, "width": 420, "height": 70 },
    "text": "Quale regola giustifica questo passaggio?",
    "source": "Dispensa, pagina 12"
  }
}
```

`source` è facoltativo e deve essere fornito solo quando verificato. `kind` ammette `hint` e `question`. Il frontend valida risposta, regione della pagina e versione dello svolgimento; non valuta la correttezza matematica. Il backend reale, le fonti del corso, la memoria delle difficoltà e il controllo matematico sono i prossimi moduli da implementare.

## Dati e limiti

In modalità demo tutto resta sul dispositivo. Il salvataggio è legato al browser e all'origine: aprire la stessa app su un altro dispositivo non trasferisce il quaderno. La cancellazione dei dati del sito elimina il quaderno. Usa l'esportazione PNG per conservare una copia dei fogli.

Con un backend configurato, il foglio viene inviato solo quando si richiede aiuto. Autenticazione, limiti d'uso, conservazione sul server e gestione dei materiali devono essere aggiunti prima di un rilascio pubblico.

I requisiti di prodotto completi sono in `REQUISITI.md`; questa versione è il boilerplate del notebook e non implementa ancora l'intero prodotto.
