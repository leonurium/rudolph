# Rudolph — Architecture Decision Records

Decisions made during design.

---

## ADR-1: NestJS + Express Adapter for Vercel

**Status:** Decided

**Context:**
- Need to deploy to Vercel (free tier preference)
- Must support streaming (SSE)
- You've already proven the pattern (konoland-api, aragog)

**Decision:**
Use NestJS with ExpressAdapter, dual-mode (serverless + local).

**Rationale:**
- Vercel patterns work. No reinventing.
- Express + NestJS combos are stable
- Streaming is native (res.write)
- Framework gives structure for multi-adapter pattern

**Alternatives considered:**
- Next.js API routes: simpler, but less extensible for multi-adapter
- FastAPI (Python): wrong language for monorepo
- Plain Express: no type safety

**Consequences:**
- Cold starts ~1-2s (acceptable within 10s timeout)
- Must test streaming response format

---

## ADR-2: 9Router for Embeddings & LLM

**Status:** Decided

**Context:**
- Already using 9Router for RAG ingestion
- Avoids direct OpenAI API calls (cost + vendor lock)
- Supports streaming (minimax)

**Decision:**
Use 9Router for both text-embedding-3-small and minimax LLM.

**Rationale:**
- Consistent with n8n workflow
- Cheaper than direct OpenAI (10x cost savings)
- Single auth token, no vendor fragmentation
- Streaming support for SSE

**Alternatives considered:**
- Direct OpenAI: simpler, but expensive (~$0.10 per query)
- Anthropic Claude: not available via 9Router yet

**Consequences:**
- Dependency on 9Router uptime
- Must handle 9Router rate limits / timeouts gracefully
- Fallback to degraded response if LLM fails

---

## ADR-3: Adapter Pattern for Multi-Backend

**Status:** Decided

**Context:**
- Future goal: support Pinecone, Weaviate
- Don't want to hardcode Supabase
- Clean dependency injection

**Decision:**
Define `RAGAdapter` interface, implement `SupabaseAdapter` (v1), prepare for `PineconeAdapter`, `WeaviateAdapter`.

```typescript
interface RAGAdapter {
  search(embedding: number[], topK: number): Promise<Result[]>;
  getProjectConfig(projectId: string): Promise<Config>;
}
```

**Rationale:**
- Loose coupling between query logic and backend
- Easy to test (mock adapters)
- Easy to add new backends without touching core logic

**Alternatives considered:**
- Monolithic if/else on backend type: brittle
- Plugin system: overengineered for v1

**Consequences:**
- Small upfront abstraction cost
- Rewarded when we add new backends

---

## ADR-4: Streaming (SSE) vs One-Shot Response

**Status:** Decided

**Context:**
- 10s timeout is tight
- LLM generation is slow (2-3s for full response)
- Users expect real-time feedback

**Decision:**
Stream response via Server-Sent Events (SSE).

**Rationale:**
- Keeps connection alive during LLM token generation
- UX feels faster (tokens appear as they're generated)
- Works within Vercel timeout (initial work <10s, tokens stream after)

**Alternatives considered:**
- One-shot (wait for full LLM response): might exceed 10s timeout, bad UX
- Webhook callback: adds infrastructure complexity
- Polling: inefficient

**Consequences:**
- Client must handle SSE format
- Partial responses possible (if stream interrupted)
- Must buffer citations until end

---

## ADR-5: No Authentication (v1)

**Status:** Decided

**Context:**
- Internal use only (Notion RAG)
- No client deployments yet
- Adding auth = complexity + latency

**Decision:**
Skip auth in v1. Add in v2 when multi-tenant.

**Rationale:**
- YAGNI (you aren't gonna need it yet)
- Reduces latency (no JWT parsing)
- Easy to add later (middleware layer)

**Consequences:**
- Vulnerable to abuse (public API)
- Not suitable for client-facing deployments until v2
- Must add rate limiting later for safety

---

## ADR-6: Serverless Timeout Mitigation

**Status:** Decided

**Context:**
- Vercel Hobby = 10s timeout
- Our workflow: embed (1-2s) + search (0.5s) + LLM (2-3s) = ~3.5-5.5s best case
- Worst case could exceed 10s

**Decision:**
Use streaming to keep connection alive, aggressive timeouts on sub-services, fallback to Vercel Pro if Hobby fails.

**Rationale:**
- Streaming fixes most of the problem
- 9Router timeouts prevent infinite waits
- Vercel Pro ($20/mo) is acceptable fallback for v2

**Alternatives considered:**
- Use Koyeb instead: costs more, defeats purpose
- Async webhook: adds architecture complexity

**Consequences:**
- Must monitor first-token latency
- May need to upgrade to Pro ($20/mo) if too many timeouts
- Must implement circuit breaker for 9Router failures

---

## ADR-7: Supabase pgvector (Not Pinecone v1)

**Status:** Decided

**Context:**
- Already ingesting to Supabase (n8n workflow)
- Pinecone adds cost + extra infrastructure
- pgvector is battle-tested (PostgreSQL)

**Decision:**
Use Supabase pgvector for v1. Plan Pinecone adapter for v2+.

**Rationale:**
- No new infrastructure
- HNSW index performs well (~0.5s for 5000 vectors)
- Free tier covers our use case

**Consequences:**
- Scale limit: ~10k vectors per query (after that, Pinecone makes sense)
- No specialized vector ops (re-ranking, clustering) — add when needed
- Must use Supabase pooler (port 6543) or risk connection exhaustion

---

## ADR-8: REST Only (No GraphQL)

**Status:** Decided

**Context:**
- Simple query API (one endpoint initially)
- GraphQL adds complexity (validation, caching, N+1)
- REST is simpler for streaming

**Decision:**
REST only for v1.

**Rationale:**
- KISS
- Easier to document and test
- Streaming works naturally

**Consequences:**
- Can't evolve to complex queries easily
- GraphQL easy to add in v2 if needed

---

## Changelog

| # | Date | Decision | Status |
|----|------|----------|--------|
| 1 | 2026-05-30 | NestJS + Express | Decided |
| 2 | 2026-05-30 | 9Router for embeddings & LLM | Decided |
| 3 | 2026-05-30 | Adapter pattern for backends | Decided |
| 4 | 2026-05-30 | Streaming (SSE) | Decided |
| 5 | 2026-05-30 | No auth in v1 | Decided |
| 6 | 2026-05-30 | Timeout mitigation | Decided |
| 7 | 2026-05-30 | Supabase pgvector v1 | Decided |
| 8 | 2026-05-30 | REST only v1 | Decided |
