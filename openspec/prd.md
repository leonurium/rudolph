# Rudolph — Universal RAG Query Bridge

Product Requirements Document (PRD)

---

## 1. Problem Statement

Currently, each RAG system (our Notion RAG, potential client RAGs, future LLM projects) has its own query API. If we want to:
- Query multiple RAGs in one request
- Switch RAG backends transparently
- Build client-facing RAG products
- Provide a unified query interface

...we need **one bridge API** that abstracts away the complexity.

**Rudolph** = a single, unified query API that routes to any RAG backend.

---

## 2. Vision

A **multi-tenant, backend-agnostic RAG query service** that:
- Accepts a question + optional filters
- Routes to the correct RAG backend (Supabase pgvector, Pinecone, Weaviate, etc.)
- Streams the answer back with citations
- Works for internal projects AND client white-label deployments

---

## 3. Goals

### Primary
- [ ] Build a NestJS API with streaming SSE support
- [ ] Query Supabase pgvector backend (our current RAG)
- [ ] Stream LLM responses via 9Router (minimax 2.7)
- [ ] Support multiple RAG backends (pluggable adapters)
- [ ] Deploy to Vercel (Hobby tier, streaming within 10s timeout)

### Secondary (Phase 2)
- [ ] Multi-tenant support (separate embeddings/contexts per client)
- [ ] Authentication (API key, JWT)
- [ ] Rate limiting
- [ ] Usage analytics
- [ ] Support for Pinecone, Weaviate, Milvus backends

---

## 4. Non-Goals (v1)

- Chat history / conversation memory (stateless queries only)
- Fine-tuning or re-ranking
- Document upload (assume ingestion is separate)
- GraphQL (REST only)

---

## 5. User Stories

### User: Internal (Leo + team)
> As a developer, I want to query my Notion RAG without hardcoding the n8n workflow URL, so I can use it from any app.

**Acceptance Criteria:**
- POST `/query` accepts question + optional project_id
- Returns streaming response with answer + citations
- Works from browser (CORS enabled)

### User: Future Client
> As a client, I want my app to query my custom RAG via Rudolph, so I can white-label a Q&A feature.

**Acceptance Criteria:**
- POST `/query` with API key
- Project_id identifies which RAG backend + context
- Rate limiting by API key
- Usage logged for billing

---

## 6. API Contract (v1)

### POST /query

**Request:**
```json
{
  "question": "What is the RAG pipeline?",
  "project_id": "notion-rag",
  "top_k": 5,
  "filters": {
    "source": "notes"
  }
}
```

**Response (streaming SSE):**
```
event: stream
data: {"delta": "The", "source": "minimax"}

event: stream
data: {"delta": " RAG", "source": "minimax"}

...

event: done
data: {"citations": [{"title": "...", "url": "...", "snippet": "..."}]}
```

### GET /health

Returns `{ "status": "ok" }`.

### POST /admin/register-backend (future)

Allows registering new RAG backends.

---

## 7. Technical Requirements

### Must-Have
- NestJS (TypeScript, Express adapter)
- Streaming via res.write() (SSE compatible)
- Supabase pgvector adapter
- 9Router integration (embeddings + LLM)
- Vercel deployment (serverless)

### Should-Have
- Environment-based backend selection
- Error handling + logging
- Request validation (Zod or class-validator)

### Nice-to-Have
- Docker support (for local dev)
- Swagger/OpenAPI docs
- Unit tests

---

## 8. Constraints

### Performance
- Embed + search + first token under 10s (Vercel timeout)
- Streaming to keep connection alive
- Concurrent request handling

### Cost
- Vercel: free tier
- Supabase: free tier (pgvector included)
- 9Router: token-based (usage-dependent)
- Target: <$5/month for moderate usage

### Compatibility
- Node 18+
- CommonJS for Vercel serverless
- ExpressAdapter (proven with konoland-api, aragog)

---

## 9. Acceptance Criteria

### API Contract

| ID | Criterion | Testable Condition |
|----|-----------|--------------------|
| AC-1 | POST /query accepts question + project_id | Returns 200 with SSE stream when called with valid body |
| AC-2 | POST /query rejects missing question | Returns 422 with Zod validation error |
| AC-3 | POST /query accepts optional top_k and filters | Filters passed to Supabase adapter, top_k controls result count |
| AC-4 | GET /health returns { "status": "ok" } | GET /health → 200, body matches exactly |
| AC-5 | CORS headers present | Access-Control-Allow-Origin: * on all responses |
| AC-6 | SSE event format: stream + done | events: stream (with delta), events: done (with citations) |

### Streaming

| ID | Criterion | Testable Condition |
|----|-----------|--------------------|
| AC-7 | Response is SSE (text/event-stream) | Content-Type: text/event-stream on POST /query |
| AC-8 | Each token emitted as `data: {"delta": "..."}` | Stream events contain delta field per token |
| AC-9 | Final event is `event: done` with citations | Done event contains citations array |
| AC-10 | Stream completes within 10s (Vercel hobby) | First token arrives < 10s from request start |

### 9Router Integration

| ID | Criterion | Testable Condition |
|----|-----------|--------------------|
| AC-11 | Question embedded via 9Router text-embedding-3-small | Embedding vector returned, used in Supabase search |
| AC-12 | LLM response streamed via 9Router minimax-2.7 | Tokens arrive from minimax stream |
| AC-13 | Graceful degradation on 9Router timeout | Partial stream sent + "(response incomplete)" suffix |
| AC-14 | Graceful degradation on embedding failure | Returns 502 with error message, no crash |

### Supabase Adapter

| ID | Criterion | Testable Condition |
|----|-----------|--------------------|
| AC-15 | Vector search returns top_k results | Response citations count ≤ top_k |
| AC-16 | Search uses HNSW index on notion_chunks | match_notion_chunks() called with embedding |
| AC-17 | Citation format: { title, url, snippet, score } | Each citation has all four fields |
| AC-18 | Empty search result handled | Streams "No relevant documents found" |

### Error Handling

| ID | Criterion | Testable Condition |
|----|-----------|--------------------|
| AC-19 | Invalid project_id returns 404 | No backend config → 404 with message |
| AC-20 | Supabase connection failure → 503 | DB unavailable → 503, not 500 |
| AC-21 | All errors include request_id for tracing | Error responses include X-Request-ID header |
| AC-22 | No stack traces in production responses | 5xx responses are clean JSON, no error strings leaked |

### Deployment

| ID | Criterion | Testable Condition |
|----|-----------|--------------------|
| AC-23 | Deployed to Vercel, publicly accessible | curl https://<app>.vercel.app/health → 200 |
| AC-24 | Dual-mode: serverless on Vercel, local on `npm run start:dev` | Both entrypoints serve identical API surface |
| AC-25 | Environment variables loaded at runtime | Missing SUPABASE_URL → clear startup error, not silent failure |

### Adapter Pattern (Pluggable Architecture)

| ID | Criterion | Testable Condition |
|----|-----------|--------------------|
| AC-26 | RAGAdapter interface exists | SupabaseAdapter satisfies RAGAdapter contract |
| AC-27 | New adapter can be added without modifying QueryService | New adapter class implements RAGAdapter → works without code changes |

---

## 10. Success Metrics
- [ ] API deployed to Vercel, publicly accessible
- [ ] Query latency P95 < 5s (embed + search + LLM first token)
- [ ] Handles 10 concurrent requests without timeout
- [ ] Supports 2+ backends (Supabase, future Pinecone)
- [ ] Documentation complete (API, deployment, architecture)

---

## 11. Timeline (Rough Estimate)

- **Phase 0 (this week):** Architecture + PRD ← **You are here**
- **Phase 1 (3-5 days):** NestJS scaffold, Supabase adapter, streaming endpoint
- **Phase 2 (2-3 days):** 9Router LLM integration, error handling
- **Phase 3 (1-2 days):** Vercel deployment, testing
- **Phase 2+ (future):** Auth, multi-tenant, additional backends

---

## 12. Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| 10s timeout too tight | Medium | High | Streaming + aggressive caching, fallback to async if needed |
| Cold starts slow | Medium | Medium | Use Vercel Pro ($20/mo) if Hobby fails |
| 9Router rate limits | Low | Medium | Batch requests, implement queue |
| Supabase connection exhaustion | Low | High | Use pgBouncer or Supabase pooler |

---

## 13. Out of Scope (Parking Lot)

- Multi-language support (v1 English only)
- Webhook callbacks
- Batch query endpoint
- Local LLM fallback
- Vector reranking
