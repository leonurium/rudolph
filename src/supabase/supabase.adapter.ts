import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotionChunk } from './entities/notion-chunk.entity';
import { NotionDocument } from './entities/notion-document.entity';
import { RAGAdapter } from '../rag/rag-adapter.interface';

export interface SearchResult {
  chunk_text: string;
  document_title: string;
  document_id: string;
  chunk_index: number;
  similarity: number;
}

@Injectable()
export class SupabaseAdapter implements RAGAdapter {
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
    projectId?: string,
  ): Promise<SearchResult[]> {
    const ctx = projectId ? `project=${projectId}` : 'no-project';
    this.logger.debug(`Searching pgvector (top_k=${topK}, threshold=${threshold}, ${ctx})`);

    const embeddingStr = `[${embedding.join(',')}]`;

    const params: any[] = [embeddingStr, topK];
    const conditions: string[] = ['nc.embedding IS NOT NULL'];
    let paramIdx = 3;

    if (projectId) {
      // Filter by project_id — null-safe: existing rows without project_id are excluded
      conditions.push(`nc.project_id = $${paramIdx}`);
      params.push(projectId);
      paramIdx++;
    }

    const whereClause = conditions.join(' AND ');

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
      WHERE ${whereClause}
      ORDER BY nc.embedding <=> $1::vector
      LIMIT $2
      `,
      params,
    );

    const filtered = results.filter((r: any) => r.similarity >= threshold);
    this.logger.debug(`Found ${filtered.length} results`);
    return filtered;
  }

  async projectExists(projectId: string): Promise<boolean> {
    const count = await this.docRepo.count({
      where: { projectId } as any,
    });
    return count > 0;
  }
}
