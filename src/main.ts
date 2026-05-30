import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { AppModule } from './app.module';

const expressApp = express();
let cachedApp: any;

async function createNestApp() {
  if (!cachedApp) {
    cachedApp = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
    cachedApp.enableCors();
    await cachedApp.init();
  }
  return expressApp;
}

// Serverless mode (Vercel)
export default async function handler(req: any, res: any) {
  const app = await createNestApp();
  app(req, res);
}

// Local mode (node dist/main)
if (require.main === module) {
  NestFactory.create(AppModule).then(app => {
    app.enableCors();
    return app.listen(3000);
  }).then(() => console.log('Rudolph running on http://localhost:3000'));
}
