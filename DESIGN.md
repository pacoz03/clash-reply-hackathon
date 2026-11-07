# margin — Design

## Direzione confermata

Brand: `margin`, minuscolo, senza punto. Payoff: **Write. Think. Understand.** Descrizione: **AI guidance, right beside your notes.** UI inglese per l'hackathon, conversazione con l'utente in italiano.

Studente universitario al tavolo in aula studio, iPad e penna, luce ambiente chiara: il foglio luminoso resta leggibile durante una sessione lunga. Personalità calma, precisa, incoraggiante. Strategia cromatica contenuta: carta avorio, inchiostro verde scuro, salvia per selezione e aiuti, oliva per richiami sottili.

## Inventario dei mockup da preservare

- Logo serif, titoli editoriali e controlli sans serif: Lora e DM Sans, font locali. Caveat solo nel contenuto illustrativo del foglio.
- Biblioteca con quaderni riconoscibili, ripresa del lavoro e materiali per materia.
- Foglio dominante, carta puntinata, strumenti compatti e spazio per scrivere.
- Evidenziazione del passaggio e connessione sottile alla nota nel margine; note AI leggibili, collassabili e separate dai tratti.
- Indizi progressivi e azione per verificare il nuovo tentativo.
- Dispense e memoria accessibili in pannelli temporanei richiudibili.

La UX già implementata e descritta in AGENTS.md prevale sui dettagli illustrativi dei mockup: pagine a scorrimento continuo, selezione e aiuto adiacenti, nessuna sidebar tutor fissa. Non introdurre librerie, valori o documenti universitari fittizi per riprodurre il contenuto decorativo delle immagini.

## Implementazione

UI semantica HTML/CSS, icone Lucide; Konva per foglio e tratti. Le immagini dei mockup non sono usate come interfaccia raster. Palette e stati in variabili OKLCH. Una sola CTA primaria per contesto; focus visibile, tastiera, reduced motion, controlli touch sul tablet e pannelli adattivi. Una nota su scrittura precedente lo dichiara; il colore da solo non comunica stato o provenienza.

UI senza nuove schermate decorative o nuove immagini generate. Screenshot del prodotto in `docs/ux/margin-*.jpg`.
