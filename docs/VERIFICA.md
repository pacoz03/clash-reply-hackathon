# Verifica del boilerplate

Verificato il 7 novembre 2026.

- `npm run build`: compilazione TypeScript e build Vite riuscite.
- `npm test`: 7 test superati su cronologia per pagina, ripristino dopo cancellazione, invalidazione del redo, protezione dalle annotazioni obsolete, separazione dei livelli e coordinate di selezione.
- Browser: creazione pagina, scrittura con trascinamento, annulla/ripristina, svuotamento reversibile dei tratti, recupero del disegno dopo ricaricamento.
- Browser: selezione rettangolare, richiesta di indizio demo, inserimento e rimozione delle annotazioni.
- Browser: importazione di un PDF sintetico di due pagine con formule, navigazione fra le pagine importate.
- Controllo visivo del layout compatto e a dimensioni 1024×768; nessun errore o warning rilevato nella console durante il flusso verificato.

L'immagine `notebook-preview.png` mostra lo stato della demo al termine delle prove. Il browser locale contiene anche i fogli sintetici usati per la verifica.

Non verificati: Apple Pencil e palm rejection su dispositivo fisico, backend AI reale, correttezza matematica degli indizi generati, distribuzione pubblica e uso offline dopo chiusura del browser. Il tutor attuale è esplicitamente dimostrativo.
