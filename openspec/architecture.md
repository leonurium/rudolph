# Rudolph Architecture

System design for the universal RAG query bridge.

---

## System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Applications                       │
│          (Web, Mobile, Internal Tools, etc.)                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ POST /query (SSE stream)
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              Rudolph API (NestJS on Vercel)                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  QueryController                                   │  │
│  │  - /query (streaming)                              │  │
│  │  - /health                                         │  │
│  └────────────────┬────────────────────────────────────┘  │
│                   │                                         │
│  ┌────────────────▼────────────────────────────────────┐  │
│  │  QueryService                                      │  │
│  │  - route to backend adapter                        │  │
│  │  - embed question via 9Router                      │  │
│  │  - retrieve context from backend                   │  │
│  │  - call LLM with streaming                         │  │
│  └────────────────┬──────────────┬────────────────────┘  │
│                   │              │                         │
│  ┌────────────────▼──┐  ┌────────▼──────────────────┐    │
│  │ RAG Adapters      │  │ Vector Embedding         │    │
│  │                   │  │ ┌────────────────────┐    │    │
│  │ - Supabase        │  │ │ 9Router            │    │    │
│  │ - Pinecone (v2+)  │  │ │ (text-embedding-   │    │    │
│  │ - Weaviate (v2+)  │  │ │  3-small)          │    │    │
│  └───────────────────┘  │ └────────────────────┘    │    │
│                         │                            │    │
│                         │ ┌────────────────────┐    │    │
│                         │ │ LLM Provider       │    │    │
│                         │ │ ┌────────────────┐ │    │    │
│                         │ │ │ 9Router        │ │    │    │
│                         │ │ │ (minimax 2.7,  │ │    │    │
│                         │ │ │  streaming)    │ │    │    │
│                         │ │ └────────────────┘ │    │    │
│                         │ └────────────────────┘    │    │
└─────────────────────────┼──────────────────────────┘    │
                          │
└──────────────────────────┼──────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
    ┌──────▼─────┐  ┌──────▼─────┐  ┌──────▼──────┐
    │ Supabase   │  │ Pinecone   │  │ Weaviate   │
    │ pgvector   │  │ (future)   │  │ (future)   │
    │            │  │            │  │            │
    │ - Vectors  │  │ - Vectors  │  │ - Vectors  │
    │ - Context  │  │ - Context  │  │ - Context  │
    └────────────┘  └────────────┘  └────────────┘
```

---

## Data Flow (Query)

```
1. Client POST /query
   ├─ question: "What is the RAG pipeline?"
   ├─ project_id: "notion-rag"
   └─ filters: { source: "notes" }

2. QueryController
   ├─ Validate request
   └─ Stream response back to client

3. QueryService
   ├─ Get backend config for project_id
   ├─ Call 9Router: embed(question)
   │  └─ Returns embedding vector
   ├─ Call Supabase: search(vector, top_k=5)
   │  └─ Returns [{ chunk, score, source }]
   ├─ Format prompt: question + context
   └─ Call 9Router: stream_llm(prompt)
      ├─ Token 1: "The"
      ├─ Token 2: " RAG"
      ├─ ...
      └─ Done

4. Response
   ├─ Stream each token to client (SSE)
   ├─ Buffer citations
   └─ Send citations on done
```

---

## Component Details

### QueryController
- REST endpoint: `POST /query`
- Validates request (Zod schema)
- Sets SSE headers
- Calls QueryService
- Streams response
- Error handling

### QueryService
- Routes to correct adapter (Supabase, Pinecone, etc.)
- Orchestrates: embed → search → format → stream
- Caching layer (optional, v2)
- Error recovery

### Supabase Adapter (v1)
```typescript
class SupabaseAdapter {
  async search(vector: number[], topK: number): Promise<Result[]> {
    // Call Supabase: match_notion_chunks()
    // Returns { chunk_text, document_title, chunk_index }
  }
}
```

### 9Router Integration
```typescript
class EmbeddingService {
  async embed(text: string): Promise<number[]> {
    // POST https://router.schoolday.web.id/v1/embeddings
    // Model: text-embedding-3-small
  }

  async *streamLLM(prompt: string): AsyncGenerator<string> {
    // POST https://router.schoolday.web.id/v1/chat/completions
    // Model: minimax-01
    // stream: true
  }
}
```

---

## Deployment: Vercel Serverless

### vercel.json
```json
{
  "version": 2,
  "builds": [
    { "src": "api/index.ts", "use": "@vercel/node", "config": { "includeFiles": ["dist/**"] } }
  ],
  "routes": [
    { "src": "/(.*)", "dest": "api/index.ts" }
  ]
}
```

### src/main.ts (Dual Mode)
```typescript
// Serverless mode
export default async function handler(req, res) {
  const app = await createNestApp();
  app(req, res);
}

// Local mode
if (require.main === module) {
  NestFactory.create(AppModule).then(app => app.listen(3000));
}
```

### Timeout Budget (10s on Vercel Hobby)
```
[1-2s]  Embed question via 9Router
[0.5s]  Vector search in Supabase
[2-3s]  LLM first token from 9Router
─────────────────────────────────
[~3.5-5.5s]  Before streaming starts ✓

[5-15s]  Stream tokens back (kept-alive via SSE)
```

---

## Configuration

### Environment Variables
```
SUPABASE_URL=https://apyfezzttydrucuqiqin.supabase.co
SUPABASE_KEY=<anon_key>
NINE_ROUTER_URL=https://router.schoolday.web.id
NINE_ROUTER_API_KEY=sk-...

# Future
PINECONE_API_KEY=
WEAVIATE_CLUSTER_URL=
```

### Backend Registry (v2)
```yaml
backends:
  supabase:
    type: supabase
    config:
      url: $SUPABASE_URL
      key: $SUPABASE_KEY
      table: notion_chunks
  pinecone:
    type: pinecone
    config:
      api_key: $PINECONE_API_KEY
      index: notion-rag
```

---

## Error Handling

### Graceful Degradation
- Embedding fails → Return error to client
- Search returns empty → Stream "No results found"
- LLM timeout → Stream partial response + "(response incomplete)"

### Logging
- Request ID for tracing
- Latency per stage
- Error categorization (client error, backend error, timeout)

---

## Testing Strategy (v1)

### Unit Tests
- Adapter interface compliance
- Prompt formatting

### Integration Tests
- End-to-end query with mocked 9Router
- Streaming response format

### Load Testing
- 10 concurrent requests
- Measure P95 latency

---

## Future Enhancements (v2+)

- [ ] Authentication (API keys, JWT)
- [ ] Rate limiting (per API key)
- [ ] Multi-tenant (project isolation)
- [ ] Caching (Redis)
- [ ] Usage analytics
- [ ] Pinecone/Weaviate adapters
- [ ] Chat history (stateful)
- [ ] Re-ranking layer
- [ ] Custom prompts per project
