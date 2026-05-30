import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  E2eAppModule,
  mockEmbedding,
  mockLlm,
  mockSupabase,
} from './e2e-app.module';
import { mockSearchResults } from './mocks/services.mock';
import { parseSseBody } from './utils/sse';

describe('Rudolph (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [E2eAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('returns ok status', async () => {
      const res = await request(app.getHttpServer()).get('/health').expect(200);

      expect(res.body).toMatchObject({ status: 'ok' });
      expect(res.body.timestamp).toEqual(expect.any(String));
    });
  });

  describe('POST /query', () => {
    it('rejects missing question', async () => {
      await request(app.getHttpServer())
        .post('/query')
        .send({})
        .expect(400)
        .expect((res) => {
          expect(res.body.message).toBe('question is required');
        });

      expect(mockEmbedding.embed).not.toHaveBeenCalled();
    });

    it('rejects blank question', async () => {
      await request(app.getHttpServer())
        .post('/query')
        .send({ question: '   ' })
        .expect(400);

      expect(mockEmbedding.embed).not.toHaveBeenCalled();
    });

    it('streams SSE deltas and a done event with citations', async () => {
      const res = await request(app.getHttpServer())
        .post('/query')
        .send({ question: 'What is Rudolph?', top_k: 3, threshold: 0.7 })
        .expect(201)
        .expect('Content-Type', /text\/event-stream/);

      expect(mockEmbedding.embed).toHaveBeenCalledWith('What is Rudolph?');
      expect(mockSupabase.search).toHaveBeenCalledWith(
        [0.1, 0.2, 0.3],
        3,
        0.7,
      );
      expect(mockLlm.stream).toHaveBeenCalled();

      const { dataEvents, doneEvent, errorEvent } = parseSseBody(res.text);
      expect(errorEvent).toBeNull();

      expect(dataEvents).toEqual(
        expect.arrayContaining([
          JSON.stringify({ delta: 'Rudolph ' }),
          JSON.stringify({ delta: 'answers questions.' }),
        ]),
      );

      expect(doneEvent).not.toBeNull();
      const done = JSON.parse(doneEvent!);
      expect(done.citations).toEqual([
        {
          title: mockSearchResults[0].document_title,
          snippet: mockSearchResults[0].chunk_text.substring(0, 200),
          similarity: mockSearchResults[0].similarity,
        },
      ]);
      expect(done.latency).toMatchObject({
        embed: expect.any(Number),
        search: expect.any(Number),
        llmFirstToken: expect.any(Number),
        total: expect.any(Number),
      });
    });
  });
});
