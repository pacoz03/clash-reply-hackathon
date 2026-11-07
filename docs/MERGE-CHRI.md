# Analisi e merge sperimentale di chri in gian

Data: 7 novembre 2026, Europe/Rome.

## Branch e perimetro

- Base: `gian` / `origin/gian`, commit `fe023f77995ed6a771bda350f219c107c408769d`.
- Sorgente aggiornata con fetch: `origin/chri`, commit `a4cd7b8f271b546b3d565c7ca60206a6b162d7a5`.
- Branch secondario: `codex/backup-gian-merge-chri`.
- Merge reale con due genitori, senza riscrivere la storia o modificare `gian` e `chri`.

Il branch conserva il frontend e il backend Python di gian e aggiunge il gateway di chri
in una cartella separata. Non sostituisce automaticamente il servizio tutor usato dall'app.
È una base di confronto e integrazione, non un'attestazione che il gateway sia pronto.

Unico conflitto Git: `.env.example`. Risolto mantenendo `VITE_TUTOR_API_URL` vuoto
(demo esplicita), con `/api` disponibile per il backend Python già implementato.
Il valore `http://localhost:8787` proposto da chri avrebbe attivato il gateway per
chi copia l'esempio, prima di risolverne i problemi sotto indicati.

## Integrazione AI di chri

Percorso: `POST /tutor/help` → validazione Zod → prompt → provider vision →
parsing JSON → annotazione → registrazione best effort dell'interazione.

Il gateway usa Fastify e un client OpenAI compatibile con Chat Completions.
Può puntare a LM Studio o all'API OpenAI tramite configurazione server.
Invia immagine, domanda, selezione e indizi precedenti; genera ID e coordinate
lato applicazione e riporta `pageId` e `revision`. Sono buone basi da preservare.

Il codice Python di gian usa invece Responses con output strutturato e gestisce
già intenti distinti, osservazioni e citazioni verificate. Non è utile sostituirlo
integralmente con il gateway precedente senza riallineare queste funzionalità.

La documentazione ufficiale distingue JSON mode da Structured Outputs:
un JSON valido non garantisce l'aderenza a uno schema. La presenza del selettore
`none/object/schema` non dimostra la compatibilità di uno specifico modello locale
o remoto: serve provarlo. Riferimento: [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

## Problemi da risolvere prima di usare il gateway

| Priorità | Riscontro nel codice di chri | Conseguenza / lavoro necessario |
| --- | --- | --- |
| Bloccante | `src/index.ts`, `src/app.ts` e le route importano `src/data/service.ts` e `src/data/memory.ts`, assenti dal commit | Il gateway non compila e non parte. Recuperare i file dal compagno o implementare esplicitamente il contratto dati. |
| Bloccante | `src/ai/provider.ts:77` accede a `res.choices` dopo un cast che perde l'informazione di risposta non streaming | Con il lockfile di chri TypeScript produce TS2339. Tipizzare la richiesta come non streaming, evitando il cast al tipo generale che include anche Stream. |
| Alta | `gateway/.gitignore` contiene `data/`; `git check-ignore --no-index -v` conferma che ignora anche `gateway/src/data/*` | Possibile causa dei file mancanti. Restringere la regola a `/data/` quando si aggiunge il livello dati. La causa storica non è dimostrata. |
| Alta | Lo schema Zod elimina i campi aggiuntivi `notebookId`, `pageHeight`, `intent`, `sources`, `observations` | Il gateway accetta apparentemente il frontend attuale, ma perde i dati e tratta hint/explain/check allo stesso modo. Estendere prima il contratto e poi il prompt. |
| Alta | La risposta non contiene `observation` né `sourceRef`; il testo `source` è accettato dal modello | Learning notes non riceve nuove osservazioni; non esiste una verifica della citazione. Riutilizzare le regole documento/pagina/estratto del backend Python ed eliminare le fonti libere non verificate. |
| Alta | `selection` ammette coordinate negative/fuori pagina; il fallback fisso è `{x:60,y:60,width:620,height:80}` | Il frontend può rifiutare la risposta, soprattutto su pagine basse. Validare limiti e `pageHeight`, calcolare un anchor interno. |
| Alta | `image` è solo una stringa non vuota; il limite HTTP è 50 MiB | Non impone uno snapshot PNG né controlla dimensioni dell'immagine. Portare i controlli input già presenti in Python. |
| Media | L'output non valido diventa una domanda che dichiara difficoltà di lettura | Confonde un errore tecnico di parsing con una grafia illeggibile. Restituire un errore tecnico esplicito senza inventare un'osservazione didattica. |
| Media | Timeout provider predefinito 60 s, retry SDK non disabilitati; il frontend interrompe dopo 45 s | Allineare timeout e retry, verificare cancellazione durante la generazione e disconnessione dopo l'invio del body. |
| Media | Prompt, fallback ed errori in italiano; brand Margine | Allineare a margin e testi prodotto inglesi, preservando i confini pedagogici. |
| Media | Modello predefinito `local`, nome specifico nell'esempio e fallback OpenAI implicito nel codice | Richiedere un ID esplicito e valido per il provider. Non scegliere un modello per effetto del merge. |
| Media | `/health` dichiara solo `status: ok`; registrazione interazioni senza lettura della memoria e senza notebookId | Non dimostra disponibilità AI, persistenza o isolamento tra quaderni. Memoria frontend di gian resta il riferimento attuale. |

Le route notebook del gateway non sono collegate al frontend. Non costituiscono
un backup server funzionante dell'attuale biblioteca; non migrano IndexedDB e
non includono i Blob dei materiali. Il README originale del gateway descrive un
livello in-memory che non è presente nel commit. `docs/GATEWAY-PLAN.md` è un piano
storico, non lo stato attuale di gian.

## Percorso consigliato per il merge funzionale

1. Mantenere Python come percorso funzionante di riferimento e il gateway come
   alternativa sperimentale. Non eseguire due backend sullo stesso endpoint.
2. Recuperare il livello dati mancante, correggere l'ignore e verificare build/avvio
   del gateway. Non aggiungere implicitamente SQLite o migrazioni alla biblioteca.
3. Riallineare richiesta, risposta, limiti, citazioni, memoria, lingua e gestione errori
   al contratto attuale in `src/services/tutor.ts` e `backend/app.py`.
4. Aggiungere prove con provider simulato per l'intero contratto, pagine basse,
   citazioni inventate, timeout e input non validi. Conservare i controlli frontend
   sulle risposte obsolete per quaderno/pagina/revisione.
5. Solo dopo questi controlli impostare `VITE_TUTOR_API_URL=http://localhost:8787`
   in una configurazione locale di prova. `/api` continua a puntare a Python sulla
   porta 8000; questo merge non cambia il proxy Vite. Su altri dispositivi usare
   un'origine raggiungibile e i CORS corrispondenti: localhost indica il dispositivo.
6. Confrontare modelli vision configurati esplicitamente con esercizi scritti a mano,
   misurando lettura, utilità dell'indizio, latenza e costo. Una suite con provider
   simulato non certifica la qualità matematica o pedagogica di un modello reale.

## Verifiche del branch

- `npm test`: 28 test passati.
- `npm run build`: build TypeScript/Vite riuscita.
- `/tmp/margin-backend-venv/bin/python -m pytest backend -q`: 12 test passati.
- `npm ci --prefix gateway --ignore-scripts --no-audit --no-fund`: dipendenze del lockfile installate, nessuno script di installazione eseguito.
- `npm run typecheck --prefix gateway` e `npm run build --prefix gateway`: entrambi falliscono con TS2339 nel provider e quattro TS2307 per i moduli dati assenti. Non sono regressioni del merge: i file del gateway sono identici a chri, salvo il README.
- Nessuna chiamata a LM Studio o a un modello OpenAI reale; nessuna chiave aggiunta.
- Frontend, canvas, dati locali e proxy Vite non modificati; non sono state ripetute
  prove browser/iPad perché questo merge non cambia codice dell'interfaccia.

Prima di promuovere il branch in gian risolvere i blocchi del gateway oppure
mantenere esplicitamente il gateway disattivato. Il merge in gian non è eseguito
da questa revisione.
