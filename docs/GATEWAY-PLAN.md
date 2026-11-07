# Gateway — backend plan (v0.1)

> Historical plan imported from `chri`. It describes the earlier frontend and
> is not the current implementation status of `gian`. See
> [integration analysis](MERGE-CHRI.md) and the root README for the current backend.

The gateway is the **whole backend** for the Margine notebook. It is the single
service that does three jobs:

1. Manages the request/response contract with the **frontend** (Vite/React).
2. Manages the request/response contract with the **AI server** (local first, OpenAI later).
3. Manages the **database** (SQLite).

This document is the working plan. It is **not** implementation yet.

---

## 1. What exists today

- The repo is **frontend-only** (`margine-notebook`, React + TS + Vite). No backend exists.
- The frontend already **fixes the external contract** in `src/services/tutor.ts` and `src/model.ts`:
  - `POST /tutor/help`
  - Request: `{ pageId, revision, image (base64 dataURL), selection: {x,y,width,height}|null, question: string, previousHints: string[] }`
  - Response: `{ pageId, revision, annotation: { id, anchor{x,y,width,height}, text(1–600), kind: 'hint'|'question', source? } }`
  - Frontend validation rules the gateway must respect:
    - `pageId` and `revision` must be **echoed verbatim**.
    - `anchor` must be inside the page: `x >= 0`, `y >= 0`, `x + width <= 794`, `y + height <= page.height`.
  - `.env.example` reads the gateway origin from `VITE_TUTOR_API_URL`.
  - CORS: the gateway must allow the frontend origin.
- The `image` contains the exercise + the student's strokes, **excluding** the selection rectangle and any AI annotations.

---

## 2. Decisions (already made)

| Topic | Decision |
| --- | --- |
| Language/runtime of the gateway | **Node 22 + TypeScript** (reuse the frontend's zod schemas). |
| Database engine | **SQLite** for the prototype. Kept behind an ORM so it can move to Postgres later without a rewrite. |
| Database scope (v1) | **R11 memory** + **server-side notebook save** + **R10 course materials**. **No user/auth.** |
| AI provider (v1) | **Local = LM Studio** (OpenAI-compatible API). |
| AI provider (later) | **OpenAI** via the same interface, swapped by config only. |
| Anchor strategy (v1) | **Echo the user's `selection`** as the anchor; use a default region when `selection` is `null`. The model does **not** invent coordinates. |

---

## 3. Architecture

```
frontend (Vite/React)
   │  HTTP: POST /tutor/help, GET/POST /notebooks, GET /health
   ▼
┌─────────────────────────── GATEWAY (Node + TS) ───────────────────────────┐
│  ┌──────────────┐      ┌───────────────────┐      ┌──────────────────┐    │
│  │   ROUTES      │─────▶│   ORCHESTRATION   │─────▶│    AI PROVIDERS   │───┼──▶ LM Studio (local)
│  │  (HTTP/CORS)  │      │  tutor/help flow   │      │ local / openai   │───┼──▶ OpenAI (later)
│  │              │      │  read memory→build │      │  prompt + mapper  │    │
│  │              │      │  prompt→call AI→   │      │                   │    │
│  │              │      │  map→write memory  │      └──────────────────┘    │
│  └──────┬───────┘      └─────────┬─────────┘                              │
│         │                        │                                          │
│         └───────────────────────▶│  DATA LAYER (SQLite)                    │
│                                  │  interactions, notebooks, materials      │
│                                  └───────────────────────────────────────────┘
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Work split for 2 people

Two people own two halves. They meet at **two seams** (Section 5) and can work
in parallel.

### Person A — API + AI ("the intelligence edge")

Owns everything about **HTTP** and the **model**.

- HTTP server, all **routes** (this is the "request/response management" with the frontend):
  - `POST /tutor/help`
  - `GET /notebooks/:id` and `POST /notebooks` (server-side save/load)
  - `GET /health`
- **CORS** allow-list of the frontend origin.
- Request **validation** with the shared zod schemas; response shaping.
- **AI provider abstraction** — one interface `completeWithVision({ image, prompt }) → text` with two adapters:
  - **Local:** LM Studio (OpenAI-compatible) — `GATEWAY_AI_BASE_URL` + `GATEWAY_AI_MODEL`, no key.
  - **OpenAI:** same interface, real base URL + `OPENAI_API_KEY`.
  - Because LM Studio speaks OpenAI's API, **local → OpenAI is a config-only swap.**
- **Prompt builder** (content to be specified later): injects image, `question`, `selection`, `previousHints`; encodes the pedagogical rules from `REQUISITI.md`:
  - short, concrete hints; do **not** auto-solve; distinguish observed error from doubt; acknowledge uncertainty; **never claim to verify** the work.
- **Free-text → structured annotation mapper**: request structured JSON from the model, validate with the shared zod schema, set the **anchor** (echo selection / default region), echo `pageId`/`revision`.
- **Reliability**: timeout + abort, retry, image-size guard. On failure / unreadable input → return a *targeted clarifying question* (R12), not a fake answer.
- **Orchestration** of `/tutor/help`: read memory (via `dataService`) → build prompt → call AI → map → write memory/outcome (via `dataService`).
- Config they own: `GATEWAY_PORT`, `GATEWAY_AI_BASE_URL`, `GATEWAY_AI_MODEL`, `OPENAI_API_KEY`, `CORS_ORIGIN`.

### Person B — Data + database ("the memory")

Owns **persistence** and the `dataService` interface that A calls. **No routes, no AI.**

- **Database setup**: SQLite connection, migrations, ORM.
- **Repositories** exposed as a typed `dataService`:
  - `Interactions` — R11 memory (Section 6).
  - `Notebooks` — server-side notebook/page persistence.
  - `Materials` — R10 course materials (Section 6).
- Implements `dataService`:
  - `getPreviousHints(pageId): string[]`
  - `recordInteraction({...})`
  - `recordOutcome({...})`
  - `saveNotebook(notebook)` / `loadNotebook(id)`
  - `listMaterials(courseId?)` / `addMaterial({...})`
- Can hand A an **in-memory fake** of `dataService` early so A is never blocked.

---

## 5. The seams (freeze before anyone starts)

1. **External contract** — already fixed by the frontend. Lift the zod schemas into a
   **shared `packages/contract`** package so the gateway *and* the frontend import the
   same types (no drift). Both people depend on it.
2. **Internal `dataService` interface** — Person B defines signatures; Person A consumes
   them. A codes against it and uses the in-memory fake until B's real DB lands.
3. **Provider interface** (`completeWithVision`) — internal to Person A; its output shape
   (text vs structured JSON) drives the mapper.

---

## 6. Database schema (SQLite)

Minimal, denormalized, no auth. IDs are UUID strings (matching the frontend `uid()`).

### `materials` (R10 — dispense / appunti)
| column | type | notes |
| --- | --- | --- |
| `id` | TEXT PK | uuid |
| `course` | TEXT | course name / label |
| `title` | TEXT | document title |
| `storage_key` | TEXT | where the file is stored on disk (the original dispense/appunti file) |
| `mime` | TEXT | e.g. `application/pdf` |
| `created_at` | TEXT | ISO timestamp |

Used to ground hints in a source and to emit a **verified** `source` (doc + page/section) in the annotation. When no relevant material exists, the model must state it uses general knowledge (never invent a reference).

### `notebooks` (server-side save — backup, not cross-device sync)
| column | type | notes |
| --- | --- | --- |
| `id` | TEXT PK | notebook uuid |
| `title` | TEXT | |
| `schema_version` | INTEGER | `1` (matches frontend) |
| `payload` | TEXT | full serialized notebook JSON (pages, strokes, annotations) |
| `updated_at` | TEXT | ISO timestamp |

### `interactions` (R11 memory + R09 outcome)
| column | type | notes |
| --- | --- | --- |
| `id` | TEXT PK | uuid |
| `notebook_id` | TEXT FK→notebooks | |
| `page_id` | TEXT | the page the help referred to |
| `revision` | INTEGER | the page revision the help referred to (stale-check) |
| `difficulty` | TEXT | the observed difficulty (model output) |
| `kind` | TEXT | `hint` \| `question` |
| `annotation_text` | TEXT | the hint/question that was shown |
| `outcome` | TEXT nullable | result of the student's next attempt: `improved` \| `still-stuck` \| `unverifiable` |
| `created_at` | TEXT | ISO timestamp |
| `resolved_at` | TEXT nullable | set when an outcome is recorded |

This is the "memoria didattica minima": difficulty observed → help given → outcome after the new attempt, reusable within the session (and, since it's now persisted, across reloads).

> **No users table, no auth.** Access is not secured in v1. This must be added before any public release (see `REQUISITI.md` §6).

---

## 7. Configuration (`.env`)

```bash
# gateway
GATEWAY_PORT=8787
CORS_ORIGIN=http://localhost:5173

# ai provider (local = LM Studio)
GATEWAY_AI_BASE_URL=http://localhost:1234/v1
GATEWAY_AI_MODEL=<lm-studio-model-id>

# ai provider (openai, later) — same code path, config-only swap
OPENAI_API_KEY=

# database
GATEWAY_DB_PATH=./gateway/data/margine.db
```

Frontend stays as-is: point `VITE_TUTOR_API_URL` at `http://localhost:8787`.

---

## 8. Build order

| Step | Who | Deliverable |
| --- | --- | --- |
| 1 | A + B (together, ~30 min) | Freeze `packages/contract` (shared zod) + `dataService` interface. |
| 2 | A | Routes + LM Studio provider + prompt + mapper → `/tutor/help` works end-to-end against an **in-memory fake** `dataService`. |
| 3 | B | SQLite + migrations + `Interactions`, `Notebooks`, `Materials` repos implementing the real `dataService`. |
| 4 | A | Wire the real `dataService` into the orchestration (memory read/write, notebook save/load). |
| 5 | A | OpenAI adapter (config-only swap) + reliability hardening (timeouts, retry, R12). |
| 6 | A + B | Integration: point the frontend at the gateway via `VITE_TUTOR_API_URL`, run the full flow from `REQUISITI.md` §9. |

---

## 9. Out of scope for v1 (kept for later)

- User accounts / authentication / per-user rate limiting and data retention.
- Cross-device synchronization (the first prototype does **not** require it; the notebook server-save is a backup only).
- RAG over course materials (materials are stored and used for a verified `source` reference; full retrieval/grounding is a later module).
- Auto-correction while writing, voice, multi-agent systems (see `REQUISITI.md` §8).

---

## 10. Open items to resolve during implementation

- Exact prompt wording (Person A, with a domain reviewer).
- Which LM Studio vision model, and whether it reliably returns structured JSON.
- Storage location/format for material files on disk.
- Retention policy for `interactions` and notebooks (documented per config, per `REQUISITI.md` §6).
