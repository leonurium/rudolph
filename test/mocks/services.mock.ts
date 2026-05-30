import { EmbeddingService } from '../../src/embedding/embedding.service';
import { LLMService, type LLMStreamChunk } from '../../src/llm/llm.service';
import {
  SupabaseAdapter,
  type SearchResult,
} from '../../src/supabase/supabase.adapter';

export const mockSearchResults: SearchResult[] = [
  {
    chunk_text: 'Rudolph is a universal RAG query bridge.',
    document_title: 'Architecture',
    document_id: 'doc-1',
    chunk_index: 0,
    similarity: 0.92,
  },
];

export function createMockEmbeddingService(): Pick<EmbeddingService, 'embed'> {
  return {
    embed: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  };
}

export function createMockSupabaseAdapter(): Pick<SupabaseAdapter, 'search'> {
  return {
    search: jest.fn().mockResolvedValue(mockSearchResults),
  };
}

export async function* mockLlmStream(): AsyncGenerator<LLMStreamChunk> {
  yield { delta: 'Rudolph ', done: false };
  yield { delta: 'answers questions.', done: false };
  yield { delta: '', done: true };
}

export function createMockLLMService(): Pick<LLMService, 'stream'> {
  return {
    stream: jest.fn().mockImplementation(() => mockLlmStream()),
  };
}
