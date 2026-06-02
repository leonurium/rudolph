import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotionChunk } from './entities/notion-chunk.entity';
import { NotionDocument } from './entities/notion-document.entity';

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

  constructor(
    @InjectRepository(NotionChunk)
    private readonly chunkRepo: Repository<NotionChunk>,
    @InjectRepository(NotionDocument)
    private readonly docRepo: Repository<NotionDocument>,
  ) {}

  async search(
    embedding: number[],
    topK = 5,
    threshold = 0.3,
  ): Promise<SearchResult[]> {
    this.logger.debug(`Searching pgvector (top_k=${topK}, threshold=${threshold})`);

    const embeddingStr = `[${embedding.join(',')}]`;

    const results = await this.chunkRepo.query(
      `
      SELECT
        nc.chunk_text,
        nd.title AS document_title,
        nd.id AS document_id,
        nc.chunk_index,
        1 - (nc.embedding <=> $1::vector) AS similarity
      FROM notion_chunks nc
      JOIN notion_documents nd ON nd.id = nc.document_id
      WHERE nc.embedding IS NOT NULL
      ORDER BY nc.embedding <=> $1::vector
      LIMIT $2
      `,
      [embeddingStr, topK],
    );

    const filtered = results.filter((r: any) => r.similarity >= threshold);
    this.logger.debug(`Found ${filtered.length} results`);
    return filtered;
  }
}
