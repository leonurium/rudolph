import { Module } from '@nestjs/common';
import { QueryModule } from './query/query.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [QueryModule, HealthModule],
})
export class AppModule {}
