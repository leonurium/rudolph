import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { applyCommonNestConfig } from './bootstrap-app';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger:
      process.env.VERCEL === '1'
        ? ['error', 'warn']
        : ['error', 'warn', 'log'],
  });
  applyCommonNestConfig(app);

  const port = Number(process.env.PORT ?? 3099);
  await app.listen(port);

  if (process.env.VERCEL !== '1') {
    console.log(`Rudolph running on http://localhost:${port}`);
  }
}

void bootstrap();
