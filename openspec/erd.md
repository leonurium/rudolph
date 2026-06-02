# Rudolph ERD — Entity Relationships

Data model for Rudolph RAG Query API.

---

## Core Entities

### query_request (ephemeral, not persisted)
- `id` (string, UUID) — request ID for logging
- `question` (string) — user's question
- `project_id` (string) — which RAG backend to use
- `top_k` (int) — number of results to return
- `filters` (JSON) — optional filters (source, date_range, etc.)
- `created_at` (timestamp) — when query was made

### query_response (ephemeral, not persisted)
- `id` (string, UUID) — response ID
- `request_id` (string, FK) — link to request
- `answer` (string) — LLM-generated answer
- `citations` (JSON[]) — array of { title, url, snippet, score }
- `tokens_used` (int) — approximate token count
- `latency_ms` (int) — total query latency
- `created_at` (timestamp)

---

## Backend-Specific Schemas

### Supabase (v1)
**Existing tables (from n8n ingestion):**

```
notion_documents
├─ id (uuid, pk)
├─ project_id (string)
├─ document_id (string, unique)
├─ document_title (string)
├─ document_type (string) — "notes", "tasks", "resources"
├─ last_edited_time (timestamp)
├─ created_at (timestamp)

notion_chunks
├─ id (uuid, pk)
├─ document_id (uuid, fk → notion_documents.id)
├─ chunk_text (text)
├─ chunk_index (int)
├─ embedding (vector, 1536 dims for text-embedding-3-small)
├─ metadata (JSON) — { source, page_num, heading, etc. }
├─ created_at (timestamp)
├─ INDEX: HNSW on embedding (for fast similarity search)
```

**Query function (already exists in Supabase):**
```sql
match_notion_chunks(
  query_embedding: vector,
  match_threshold: float = 0.78,
  match_count: int = 5
)
```

### Pinecone (v2+, planned)

```
Index: rudolph-rag
├─ Namespace: notion-rag (vectors)
├─ Vector dim: 1536
├─ Metadata per vector:
│  ├─ document_title
│  ├─ chunk_text
│  ├─ source (notes, tasks, resources)
│  └─ created_at
```

### Weaviate (v2+, planned)

```
Class: NotionChunk
├─ chunk_text (Text)
├─ document_title (Text)
├─ source (String) — notes, tasks, resources
├─ embedding (Vector[1536])
├─ created_at (Date)
```

---

## Configuration Tables (v2+, future)

### projects
- `id` (string, pk)
- `name` (string)
- `backend_type` (string) — "supabase", "pinecone", "weaviate"
- `backend_config` (JSON) — connection details
- `api_key` (string, encrypted) — for clients
- `created_at` (timestamp)
- `updated_at` (timestamp)

### api_keys (v2+)
- `id` (string, pk)
- `key` (string, hashed)
- `project_id` (fk → projects)
- `created_by` (string)
- `last_used_at` (timestamp)
- `rate_limit_per_minute` (int)
- `is_active` (bool)

### query_logs (v2+, analytics)
- `id` (string, pk)
- `project_id` (fk)
- `api_key_id` (fk)
- `question` (text, truncated)
- `latency_ms` (int)
- `tokens_used` (int)
- `status` (string) — "success", "error", "timeout"
- `error_message` (string, nullable)
- `created_at` (timestamp)

---

## Relationships

```
notion_documents
       │
       │ 1:N
       │
notion_chunks ──[embedding]──→ 9Router (external)
       │
       │ retrieved by
       │
query_response
       │
       │ sourced from
       │
client ──[API key]→ projects (v2+)
```

---

## Notes

- **v1 (current):** Read-only on Supabase (ingestion done by n8n)
- **v2+:** Configuration tables for multi-tenant, auth, analytics
- **Ephemeral responses:** Query request/response not logged until v2 analytics
- **Embedding storage:** Vectors stored in pgvector, queried via HNSW index
- **No denormalization yet:** Simple flat schema, no materialized views
