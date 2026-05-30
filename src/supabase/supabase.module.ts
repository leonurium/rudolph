import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupabaseAdapter } from './supabase.adapter';
import { NotionChunk } from './entities/notion-chunk.entity';
import { NotionDocument } from './entities/notion-document.entity';

@Module({
  imports: [TypeOrmModule.forFeature([NotionChunk, NotionDocument])],
  providers: [SupabaseAdapter],
  exports: [SupabaseAdapter],
})
export class SupabaseModule {}
