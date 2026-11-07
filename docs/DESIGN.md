# Margine — linee guida di design v0.1

Stato: proposta del 7 novembre 2026, nata da una ricerca esterna e da un audit di `src/styles.css`. **I passi 1–3 dell'ordine di applicazione (sezione 8) sono applicati al codice** (variabili CSS, testo da 12px, penna blu, annotazioni tutor tratteggiate); restano i bordi dei controlli, i fondi di hover ancora in esadecimale (circa 59 valori nel CSS) e la prova su iPad. I valori sono in [`design/margine.tokens.json`](../design/margine.tokens.json); questo documento spiega le scelte e le regole d'uso. Il contesto di prodotto è in `REQUISITI.md`, la direzione estetica scelta dall'utente in `.impeccable.md`.

Come usare questo documento: ogni nuova schermata o modifica visiva parte dai token, rispetta le regole delle sezioni 3–7 e supera la checklist della sezione 9. Se una regola va infranta, si aggiorna prima il documento.

## 1. Identità

- **Nome**: Margine. Il margine è il punto del foglio dove il tutor scrive, accanto ai passaggi dello studente.
- **Personalità**: calma, precisa, incoraggiante (da `.impeccable.md`).
- **Direzione estetica**: quaderno minimale. Carta chiara, inchiostro scuro, verde inchiostro, un accento salvia. Il foglio è il centro dell'interfaccia.
- **Wordmark**: `margine.` in minuscolo, Lora 400, 33px, crenatura −0,05em; il punto finale è salvia. Il punto ha contrasto 3,5:1 sul pannello: è accettabile solo perché decorativo e di corpo grande.
- **Motivo del marchio**: il filetto verticale con la penna (`.margin-symbol`). È l'elemento riconoscibile da riusare per stati vuoti e introduzioni, sempre in verde tutor.
- **Voce**: italiano, "tu", frasi brevi e concrete. Il tutor fa domande e dà indizi, non giudica e non dichiara "giusto" o "sbagliato" se non può verificarlo. Esempi già nell'app da prendere come modello: "Il ragionamento è tuo.", "Un passaggio alla volta.", "Il tuo lavoro è al sicuro: riprova tra poco."

## 2. Principi (derivati da `.impeccable.md` e dalla ricerca)

1. **Il foglio viene prima.** Strumenti compatti, nessun elemento decorativo che compete con la scrittura.
2. **Studente e tutor sono sempre distinguibili**, anche senza vedere i colori.
3. **Il colore non è mai l'unico segnale.** Ogni stato ha anche forma, tratteggio, icona o parola.
4. **Leggibile a distanza di braccio su iPad.** Testo minimo 12px, bersagli di tocco da 44px con tocco o penna.
5. **Dichiarare ciò che non si sa**: la modalità demo e i limiti del tutor sono sempre visibili, con testo leggibile.
6. **Pochi valori, usati bene.** Si usano solo i token; un colore o una misura nuovi richiedono un nuovo token.

## 3. Colore

### 3.1 Palette

| Gruppo | Token | Valore | Uso |
| --- | --- | --- | --- |
| Superfici | `surface.paper` | `#FFFEF9` | Foglio e miniature |
| | `surface.canvas` | `#EEEFE7` | Area di lavoro attorno al foglio |
| | `surface.bg` | `#F5F4EE` | Sfondo app, barra a piè di pagina |
| | `surface.panel` | `#FAFAF5` | Header, pagine, pannello tutor, toolbar |
| Testo | `text.primary` | `#2D3B32` | Testo principale (10,2:1 su canvas) |
| | `text.secondary` | `#4A5A4E` | Etichette e supporto (6,3:1) |
| | `text.tertiary` | `#5A6A5C` | Segnaposto, metadati (5,0:1) |
| Marchio | `brand.green` | `#344D3D` | Pulsante primario |
| | `brand.sage` | `#6F8F3F` | Solo decorativo o testo grande |
| | `brand.sage-soft` | `#E8EFCF` | Riempimenti morbidi, selezionato |
| Tutor | `tutor.fill` / `tutor.edge` | `#E3EDE2` / `#2F5A43` | Annotazioni e identità del tutor |
| Penne | `pen.ink` | `#273C46` | Inchiostro predefinito |
| | `pen.blue` | `#2A5C8A` | Penna blu (sostituisce il verde) |
| | `pen.terracotta` | `#B4532F` | Penna terracotta |
| Stato | `state.notice-*`, `state.error-text`, `state.selection`, `state.focus` | vedi token | Avvisi, errori, selezione, focus |

### 3.2 Regole

- **Il verde appartiene al tutor e al marchio, mai alla penna dello studente.** Oggi `#4C7052` è la penna verde e dista pochissimo dal verde del tutor: il confronto resta circa 10 di ΔE anche con deuteranopia. Si sostituisce con `pen.blue`.
- **Il foglio resta neutro.** Solo carta, righe o punti e i tratti. Nessun colore di marca dentro la carta, tranne le annotazioni del tutor.
- **Contrasti minimi**: testo normale 4,5:1, testo grande (≥24px, o ≥18,5px in grassetto) 3:1, componenti e bordi che li identificano 3:1. I separatori puramente decorativi sono esenti.
- **Grigi di testo**: ne esistono tre. Un quarto grigio non si aggiunge. Il testo tra `text.tertiary` e il canvas non scende sotto 4,5:1.
- **Stati disabilitati**: opacità 0,35 resta ammessa (i componenti inattivi sono esenti da WCAG 1.4.11).
- **Coppie rosso-verde**: da evitare per distinguere due stati. Le penne usano inchiostro scuro, blu e terracotta; il confronto blu/terracotta resta sopra 60 di ΔE in tutte le simulazioni calcolate.
- **Modalità scura**: non definita in questa versione. Va ricercata a parte prima di progettarla: un quaderno scuro cambia leggibilità di inchiostro e annotazioni.

## 4. Studente e tutor

| | Studente | Tutor |
| --- | --- | --- |
| Colore | `pen.*` | `tutor.fill` e `tutor.edge` |
| Forma | Tratto pieno | Riquadro tratteggiato, filetto a sinistra |
| Segno non cromatico | — | Icona e numero (01, 02) e etichetta "Domanda del tutor" |
| Livello | Foglio | Livello separato, nascondibile e rimovibile |
| Stato in demo | — | Etichetta DEMO nel pannello e fonte "Demo locale" nell'annotazione |

La selezione è un terzo elemento di interfaccia: rettangolo **tratteggiato** `state.selection`, mai pieno. Il blu della selezione è vicino al blu della penna: si distinguono per forma (tratteggio contro tratto pieno).

## 5. Tipografia

- **DM Sans** (`font.family.ui`): interfaccia. Pesi installati 400, 500, 600.
- **Lora** (`font.family.voice`): voce del marchio e del tutor, titoli. Installati solo 400 e 400 corsivo. Per aggiungere un peso va prima importato in `src/main.tsx`.
- **Caveat** (`font.family.hand`): solo nel foglio, per simulare la scrittura a mano nei contenuti di esempio. Mai in pulsanti o pannelli.
- **Scala**: 12 (caption) · 14 (interfaccia) · 15 (corpo) · 16 (campi) · 20 · 26 · 33 (wordmark). **Minimo assoluto 12px.**
- **Interlinea**: 1,2 per titoli, 1,45 per interfaccia, 1,6 per testo continuo.
- **Maiuscolo con spaziatura** solo per etichette di sezione, a 12px e `text.secondary` o più scuro.
- **Lunghezza di riga**: i suggerimenti del tutor non superano circa 60 caratteri per riga; il pannello laterale lo garantisce.

Nota sulla ricerca: le prove su serif contro sans-serif sono contrastanti. La scelta di usare sans per l'interfaccia e serif per i contenuti discorsivi è una convenzione diffusa, non un risultato dimostrato. Vale come scelta di marchio.

## 6. Spaziatura, forma, movimento

- **Griglia base 4px**: 4, 8, 12, 16, 24, 32, 48.
- **Raggi**: 4 (chip, miniature), 6 (pulsanti), 9 (toolbar), pillola per le etichette di scelta.
- **Bersagli**: `size.target-fine` 36px con mouse; `size.target-coarse` 44px con `pointer: coarse` (già implementato). Mai sotto i 24px, mai bersagli adiacenti senza spazio.
- **Distanza tra controlli** nella toolbar: almeno 4px; sulle penne, almeno 8px.
- **Ombre**: leggere e basse. Solo foglio, toolbar e cassetti.
- **Movimento**: 150ms, solo cambi di stato. `prefers-reduced-motion` va sempre rispettato (già implementato).
- **Icone**: `lucide-react`, tratto sottile. Dimensioni 16 e 20. Ogni pulsante solo icona ha `aria-label`.

## 7. Layout dell'app

- **Tre colonne**: pagine, foglio, tutor. Il foglio è sempre la colonna elastica.
- **Larghezze**: pagine 162–220px, tutor 250–310px. Sotto i 1000px il tutor diventa cassetto; sotto i 650px anche la barra delle pagine.
- **Margini di sicurezza**: su iPad lasciare almeno 16–20pt ai bordi, come indicato da Apple per i layout adattivi.
- **La pagina logica è larga 794 unità**; le annotazioni usano sempre coordinate di pagina, mai di schermo.

## 8. Audit del codice attuale (7 novembre 2026)

Misurato su `src/styles.css`. Il calcolo del contrasto è nostro, con la formula WCAG; non sostituisce una verifica con strumenti sullo schermo reale.

| Voce | Rilievo | Priorità |
| --- | --- | --- |
| Grigi di testo | 40 valori diversi di `color`. Solo 7 raggiungono 4,5:1 sul canvas; 17 stanno sotto 3:1 | Alta |
| Dimensione del testo | 38 dichiarazioni a 8–10px, 13 a 11px, solo 3 a 12px. Sotto il minimo proposto | Alta |
| Penna verde | `#4C7052` vicina al verde del tutor e confondibile con la terracotta con protanopia (ΔE 9,8) | Alta |
| Etichetta DEMO e disclosure | 8–9px con contrasti di 2,9–3,6:1: l'informazione più importante sulla natura del tutor è la meno leggibile | Alta |
| Bordo campi | `#DFE4D5`, ~1,2:1: il campo si riconosce solo per il fondo | Media |
| Avviso | `#806749` su `#F5EDDB` = 4,56:1, al limite | Bassa |
| Verdi scuri quasi uguali | `#283C32`, `#2D3B32`, `#344D3D`, `#293B34`, `#35483C` | Media |
| Segnaposto e testi di stato vuoto | Grigi molto chiari (`#9BA58F`, `#A0A891`) | Alta |
| Punto del wordmark | `#809D4F` 2,9:1; con `#6F8F3F` sale a 3,5:1 | Bassa |
| Campi di testo | 11px; sotto i 16px iOS può ingrandire la pagina al focus: da provare su iPad | Media |

Il pulsante primario (`#F3F7E7` su `#344D3D`, 8,5:1), il testo principale e i colori della selezione sono già a posto.

### Ordine consigliato di applicazione

1. Estrarre i token come variabili CSS e sostituire i 40 grigi con i tre toni di testo.
2. Alzare il testo minimo a 12px e portare etichette DEMO, disclosure e metadati ad almeno `text.tertiary`.
3. Sostituire la penna verde con la blu e aggiornare la copia ("Inchiostro blu").
4. Dare ai campi e ai controlli un bordo `line.ui`.
5. Verificare tutto su iPad reale con Apple Pencil, insieme alle prove già previste in `docs/VERIFICA.md`.

Mappatura per `src/styles.css`:

```css
:root {
  --paper: #FFFEF9;  --canvas: #EEEFE7;  --bg: #F5F4EE;  --panel: #FAFAF5;
  --ink: #2D3B32;  --ink-2: #4A5A4E;  --ink-3: #5A6A5C;
  --green: #344D3D;  --green-hover: #253F2E;  --sage: #6F8F3F;  --sage-soft: #E8EFCF;
  --tutor-fill: #E3EDE2;  --tutor-edge: #2F5A43;
  --line: #E2E4DA;  --line-ui: #7F8A7B;
  --focus: #628548;
}
```

## 9. Checklist per ogni modifica visiva

- Usa solo token; nessun esadecimale nuovo nel CSS o nei componenti.
- Testo ≥12px; contrasto ≥4,5:1 (≥3:1 se grande).
- Bordi e icone necessari a capire un controllo ≥3:1.
- Nessuna informazione affidata solo al colore.
- Il tutor e lo studente restano distinguibili in bianco e nero.
- Bersagli ≥44px con `pointer: coarse`.
- Testo dell'interfaccia in italiano, breve e concreto.
- Funziona a 1024×768 e a larghezza telefono.

## 10. Fonti e affidabilità

Fonti normative o ufficiali:
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) per contrasto del testo (1.4.3) e bersagli (2.5.8); [Understanding 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html): almeno 24×24 CSS px per i bersagli; [Understanding 1.4.11](https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html): 3:1 per componenti e grafica significativa.
- [Apple HIG, Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility): controlli 44×44pt predefiniti, 28×28pt minimi, con spaziatura attorno. Pagina di ricerca datata: **da rileggere sulla versione corrente**; non ho verificato la sezione specifica sull'Apple Pencil né il testo minimo consigliato.
- [Apple HIG, Layout](https://developer.apple.com/design/human-interface-guidelines/layout) e [Design Tokens Format Module (DTCG)](https://www.designtokens.org/tr/third-editors-draft/format/), in bozza: il file dei token ne segue la struttura ma non è validato.

Fonti secondarie, affidabilità media o bassa:
- Palette sicure per il daltonismo e annotazioni senza solo colore: blog e dispense (ad esempio [questo](https://www.webability.io/blog/colorblind-friendly-palette)); la coppia blu e arancione e la palette Okabe-Ito sono citate da più fonti.
- Tipografia e carico cognitivo nelle app educative: studio qualitativo su app per bambini e blog di settore; le prove su serif e sans-serif sono contrastanti.
- Confronto Goodnotes e Notability: solo recensioni, nessuna documentazione ufficiale di colori o token. Non usato per decisioni.

Calcoli propri (da ripetere dopo ogni modifica ai colori): rapporti di contrasto con la formula WCAG; distanze di colore ΔE (CIE76) con simulazione Machado per protanopia, deuteranopia, tritanopia. Sono indicativi.
