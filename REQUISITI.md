# Quaderno AI per esercizi — requisiti v0.1

Stato: proposta di requisiti per il prototipo, da affinare con la demo. Nessuna funzionalità è ancora implementata.

## 1. Obiettivo e utenti

Uno studente universitario svolge esercizi matematici o fisici scrivendo su un quaderno digitale da iPad. Quando incontra una difficoltà, riceve un intervento direttamente accanto ai suoi passaggi e continua a lavorare nello stesso ambiente.

Problema: il passaggio dal quaderno a una chat interrompe il lavoro, richiede di trasferire il contesto e separa la spiegazione dai passaggi che l'hanno motivata. Il prodotto deve aiutare a individuare e superare una difficoltà nel ragionamento, oltre a eliminare il trasferimento manuale degli screenshot.

Utente principale: studente che si esercita autonomamente. La valutazione è formativa, non una certificazione di correttezza o un voto ufficiale.

## 2. Ambito concordato e assunzioni

- Ambito: esercizi matematici e fisici di qualsiasi argomento. Non è necessario selezionare una materia o una tecnica risolutiva prima di iniziare.
- Input previsto: consegne, scrittura a mano, formule, unità di misura, grafici e schemi.
- Destinazione: iPad con penna; desktop utile per sviluppo e dimostrazione.
- Assunzione per il prototipo: quaderno interno all'app. L'annotazione all'interno di altre app non fa parte di questa versione.
- Proposta tecnica già discussa: web app. La scelta rimane subordinata alla verifica dell'esperienza di scrittura su un iPad reale.
- Accettare esercizi generici non implica poter risolvere o verificare correttamente ogni esercizio. Il sistema deve esplicitare ciò che non riesce a leggere o valutare.

## 3. Flusso principale

1. Lo studente apre un quaderno e importa una consegna oppure la scrive.
2. Svolge l'esercizio a mano, sul foglio.
3. Seleziona un passaggio e richiede aiuto; può anche richiedere aiuto sull'intera pagina.
4. L'agente esamina consegna, svolgimento corrente, tentativi precedenti e materiali pertinenti disponibili.
5. Aggiunge un indizio o una domanda sul livello delle annotazioni AI, collegato al punto interessato.
6. Lo studente modifica il proprio svolgimento e richiede una nuova verifica.
7. L'agente rivaluta i passaggi aggiornati e registra l'esito dell'interazione.

## 4. Requisiti funzionali indispensabili

| ID | Requisito | Criterio di accettazione |
| --- | --- | --- |
| R01 | Creare e riaprire quaderni con più pagine | Dopo un ricaricamento, le pagine e i tratti salvati sono recuperabili sullo stesso dispositivo. |
| R02 | Importare PDF e immagini, oppure partire da un foglio vuoto | La consegna resta visibile durante lo svolgimento; un PDF conserva l'ordine delle pagine. |
| R03 | Scrivere, cancellare, annullare e ripristinare | Lo studente completa uno svolgimento con la penna e recupera un tratto cancellato per errore. |
| R04 | Spostare e ingrandire il foglio | Consegna, tratti e annotazioni restano allineati durante zoom e spostamenti. |
| R05 | Richiedere aiuto su una zona o sull'intera pagina | La richiesta include automaticamente il contesto visivo disponibile senza esportazioni manuali. |
| R06 | Ricevere interventi direttamente sul foglio | Il tutor può inserire note, evidenziazioni e frecce; ogni intervento è collegato alla selezione o a una regione identificata. |
| R07 | Gestire le annotazioni AI separatamente | Lo studente può nasconderle o rimuoverle senza alterare i propri tratti o la consegna. |
| R08 | Ottenere indizi progressivi | Un primo aiuto indica una domanda o un principio; un aiuto successivo approfondisce il passaggio mantenendo uno spazio di lavoro per lo studente. |
| R09 | Verificare un nuovo tentativo | Dopo una modifica, il tutor legge la versione aggiornata e può riconoscere un miglioramento, una difficoltà persistente o l'impossibilità di verificare. |
| R10 | Consultare materiale didattico associato | Lo studente può associare dispense o appunti; quando un intervento si basa su una fonte disponibile, mostra documento e pagina/sezione verificabili. |
| R11 | Conservare una memoria didattica minima | Si registrano difficoltà osservata, aiuto fornito ed esito del nuovo tentativo; il contesto è riutilizzabile nella stessa sessione. |
| R12 | Gestire informazioni insufficienti | In presenza di grafia ambigua, consegna incompleta, figura poco leggibile o dati mancanti, il tutor formula una richiesta mirata prima di concludere. |

## 5. Comportamento pedagogico e matematico

- L'assistenza parte su richiesta dello studente. Il tutor non interrompe ogni tratto con correzioni automatiche.
- Gli interventi sono brevi e riferiti a un passaggio concreto. Le spiegazioni aggiuntive possono essere espanse senza coprire lo svolgimento.
- Il tutor considera metodi alternativi validi: una soluzione diversa da quella attesa non è di per sé un errore.
- Quando pertinente, valuta condizioni di validità, dominio, segni, unità di misura, ipotesi fisiche e relazione tra formule e figure.
- La spiegazione distingue un errore osservato da un dubbio di interpretazione. Se non legge un simbolo, chiede di confermarlo.
- Alla richiesta di svolgere completamente un esercizio ancora da tentare, propone un primo passo guidato o un esempio analogo. La progressione degli indizi non deve diventare una soluzione completa automatica.
- Le fonti del corso informano convenzioni e metodi. In assenza di una fonte pertinente, il sistema dichiara che la spiegazione usa conoscenze generali e non inventa riferimenti.
- Le difficoltà registrate sono osservazioni modificabili, non etichette permanenti sulle capacità dello studente. Un nuovo tentativo valido aggiorna l'esito precedente.

## 6. Affidabilità, dati ed esperienza iPad

- Scrittura, gomma, navigazione e salvataggio locale devono funzionare anche mentre una richiesta AI è in corso o fallisce.
- Le richieste AI richiedono connessione; un errore deve consentire un nuovo tentativo senza perdere il lavoro.
- Ogni richiesta identifica pagina e versione dello svolgimento. Una risposta riferita a una versione precedente non deve essere presentata come verifica della versione corrente.
- Gli interventi usano coordinate della pagina, indipendenti dallo zoom. Il livello AI mantiene una distinzione visiva anche senza affidarsi solo al colore.
- Il dispositivo deve distinguere scrittura e navigazione in modo praticabile. Penna, appoggio del palmo, zoom e scorrimento sono prove obbligatorie sull'iPad scelto per la demo.
- Il salvataggio locale mostra eventuali errori. La sincronizzazione fra dispositivi non è un requisito del primo prototipo.
- L'utente deve sapere che il contenuto necessario alla richiesta viene inviato al servizio AI. Le chiavi API restano sul server.
- Deve essere possibile eliminare quaderno e memoria associata dai sistemi controllati dall'app. Conservazione e cancellazione presso il fornitore AI vanno documentate in base alla configurazione effettiva.
- In assenza di richieste automatiche, la pagina non viene inviata continuamente al modello.

## 7. Azioni dell'agente

Il sistema deve eseguire azioni osservabili: aggiungere un'annotazione, evidenziare una regione, registrare una difficoltà e aggiornare l'esito dopo un nuovo tentativo. Ogni azione passa attraverso una validazione applicativa prima di modificare lo stato.

L'agente non può cancellare o riscrivere i tratti dello studente. Il riconoscimento del contenuto e il posizionamento dell'annotazione sono verificati separatamente: il prototipo può ancorare gli aiuti alla selezione dell'utente quando la localizzazione automatica non è affidabile.

## 8. Fuori dal primo prototipo

- Correzione continua mentre si scrive e assistenza vocale.
- Collaborazione in tempo reale, account istituzionali e sincronizzazione fra dispositivi.
- Integrazioni dirette con quaderni di altre app.
- Valutazioni ufficiali, classifiche degli studenti e dashboard del docente.
- Generazione completa delle soluzioni come interazione principale.
- Knowledge graph e sistemi multi-agente: estensioni da valutare dopo il flusso principale.

## 9. Validazione e demo

L'interfaccia resta generica; i test usano un insieme finito e dichiarato. Preparare almeno sei esercizi con riferimenti controllati da una persona competente: due di analisi, uno di algebra, uno di meccanica, uno di elettricità e uno con grafico o schema.

Per almeno due esercizi, verificare il ciclo completo: errore intenzionale → indizio pertinente → correzione dello studente → nuova verifica. Includere inoltre un metodo alternativo corretto, una grafia ambigua, dati mancanti, una richiesta di soluzione completa e un errore di connessione.

La demo deve usare materiale universitario reale, reso disponibile legittimamente. Questo materiale non è ancora presente nel progetto; finché manca, non si può dichiarare verificato il requisito di grounding della challenge.

Misurare: correttezza e utilità degli indizi, falsi errori segnalati, riconoscimento dell'incertezza, allineamento delle annotazioni e tempo dalla richiesta all'aiuto. Riportare i casi falliti insieme a quelli riusciti.

Il successo educativo da esplorare è la capacità di proseguire e poi affrontare un passaggio analogo con meno aiuto. Una demo riuscita dimostra il funzionamento del flusso, non dimostra da sola un miglioramento generale dell'apprendimento.

## 10. Condizione di completamento del prototipo

Su un iPad reale, uno studente importa un esercizio, scrive, chiede un aiuto contestuale, riceve un'annotazione utile, corregge e ottiene una nuova verifica senza lasciare il quaderno. Il lavoro viene recuperato dopo un ricaricamento. Il sistema dimostra almeno un confine pedagogico e un caso di incertezza, usa materiale reale e rende visibile la memoria di una difficoltà.

Da definire durante l'implementazione: modello AI e budget, materiale autorizzato per la demo, dispositivo/browser di riferimento e tempi di conservazione dei dati.
