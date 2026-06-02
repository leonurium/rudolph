import { SupabaseAdapter, SearchResult } from './supabase.adapter';
import { NotionChunk } from './entities/notion-chunk.entity';
import { NotionDocument } from './entities/notion-document.entity';

describe('SupabaseAdapter', () => {
  let adapter: SupabaseAdapter;
  let mockChunkRepo: any;
  let mockDocRepo: any;

  const mockResults = [
    { chunk_text: 'Chunk one', document_title: 'Doc One', document_id: 'd1', chunk_index: 0, similarity: 0.9 },
    { chunk_text: 'Chunk two', document_title: 'Doc Two', document_id: 'd2', chunk_index: 1, similarity: 0.7 },
    { chunk_text: 'Below threshold', document_title: 'Doc Three', document_id: 'd3', chunk_index: 2, similarity: 0.3 },
  ];

  beforeEach(() => {
    mockChunkRepo = {
      query: jest.fn().mockResolvedValue([...mockResults]),
    };
    mockDocRepo = {};
    adapter = new SupabaseAdapter(mockChunkRepo, mockDocRepo);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('is defined', () => {
    expect(adapter).toBeDefined();
  });

  describe('search()', () => {
    it('calls chunkRepo.query with the vector SQL', async () => {
      const vector = [0.1, 0.2, 0.3];
      await adapter.search(vector);
      expect(mockChunkRepo.query).toHaveBeenCalled();
      const [sql] = mockChunkRepo.query.mock.calls[0];
      expect(sql).toContain('notion_chunks');
      expect(sql).toContain('notion_documents');
      expect(sql).toContain('<=> $1::vector');
    });

    it('passes embedding as vector string', async () => {
      const vector = [0.1, 0.2, 0.3];
      await adapter.search(vector);
      const [, params] = mockChunkRepo.query.mock.calls[0];
      expect(params[0]).toBe('[0.1,0.2,0.3]');
    });

    it('passes topK as LIMIT parameter', async () => {
      const vector = [0.1, 0.2, 0.3];
      await adapter.search(vector, 10);
      const [, params] = mockChunkRepo.query.mock.calls[0];
      expect(params[1]).toBe(10);
    });

    it('defaults topK to 5', async () => {
      const vector = [0.1, 0.2, 0.3];
      await adapter.search(vector);
      const [, params] = mockChunkRepo.query.mock.calls[0];
      expect(params[1]).toBe(5);
    });

    it('filters out results below threshold', async () => {
      const vector = [0.1, 0.2, 0.3];
      const results = await adapter.search(vector, 5, 0.5);
      expect(results).toHaveLength(2);
      expect(results.map((r: any) => r.similarity)).toEqual([0.9, 0.7]);
    });

    it('returns empty array when all results below threshold', async () => {
      const vector = [0.1, 0.2, 0.3];
      const results = await adapter.search(vector, 5, 0.95);
      expect(results).toHaveLength(0);
    });

    it('returns all results when threshold is 0', async () => {
      const vector = [0.1, 0.2, 0.3];
      const results = await adapter.search(vector, 5, 0);
      expect(results).toHaveLength(3);
    });

    it('returns SearchResult shape for each result', async () => {
      const vector = [0.1, 0.2, 0.3];
      const results = await adapter.search(vector, 5, 0);
      results.forEach((r: any) => {
        expect(r).toMatchObject({
          chunk_text: expect.any(String),
          document_title: expect.any(String),
          document_id: expect.any(String),
          chunk_index: expect.any(Number),
          similarity: expect.any(Number),
        });
      });
    });
  });
});
