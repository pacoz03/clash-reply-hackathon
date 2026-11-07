# Margine — Gateway (Person A)

Backend per il quaderno: gestisce il contratto col **frontend**, col **server AI**
(LM Studio locale, poi OpenAI) e — tramite l'interfaccia `DataService` — col
**database** (Person B, SQLite).

> Person A possiede tutto tranne il database: HTTP, validazione, provider AI,
> prompt, mapping e orchestrazione. Il database è isolato dietro `DataService`.

## Avvio

```sh
cd gateway
cp .env.example .env        # imposta GATEWAY_AI_MODEL con l'id del modello LM Studio
npm install
npm run dev                 # http://localhost:8787
```

Poi nel frontend: `VITE_TUTOR_API_URL=http://localhost:8787` (in `.env.local`) e riavvia Vite.

## Endpoint

| Metodo | Path | Descrizione |
| --- | --- | --- |
| `POST` | `/tutor/help` | AI: foto pagina + domanda → annotazione `{pageId, revision, annotation}` |
| `GET` | `/notebooks/:id` | legge un quaderno salvato |
| `POST` | `/notebooks` | salva un quaderno (backup lato server) |
| `GET` | `/health` | liveness |

## Contratti

- Richiesta `/tutor/help`: `{ pageId, revision, image (dataURL), selection|null, question, previousHints[] }`
- Risposta: `{ pageId, revision, annotation: { id, anchor, text(≤600), kind:'hint'|'question', source? } }`
- Il gateway **echeggia** `pageId`/`revision` e usa la `selection` come `anchor` (regione di default se `null`).

## Provider AI

Un solo client OpenAI-compatibile, due configurazioni (`.env`):

- `GATEWAY_AI_PROVIDER=local` → LM Studio (`GATEWAY_AI_BASE_URL`, `GATEWAY_AI_MODEL`).
- `GATEWAY_AI_PROVIDER=openai` → API OpenAI (serve `OPENAI_API_KEY`).

Il modello risponde in JSON mode (`kind`, `text`, `source?`); il mapping lo traduce
nell'annotazione e, se l'output non è valido, degrada a una domanda di chiarimento.

## Il seam con Person B

`src/data/service.ts` definisce l'interfaccia `DataService`. Oggi è implementata
da `src/data/memory.ts` (in-memory, proof of concept). Person B la sostituirà con
l'implementazione SQLite **senza toccare il resto del gateway** (vedi `src/index.ts`).
