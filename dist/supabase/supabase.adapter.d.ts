export interface SearchResult {
    chunk_text: string;
    document_title: string;
    document_id: string;
    chunk_index: number;
    similarity: number;
}
export declare class SupabaseAdapter {
    private readonly logger;
    private readonly url;
    private readonly key;
    constructor();
    search(embedding: number[], topK?: number, threshold?: number): Promise<SearchResult[]>;
}
