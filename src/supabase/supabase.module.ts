import { Module } from '@nestjs/common';
import { SupabaseAdapter } from './supabase.adapter';

@Module({
  providers: [SupabaseAdapter],
  exports: [SupabaseAdapter],
})
export class SupabaseModule {}
