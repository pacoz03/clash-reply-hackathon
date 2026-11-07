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
