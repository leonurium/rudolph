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
export declare class SupabaseAdapter {
    private readonly chunkRepo;
    private readonly docRepo;
    private readonly logger;
    constructor(chunkRepo: Repository<NotionChunk>, docRepo: Repository<NotionDocument>);
    search(embedding: number[], topK?: number, threshold?: number): Promise<SearchResult[]>;
}
