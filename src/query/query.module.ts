import { Module } from '@nestjs/common';
import { QueryController } from './query.controller';
import { QueryService } from './query.service';
import { EmbeddingModule } from '../embedding/embedding.module';
import { LLMModule } from '../llm/llm.module';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [EmbeddingModule, LLMModule, SupabaseModule],
  controllers: [QueryController],
  providers: [QueryService],
})
export class QueryModule {}
