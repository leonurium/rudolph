import { Injectable, Logger } from '@nestjs/common';

export interface SearchResult {
  chunk_text: string;
  document_title: string;
  document_id: string;
  chunk_index: number;
  similarity: number;
}

@Injectable()
export class SupabaseAdapter {
  private readonly logger = new Logger(SupabaseAdapter.name);
  private readonly url: string;
  private readonly key: string;

  constructor() {
    this.url = process.env.SUPABASE_URL || '';
    this.key = process.env.SUPABASE_KEY || '';

    if (!this.url || !this.key) {
      this.logger.warn('SUPABASE_URL or SUPABASE_KEY not set');
    }
  }

  async search(
    embedding: number[],
    topK = 5,
    threshold = 0.5,
  ): Promise<SearchResult[]> {
    const fnUrl = `${this.url}/rest/v1/rpc/match_notion_chunks`;

    this.logger.debug(`Searching pgvector (top_k=${topK}, threshold=${threshold})`);

    const resp = await fetch(fnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.key,
        'Authorization': `Bearer ${this.key}`,
      },
      body: JSON.stringify({
        query_embedding: embedding,
        match_count: topK,
        match_threshold: threshold,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      this.logger.error(`Supabase search failed: ${resp.status} ${errText}`);
      throw new Error(`Supabase search failed: ${resp.status}`);
    }

    const data: SearchResult[] = await resp.json();
    this.logger.debug(`Found ${data.length} results`);
    return data;
  }
}
