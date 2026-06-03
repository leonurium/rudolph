# Rudolph — Universal RAG Query Bridge

Streaming query API for your Notion RAG system. Ask questions in natural language, get answers backed by content ingested from Notion into pgvector.

```
Client → POST /query (SSE) → Rudolph → Embed → Vector Search → LLM → Stream answer
```

---

## Architecture

```
┌──────────────┐     ┌────────────────────────────────────────────────┐
│   Client     │     │              Rudolph (NestJS)                  │
│              │     │                                                │
│  curl / App  │────▶│  QueryController ──▶ QueryService              │
│              │     │       │                    │                   │
└──────────────┘     │       │              ┌─────┴──────┐           │
                     │       │              │ Embedding  │            │
                     │       │              │ Service    │            │
                     │       │              └─────┬──────┘            │
                     │       │              ┌─────┴──────┐            │
                     │       │              │ Supabase   │            │
                     │       │              │ Adapter    │            │
                     │       │              └─────┬──────┘            │
                     │       │              ┌─────┴──────┐            │
                     │       │              │ LLM Service│            │
                     │       │              └─────┬──────┘            │
                     │◀──── SSE stream ───────────┘                  │
                     └────────────────────────────────────────────────┘
                                                  │
                                  ┌───────────────┼───────────────┐
                                  │               │               │
                           ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
                           │  9Router    │  │  Supabase   │  │  9Router    │
                           │  Embeddings │  │  pgvector   │  │  LLM        │
                           │ text-embed- │  │  notion_    │  │  minimax    │
                           │ ding-3-small│  │  chunks     │  │             │
                           └─────────────┘  └─────────────┘  └─────────────┘
```

### Key Components

| Component | Role |
|---|---|
| **QueryController** | `POST /query` — validates input, sets SSE headers, streams response |
| **QueryService** | Orchestrates: embed → search → format → LLM stream |
| **EmbeddingService** | Converts question to vector via 9Router (text-embedding-3-small) |
| **SupabaseAdapter** | Vector search against pgvector (notion_chunks table) |
| **LLMService** | Streams LLM response via 9Router |

### Pre-LLM Guard

When vector search returns **0 relevant chunks**, Rudolph skips the LLM entirely and returns an immediate `event: done` with empty citations. This:

- Saves token cost (no LLM call for empty context)
- Prevents hallucination (LLM can't make things up when no data exists)
- Gives client clear signal via empty `citations[]`

### Similarity Threshold

Default: **0.3** (cosine similarity)

- Chunks with similarity ≥ 0.3 are returned as context to the LLM
- Lower = more results, more noise. Higher = fewer results, stricter matching
- Override per-query: `{"threshold": 0.5}`

Found via testing that real semantic matches average 0.35–0.6. Setting 0.3 captures relevant content while filtering out noise. The Pre-LLM Guard handles the zero-results case when no content matches.

---

## API

### POST /query

Streams answer via Server-Sent Events.

**Request:**
```json
{
  "question": "what is the VPS security approach?",
  "project_id": "optional-project-id",
  "top_k": 5,
  "threshold": 0.3,
  "system_prompt": "optional custom system prompt"
}
```

| Field | Default | Description |
|---|---|---|
| `question` | (required) | Natural language question |
| `project_id` | null | Scope search to specific project |
| `top_k` | 5 | Max chunks to retrieve |
| `threshold` | 0.3 | Minimum similarity score (0–1) |
| `system_prompt` | default | Override LLM system prompt |

**Response (SSE):**
```
data: {"delta":"SSH port change 22 to 1908."}
data: {"delta":" fail2ban: maxretry 3..."}
event: done
data: {"citations":[
  {"title":"🔒 VPS Security...","snippet":"Background...","similarity":0.458}
],"latency":{"embed":700,"search":35,"llmFirstToken":4494}}
```

Client should listen for `event: done` and display `citations` as source references.

**Error responses:**
- `400` — Validation error (missing/invalid question)
- `422` — Unprocessable entity (question is empty/whitespace)
- `404` — Project ID not found

### GET /health

```json
{"status":"ok"}
```

---

## Setup

### Prerequisites

- Node.js 22.x
- npm
- Supabase project with pgvector
- 9Router instance (or compatible OpenAI API proxy)

### Environment Variables

Copy `.env.example` to `.env` and fill:

```env
DATABASE_URL=postgres://user:pass@host:6543/postgres?pgbouncer=true
NINE_ROUTER_URL=https://your-router.koyeb.app
NINE_ROUTER_API_KEY=sk-...
LLM_MODEL_EMBEDDING=openrouter/openai/text-embedding-3-small
LLM_MODEL=openai/minimax/MiniMax-M1
```

### Install & Run

```bash
npm install
npm run build
npm start              # production
npm run start:dev      # dev with hot-reload
```

### Test

```bash
npm test               # unit tests (65+ tests)
npm run test:e2e       # e2e tests (mocked)
npm run test:e2e:live  # e2e tests (live Supabase + 9Router)
```

---

## Ingestion Pipeline

Content is ingested from Notion → chunked → embedded → stored in Supabase pgvector via **n8n**.

Rudolph is **read-only** on the database. It doesn't modify ingested data.

### Database Schema

```sql
notion_documents
  id (uuid), project_id, document_id, title, document_type

notion_chunks
  id (uuid), document_id (fk), chunk_text, chunk_index,
  embedding (vector(1536)), project_id, content_hash
```

---

## Deployment

### Vercel

```bash
vercel --prod
```

The app runs in dual mode:
- **Serverless:** Vercel function handler
- **Local:** Standalone Node.js server (port 3099)

Vercel config: `vercel.json` — routes all paths to the NestJS adapter.

### Local Dev

Port 3000 is reserved for WhatsApp bridge. Run on alternate port:

```bash
PORT=3099 npm run start:dev
```

---

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | NestJS + Express | Type-safe, modular, proven with Vercel |
| Embeddings | 9Router (text-embedding-3-small) | Cheap, consistent with n8n pipeline |
| LLM | 9Router (MiniMax-M1) | Streaming, cost-effective |
| Vector DB | Supabase pgvector | Free tier, already used for ingestion |
| Response | SSE streaming | Keeps Vercel 10s timeout alive, better UX |
| Pre-LLM guard | skip LLM on empty context | Saves tokens, prevents hallucination |
| Threshold | 0.3 default | Captures real semantic matches (0.35–0.6) |

---

## Project Structure

```
src/
├── query/            Query controller + service
│   ├── query.controller.ts
│   ├── query.service.ts
│   └── query.module.ts
├── embedding/        Embedding service (9Router)
├── llm/              LLM service (9Router streaming)
├── supabase/         Supabase pgvector adapter
│   ├── supabase.adapter.ts
│   └── entities/     TypeORM entities
├── rag/              RAGAdapter interface (= pluggable backends)
├── health/           Health check endpoint
├── home/             Home route
├── app.module.ts     Root module
├── bootstrap-app.ts  NestJS factory
├── main.ts           Dual-mode entry (serverless + local)
└── vercel-listener.ts Vercel serverless handler
```

---

## Related

- **Ingestion:** Managed by n8n — https://github.com/leonurium/n8n-config
- **API Gateway:** Cloudflare tunnel — `*.demo.leonurium.com → localhost:3000`

---

## History

- **0.1.0** — Initial release: SSE streaming, Supabase pgvector, 9Router embeddings + LLM
- Additions: Pre-LLM guard (skip LLM on empty context), threshold tuned to 0.3, prompt hardened against "no info" hedging
