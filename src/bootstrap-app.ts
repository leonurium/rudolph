import 'reflect-metadata';
import { type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { AppModule } from './app.module';

export function applyCommonNestConfig(app: INestApplication): void {
  app.enableCors();
}

export async function createConfiguredNestApp(): Promise<INestApplication> {
  const expressInstance = express();
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressInstance),
    {
      logger:
        process.env.VERCEL === '1'
          ? ['error', 'warn']
          : ['error', 'warn', 'log'],
    },
  );
  applyCommonNestConfig(app);
  return app;
}
