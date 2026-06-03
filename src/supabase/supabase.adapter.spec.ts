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
    mockDocRepo = {
      count: jest.fn().mockResolvedValue(0),
    };
    adapter = new SupabaseAdapter(mockChunkRepo, mockDocRepo);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('is defined', () => {
    expect(adapter).toBeDefined();
  });

  describe('search()', () => {
    it('calls chunkRepo.query with vector SQL', async () => {
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

    describe('projectId filtering', () => {
      it('adds project_id condition to SQL when projectId is provided', async () => {
        const vector = [0.1, 0.2, 0.3];
        await adapter.search(vector, 5, 0.5, 'proj-1');
        const [sql, params] = mockChunkRepo.query.mock.calls[0];
        expect(sql).toContain('nc.project_id = $3');
        expect(params[2]).toBe('proj-1');
      });

      it('omits project_id condition when projectId is not provided', async () => {
        const vector = [0.1, 0.2, 0.3];
        await adapter.search(vector);
        const [sql, params] = mockChunkRepo.query.mock.calls[0];
        expect(sql).not.toContain('project_id');
        expect(params).toHaveLength(2);
      });

      it('keeps nc.embedding IS NOT NULL condition alongside project_id', async () => {
        const vector = [0.1, 0.2, 0.3];
        await adapter.search(vector, 5, 0.5, 'proj-1');
        const [sql] = mockChunkRepo.query.mock.calls[0];
        expect(sql).toContain('nc.embedding IS NOT NULL');
        expect(sql).toContain('nc.project_id = $3');
        expect(sql).toContain('AND');
      });
    });
  });

  describe('projectExists()', () => {
    it('returns true when documents exist for the project', async () => {
      mockDocRepo.count.mockResolvedValue(5);
      const result = await adapter.projectExists('proj-1');
      expect(result).toBe(true);
      expect(mockDocRepo.count).toHaveBeenCalledWith({
        where: { projectId: 'proj-1' },
      });
    });

    it('returns false when no documents exist for the project', async () => {
      mockDocRepo.count.mockResolvedValue(0);
      const result = await adapter.projectExists('proj-unknown');
      expect(result).toBe(false);
    });
  });
});
