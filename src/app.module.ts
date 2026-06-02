import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueryModule } from './query/query.module';
import { HealthModule } from './health/health.module';
import { HomeModule } from './home/home.module';
import { NotionChunk } from './supabase/entities/notion-chunk.entity';
import { NotionDocument } from './supabase/entities/notion-document.entity';

const hasDb = Boolean(process.env.DATABASE_URL);

@Module({
  imports: [
    ...(hasDb
      ? [
          TypeOrmModule.forRootAsync({
            useFactory: () => {
              const isVercel = process.env.VERCEL === '1';
              return {
                type: 'postgres' as const,
                url: process.env.DATABASE_URL,
                entities: [NotionChunk, NotionDocument],
                synchronize: false,
                ssl: { rejectUnauthorized: false },
                ...(isVercel
                  ? {
                      extra: {
                        max: 1,
                      },
                    }
                  : {}),
              };
            },
          }),
          QueryModule,
        ]
      : []),
    HealthModule,
    HomeModule,
  ],
})
export class AppModule {}
