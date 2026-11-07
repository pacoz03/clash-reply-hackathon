# Verifica corrente — margin

7 novembre 2026, branch `gian`. Questo aggiornamento sostituisce lo stato delle verifiche nella sezione storica sotto riportata.

## Controlli automatici

- Frontend: **28 test Vitest passati** su modello, cronologia, osservazioni, biblioteca, allegati, layout e adapter tutor.
- Backend: **12 test pytest passati** su configurazione mancante, contratto provider simulato, input malformati, coordinate, citazioni reali/inventate e timeout.
- `npm run build`: TypeScript e build Vite riuscite.
- `git diff --check`: nessun errore di spaziatura.

I test backend usano risposte simulate. Non verificano lettura della scrittura o qualità matematica di un modello reale.

## Controlli browser

- Branding margin e UI inglese, senza tradurre i contenuti già salvati dall'utente.
- Richiesta sul foglio, indizio nel margine, scrittura con mouse e selezione con aiuto adiacente.
- Dopo un nuovo tratto, la nota precedente mostra Based on earlier writing. Check my update genera una nuova interazione demo chiaramente distinta da una valutazione AI.
- Learning notes: osservazioni visibili, modifica e salvataggio, recupero dopo reload insieme a pagine e tratti. Le osservazioni demo restano etichettate.
- PDF sintetico `/tmp/margin-qa-course.pdf`: due pagine, caricamento come materiale, estrazione del testo, selezione esplicita per il tutor, lettore con navigazione da pagina 1 a pagina 2. Non è materiale universitario autentico.
- Lo stesso PDF è stato importato come due fogli consecutivi: il quaderno contiene tre pagine, navigabili dal footer e recuperate dopo reload. L'originale resta nei materiali.
- Download PNG riuscito tramite Blob URL: ricevuto dal browser e file aperto per controllo visivo; contiene consegna e tratto di prova, senza note AI, selezione o evidenziazioni del tutor. Corretto il precedente comportamento con link data URL.
- Nessun overflow del documento nelle verifiche compatte a 320 e 416 CSS px. Controllati anche formato desktop 1280×900 e formato tablet/zoom browser 130% (viewport CSS osservato circa 787×590). Gli screenshot sono evidenze della sessione, non una validazione hardware.
- Nessun errore o warning frontend osservato nei log al termine del flusso.
- Corretto il testo illustrativo che mostrava sequenze di nuova riga letterali; osservazioni e fonti non si confondono con la scrittura dello studente.

Screenshot attuali in `docs/ux/`: margin-library.jpg, margin-compact.jpg, margin-tablet.jpg, margin-course-material.jpg, margin-learning-notes.jpg. Contengono solo contenuti sintetici di QA. Il browser conserva il quaderno e il PDF di prova locali.

## Limiti

Non eseguita una chiamata AI reale: mancano chiave e scelta del modello. Non verificati Apple Pencil/palm rejection su iPad fisico, pertinenza del retrieval su un corso reale, correttezza matematica o confini pedagogici del modello, hosting pubblico e uso offline dopo chiusura. Il backend locale non include autenticazione pubblica o rate limiting. Nessun OCR per immagini/PDF scansiti, nessun retrieval vettoriale.

---

## Verifica storica precedente

# Verifica della biblioteca e del notebook continuo

Verificato il 7 novembre 2026 sul branch `gian`, Node 22.13.1.

- `npm test`: 18 test su cronologia per pagina, selezioni e livelli, migrazione del quaderno precedente, isolamento dei quaderni, eliminazione e aggiornamenti tardivi, note senza sovrapposizioni allo zoom, annullamento e validazione delle risposte tutor.
- `npm run build`: TypeScript e build Vite riuscite.
- Browser integrato: recuperata la biblioteca precedente con quattro fogli; creata Fisica generale e un quaderno nuovo vuoto; scrittura, annulla/ripristina, selezione e pulsante Aiuto AI adiacente.
- Indizio richiesto direttamente dalla selezione, poi domanda con intento dal compositore sul foglio. Verificati due indizi separati, collegati, comprimibili e nascondibili senza alterare la scrittura.
- Caricato il PDF sintetico di due pagine `/tmp/margine-import-test.pdf` come materiale; importata una copia nel quaderno come fogli consecutivi. File originale e metadati conservati dopo reload.
- Verificato scorrimento fra pagine, aggiornamento del foglio attivo nel footer, zoom e adattamento alla finestra; biblioteca, disegni, annotazioni e pagine importate recuperati dopo reload.
- Controllati layout tablet e compatti, anche con zoom browser 130% (larghezza effettiva minima osservata 300 CSS px). Nessun overflow orizzontale del documento; verificati controlli del quaderno anche sui formati stretti.
- Nessun errore o warning frontend osservato nei log del browser durante il flusso.
- Screenshot in `docs/ux/`: biblioteca, notebook tablet e notebook compatto. Contengono dati sintetici locali di QA, non contenuti distribuiti ai nuovi utenti.

Il tentativo di osservare il download PNG tramite l'evento del browser integrato è scaduto: il download automatico non è certificato da questa verifica. Gli snapshot PNG usati nelle richieste demo sono stati generati correttamente. La cattura conserva solo consegna e tratti; esclude HTML del tutor e livello Konva delle evidenziazioni/selezioni.

Non verificati: Apple Pencil e palm rejection su iPad fisico, download degli originali end-to-end, backend AI reale, correttezza matematica, hosting pubblico e uso offline dopo chiusura. Il tutor resta dimostrativo e i materiali non sono usati come fonti.
