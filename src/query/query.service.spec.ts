import { QueryService, QueryOptions } from './query.service';
import { EmbeddingService } from '../embedding/embedding.service';
import { LLMService } from '../llm/llm.service';
import { SupabaseAdapter, SearchResult } from '../supabase/supabase.adapter';

describe('QueryService', () => {
  let embedding: jest.Mocked<EmbeddingService>;
  let llm: jest.Mocked<LLMService>;
  let supabase: jest.Mocked<SupabaseAdapter>;
  let service: QueryService;

  const mockCitations: SearchResult[] = [
    {
      chunk_text: 'Hello world this is a test chunk',
      document_title: 'Test Doc',
      document_id: 'doc-1',
      chunk_index: 0,
      similarity: 0.85,
    },
    {
      chunk_text: 'Another chunk with different content',
      document_title: 'Test Doc 2',
      document_id: 'doc-2',
      chunk_index: 1,
      similarity: 0.72,
    },
  ];

  async function* mockStream() {
    yield { delta: 'Answer: ', done: false };
    yield { delta: 'test response', done: false };
    yield { delta: '', done: true };
  }

  beforeEach(() => {
    embedding = {
      embed: jest.fn().mockResolvedValue(new Array(1536).fill(0.1)),
    } as any;

    llm = {
      stream: jest.fn().mockImplementation(() => mockStream()),
    } as any;

    supabase = {
      search: jest.fn().mockResolvedValue(mockCitations),
    } as any;

    service = new QueryService(embedding, llm, supabase);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('query()', () => {
    it('embeds the question', async () => {
      const result = await service.query({ question: 'What is this?' });
      expect(embedding.embed).toHaveBeenCalledWith('What is this?');
      // consume the stream so the wrapped generator finishes
      for await (const _ of result.stream) { /* noop */ }
    });

    it('searches supabase with correct args', async () => {
      const result = await service.query({ question: 'What is this?', topK: 10, threshold: 0.7 });
      expect(supabase.search).toHaveBeenCalledWith(expect.any(Array), 10, 0.7);
      for await (const _ of result.stream) { /* noop */ }
    });

    it('uses defaults for topK and threshold when not provided', async () => {
      const result = await service.query({ question: 'What is this?' });
      expect(supabase.search).toHaveBeenCalledWith(expect.any(Array), 5, 0.5);
      for await (const _ of result.stream) { /* noop */ }
    });

    it('streams LLM with formatted prompt', async () => {
      const result = await service.query({ question: 'What is this?' });
      // llm.stream() is called lazily when the wrapper generator is iterated
      for await (const _ of result.stream) { /* noop */ }
      expect(llm.stream).toHaveBeenCalled();

      const [prompt, systemPrompt] = (llm.stream as jest.Mock).mock.calls[0];
      expect(prompt).toContain('What is this?');
      expect(prompt).toContain('[1] Test Doc: Hello world this is a test chunk');
      expect(systemPrompt).toContain('helpful assistant');
    });

    it('returns citations from search', async () => {
      const result = await service.query({ question: 'What is this?' });
      expect(result.citations).toEqual(mockCitations);
      for await (const _ of result.stream) { /* noop */ }
    });

    it('returns latency fields', async () => {
      const result = await service.query({ question: 'What is this?' });
      expect(result.latency).toMatchObject({
        embed: expect.any(Number),
        search: expect.any(Number),
        llmFirstToken: expect.any(Number),
        total: expect.any(Number),
      });
      for await (const _ of result.stream) { /* noop */ }
    });

    it('uses custom system prompt when provided', async () => {
      const customPrompt = 'You are a pirate assistant.';
      const result = await service.query({ question: 'What is this?', systemPrompt: customPrompt });
      for await (const _ of result.stream) { /* noop */ }
      const [, systemPrompt] = (llm.stream as jest.Mock).mock.calls[0];
      expect(systemPrompt).toBe(customPrompt);
    });

    it('yields chunks from LLM stream', async () => {
      const result = await service.query({ question: 'What is this?' });
      const chunks: string[] = [];
      let lastDone = false;
      for await (const chunk of result.stream) {
        if (chunk.done) {
          lastDone = true;
        } else {
          chunks.push(chunk.delta);
        }
      }
      expect(chunks).toEqual(['Answer: ', 'test response']);
      expect(lastDone).toBe(true);
    });
  });
});
