import { Injectable, Logger } from '@nestjs/common';
import { EmbeddingService } from '../embedding/embedding.service';
import { LLMService, LLMStreamChunk } from '../llm/llm.service';
import { SupabaseAdapter, SearchResult } from '../supabase/supabase.adapter';

export interface QueryOptions {
  question: string;
  projectId?: string;
  topK?: number;
  threshold?: number;
  systemPrompt?: string;
}

export interface QueryResult {
  stream: AsyncGenerator<LLMStreamChunk>;
  citations: SearchResult[];
  latency: {
    embed: number;
    search: number;
    llmFirstToken: number;
    total: number;
  };
}

@Injectable()
export class QueryService {
  private readonly logger = new Logger(QueryService.name);

  constructor(
    private readonly embedding: EmbeddingService,
    private readonly llm: LLMService,
    private readonly supabase: SupabaseAdapter,
  ) {}

  async query(options: QueryOptions): Promise<QueryResult> {
    const { question, topK = 5, threshold = 0.5, systemPrompt } = options;
    const start = Date.now();

    // 1. Embed the question
    const embedStart = Date.now();
    const vector = await this.embedding.embed(question);
    const embedTime = Date.now() - embedStart;
    this.logger.log(`Embedding: ${embedTime}ms`);

    // 2. Vector search
    const searchStart = Date.now();
    const citations = await this.supabase.search(vector, topK, threshold);
    const searchTime = Date.now() - searchStart;
    this.logger.log(`Search: ${searchTime}ms (${citations.length} results)`);

    // 3. Format prompt with context
    const context = citations
      .map((c, i) => `[${i + 1}] ${c.document_title}: ${c.chunk_text}`)
      .join('\n\n');

    const defaultSystem = `You are a helpful assistant. Answer the question based on the provided context. If the context doesn't contain enough information, say so. Cite sources using [N] notation.`;

    const prompt = `Context:\n${context}\n\nQuestion: ${question}\n\nAnswer:`;

    // 4. Start streaming LLM (latency fields updated as the stream runs)
    const llmStart = Date.now();
    let firstToken = true;
    const latency = {
      embed: embedTime,
      search: searchTime,
      llmFirstToken: 0,
      total: 0,
    };

    const setupTime = Date.now() - start;
    this.logger.log(`Total setup: ${setupTime}ms`);

    const wrappedStream = (async function* (self: QueryService) {
      for await (const chunk of self.llm.stream(prompt, systemPrompt || defaultSystem)) {
        if (firstToken && chunk.delta) {
          latency.llmFirstToken = Date.now() - llmStart;
          self.logger.log(`LLM first token: ${latency.llmFirstToken}ms`);
          firstToken = false;
        }
        yield chunk;
      }
      latency.total = Date.now() - start;
    })(this);

    return {
      stream: wrappedStream,
      citations,
      latency,
    };
  }
}
