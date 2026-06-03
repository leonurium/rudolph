import { SearchResult } from '../supabase/supabase.adapter';

export const RAG_ADAPTER = 'RAG_ADAPTER';

export interface RAGAdapter {
  search(
    embedding: number[],
    topK?: number,
    threshold?: number,
    projectId?: string,
  ): Promise<SearchResult[]>;
}
