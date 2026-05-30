import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createConfiguredNestApp } from '../src/bootstrap-app';
import { hasLiveEnv } from './setup/live-env';
import { parseSseBody } from './utils/sse';

const describeLive = hasLiveEnv() ? describe : describe.skip;

describeLive('Rudolph (live e2e — real env)', () => {
  let app: INestApplication<App>;

  jest.setTimeout(120_000);

  beforeAll(async () => {
    app = await createConfiguredNestApp();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('returns ok against the running app', async () => {
      const res = await request(app.getHttpServer()).get('/health').expect(200);

      expect(res.body).toMatchObject({ status: 'ok' });
      expect(new Date(res.body.timestamp).toString()).not.toBe('Invalid Date');
    });
  });

  describe('POST /query', () => {
    it('rejects missing question (no external calls)', async () => {
      await request(app.getHttpServer())
        .post('/query')
        .send({})
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBe('question is required');
        });
    });

    it('runs full RAG pipeline against real DB and router', async () => {
      const question =
        process.env.E2E_LIVE_QUESTION?.trim() ||
        'Summarize what you know from the knowledge base.';

      const res = await request(app.getHttpServer()).post('/query').send({
        question,
        top_k: Number(process.env.E2E_LIVE_TOP_K ?? 3),
        threshold: Number(process.env.E2E_LIVE_THRESHOLD ?? 0.5),
      });

      if (res.status !== 201) {
        const detail =
          typeof res.body === 'object' && res.body !== null
            ? JSON.stringify(res.body)
            : res.text;
        throw new Error(
          `Query failed with HTTP ${res.status}. Check DATABASE_URL, NINE_ROUTER_API_KEY, and router OpenAI credentials. Response: ${detail}`,
        );
      }

      expect(res.headers['content-type']).toMatch(/text\/event-stream/);

      const { dataEvents, doneEvent, errorEvent } = parseSseBody(res.text);
      expect(errorEvent).toBeNull();
      expect(doneEvent).not.toBeNull();

      const deltas = dataEvents
        .map((line) => JSON.parse(line) as { delta?: string })
        .map((e) => e.delta ?? '')
        .join('');

      expect(deltas.length).toBeGreaterThan(0);

      const done = JSON.parse(doneEvent!) as {
        citations: Array<{
          title: string;
          snippet: string;
          similarity: number;
        }>;
        latency: {
          embed: number;
          search: number;
          llmFirstToken: number;
          total: number;
        };
      };

      expect(Array.isArray(done.citations)).toBe(true);
      for (const citation of done.citations) {
        expect(citation.title).toEqual(expect.any(String));
        expect(citation.snippet).toEqual(expect.any(String));
        expect(citation.similarity).toEqual(expect.any(Number));
      }

      expect(done.latency).toMatchObject({
        embed: expect.any(Number),
        search: expect.any(Number),
        llmFirstToken: expect.any(Number),
        total: expect.any(Number),
      });

      expect(done.latency.embed).toBeGreaterThan(0);
      expect(done.latency.search).toBeGreaterThanOrEqual(0);
      expect(done.latency.llmFirstToken).toBeGreaterThan(0);
    });
  });
});
