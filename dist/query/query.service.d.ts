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
export declare class QueryService {
    private readonly embedding;
    private readonly llm;
    private readonly supabase;
    private readonly logger;
    constructor(embedding: EmbeddingService, llm: LLMService, supabase: SupabaseAdapter);
    query(options: QueryOptions): Promise<QueryResult>;
}
