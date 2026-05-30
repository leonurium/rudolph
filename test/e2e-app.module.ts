import { Module } from '@nestjs/common';
import { HealthModule } from '../src/health/health.module';
import { EmbeddingService } from '../src/embedding/embedding.service';
import { LLMService } from '../src/llm/llm.service';
import { SupabaseAdapter } from '../src/supabase/supabase.adapter';
import { QueryController } from '../src/query/query.controller';
import { QueryService } from '../src/query/query.service';
import {
  createMockEmbeddingService,
  createMockLLMService,
  createMockSupabaseAdapter,
} from './mocks/services.mock';

export const mockEmbedding = createMockEmbeddingService();
export const mockSupabase = createMockSupabaseAdapter();
export const mockLlm = createMockLLMService();

@Module({
  imports: [HealthModule],
  controllers: [QueryController],
  providers: [
    QueryService,
    { provide: EmbeddingService, useValue: mockEmbedding },
    { provide: LLMService, useValue: mockLlm },
    { provide: SupabaseAdapter, useValue: mockSupabase },
  ],
})
export class E2eAppModule {}
