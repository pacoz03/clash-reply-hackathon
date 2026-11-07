# margin

**Write. Think. Understand.**  
AI guidance, right beside your notes.

Quaderno web per esercizi matematici e fisici su iPad con penna. React 19, TypeScript, Vite, Konva, PDF.js e IndexedDB; backend Python/FastAPI con SDK OpenAI diretto.

## Avvio frontend

Node.js 22.13+ e npm:

```sh
npm install
npm run dev
npm test
npm run build
```

Apri l'indirizzo mostrato da Vite, normalmente `http://localhost:5173`. La UI è in inglese. Per provare da un altro dispositivo sulla stessa rete usa l'indirizzo Network mostrato da Vite; i quaderni sono locali al browser e all'origine, non sincronizzati. Le prove affidabili su iPad richiedono HTTPS e un dispositivo reale.

## Le cinque feature

1. **Quaderni e importazione.** Biblioteca per materia, ricerca, quaderni multipli, pagine continue; PDF o immagini importati come fogli scrivibili. Originali dei materiali conservati separatamente.
2. **Scrittura.** Penna, gomma, undo/redo per pagina, selezione, spostamento, zoom, carta puntinata/a righe/bianca, salvataggio locale automatico ed esportazione PNG senza aiuti.
3. **Tutor nel margine.** Seleziona un passaggio e premi Ask margin, oppure chiedi aiuto sull'intera pagina. Indizi progressivi, note collegate al punto selezionato, comprimibili, nascondibili e rimovibili; nessuna sidebar tutor permanente.
4. **Nuovo tentativo e memoria.** Check my update richiede una lettura dello svolgimento corrente. Learning notes conserva osservazione, aiuto, versione, intento ed esito; le osservazioni si possono modificare o cancellare senza alterare il foglio. Le note riferite a scrittura precedente sono segnalate.
5. **Fonti del corso.** Course material consente di scegliere fino a sei PDF della materia per il quaderno. Estrazione testuale locale e selezione di estratti; una citazione verificata apre il documento alla pagina usata con il passaggio citato.

Il primo quaderno contiene un esempio illustrativo sulla regola della catena, con passaggio volutamente incompleto. I nuovi quaderni partono vuoti. Non sono inclusi materiali universitari autentici.

## Modalità demo e AI reale

Il gateway TypeScript importato da `chri` è conservato come alternativa sperimentale,
non attiva per default. Mancano moduli dati e l'allineamento al contratto corrente:
vedi [analisi e piano di merge](docs/MERGE-CHRI.md). Le istruzioni backend qui sotto
si riferiscono al servizio Python già implementato.

Senza `VITE_TUTOR_API_URL`, il tutor è una **demo locale dichiarata**. Non legge il foglio, non usa le dispense, non verifica formule e non può registrare progressi valutati da AI. Anche Check my update resta dimostrativo. Le interazioni demo sono etichettate e tenute distinte nel contesto successivo.

Il backend reale è implementato, ma richiede una chiave server e la scelta esplicita di un modello vision compatibile con Responses e Structured Outputs. Non è impostato un modello predefinito: confrontare lettura della scrittura, utilità degli indizi, latenza e costo sui casi reali prima di sceglierlo.

### Avvio backend

Python 3.11+:

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements-dev.txt
cp backend/.env.example backend/.env
```

Compila `OPENAI_API_KEY` e `OPENAI_MODEL` in `backend/.env`, poi carica queste variabili nella shell del server:

```sh
set -a
source backend/.env
set +a
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
```

In un altro terminale, copia `.env.example` in `.env.local` e imposta:

```dotenv
VITE_TUTOR_API_URL=/api
```

Riavvia Vite. Il proxy di sviluppo inoltra `/api/tutor/help` al backend locale senza esporre la chiave al browser. In produzione configurare lo stesso reverse proxy oppure l'origine HTTPS del backend con i relativi CORS. `GET /health` indica se chiave e modello sono configurati; il servizio restituisce 503 se mancano, senza simulare una risposta AI.

**Mai inserire chiavi private in variabili `VITE_*`.**

### Contratto tutor

`POST /tutor/help` accetta il contratto precedente, con campi opzionali aggiuntivi:

```json
{
  "notebookId": "notebook-id",
  "pageId": "page-id",
  "revision": 3,
  "pageHeight": 1123,
  "image": "data:image/png;base64,...",
  "selection": { "x": 60, "y": 355, "width": 420, "height": 70 },
  "question": "Why does this step not work?",
  "intent": "hint",
  "previousHints": [],
  "observations": [],
  "sources": []
}
```

`intent`: `hint`, `explain`, `check`. `selection` può essere null. Ogni fonte inviata include `materialId`, `name`, pagina reale `page` e `text`; ogni osservazione precedente contiene `summary`, `outcome` e `revision`.

La risposta mantiene pagina/revisione e contiene un'annotazione `hint` o `question`, più una breve osservazione. Un riferimento strutturato `sourceRef` contiene `materialId`, `page` e una citazione testuale `quote`. Frontend e backend controllano che documento, pagina ed estratto corrispondano ai materiali inviati; riferimenti inventati vengono scartati. Questo controlla la provenienza del testo, non certifica la pertinenza o la correttezza matematica della risposta.

Il server usa l'immagine aggiornata, memoria esplicita e istruzioni per indizi progressivi, metodi alternativi e richieste di chiarimento. Il comportamento educativo e la correttezza richiedono comunque valutazione su casi reali. Non è implementato un verificatore simbolico universale.

L'integrazione segue [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses) e [input immagini](https://developers.openai.com/api/docs/guides/images-vision?api-mode=responses) della documentazione ufficiale OpenAI.

## Fonti: ambito attuale

- PDF fino a 20 MB e 100 pagine per estrazione/consultazione; importazione come fogli scrivibili limitata a 20 pagine per file.
- Il lettore mostra anche immagini. I PDF scansiti e le immagini non sono sottoposti a OCR: restano consultabili/importabili, ma non diventano fonti testuali del tutor.
- La ricerca è lessicale e locale, basata su titolo, domanda e indizi precedenti. Invia al massimo otto estratti di 2.800 caratteri dai documenti selezionati; non usa embeddings e non trascrive il foglio prima del recupero. Può quindi non trovare il materiale pertinente.
- Solo la richiesta esplicita di aiuto invia immagine e contesto. Nascondere o rimuovere una nota non modifica i tratti. Eliminare un materiale lo scollega dai quaderni.

## Input e dati

- `P` penna, `E` gomma, `S` selezione, `H` spostamento; `⌘/Ctrl+Z`, `⌘/Ctrl+Shift+Z`; `Esc` chiude aiuto e opzioni.
- Pen only distingue penna/mouse dal dito per lo spostamento. Pinch zoom, pressione e palm rejection avanzata restano da implementare e provare su iPad.
- Coordinate logiche: larghezza 794, altezza variabile; lo zoom è visivo. Il canvas aggiorna React alla fine del gesto, non a ogni campione.
- IndexedDB `margine-notebook`, versione 2, conserva il proprio nome per compatibilità. Gli schemi Notebook/Library restano versione 1 con campi opzionali per memoria, allegati e testo dei PDF; i dati precedenti restano leggibili. La chiave legacy `current` è mantenuta come backup della migrazione. Dati non leggibili bloccano le sovrascritture.
- Salvataggi serializzati; undo/redo conservato solo durante la sessione; osservazioni conservate con il quaderno fino alla cancellazione. Cambiare browser/origine non trasferisce la biblioteca.
- Il backend non mantiene un database di pagine, dispense o conversazioni e richiede `store=False` al provider. Ciò non definisce da solo la conservazione dei dati del fornitore; configurazione e condizioni del provider vanno documentate prima di un rilascio pubblico. Il servizio locale non include autenticazione o limiti d'uso per un hosting pubblico.

## Verifiche e mappa del progetto

```sh
npm test
npm run build
python -m pytest backend -q
```

- `src/model.ts`, `src/library.ts`: modelli, reducer e compatibilità.
- `src/components/`: biblioteca, fogli continui, canvas, materiali e memoria.
- `src/services/`: persistenza, import, download, recupero fonti e adapter tutor.
- `backend/app.py`: API stateless, validazione e integrazione vision.
- `DESIGN.md`: direzione visiva e vincoli dei mockup portati nel codice.
- `docs/VERIFICA.md`: evidenze e limiti delle prove.
- `HANDOFF.md`: stato corrente e contesto precedente.
