import { LLMService } from './llm.service';

describe('LLMService', () => {
  let service: LLMService;

  beforeEach(() => {
    delete process.env.NINE_ROUTER_URL;
    delete process.env.NINE_ROUTER_API_KEY;
    delete process.env.LLM_MODEL;
    service = new LLMService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('stream()', () => {
    function makeSSEStream(lines: string[]): ReadableStream {
      const encoder = new TextEncoder();
      const chunks = lines.map(l => encoder.encode(l));
      return new ReadableStream({
        pull(controller) {
          if (chunks.length === 0) {
            controller.close();
          } else {
            controller.enqueue(chunks.shift()!);
          }
        },
      });
    }

    it('yields chunks from a successful SSE response', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        body: makeSSEStream([
          `data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n`,
          `data: {"choices":[{"delta":{"content":" world"}}]}\n\n`,
        ]),
      } as unknown as globalThis.Response;

      jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse);

      const chunks: string[] = [];
      let lastDone = false;
      for await (const chunk of service.stream('hi')) {
        if (chunk.delta) chunks.push(chunk.delta);
        lastDone = chunk.done;
      }

      expect(chunks).toEqual(['Hello', ' world']);
      expect(lastDone).toBe(true);
    });

    it('throws when response is not ok', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      } as unknown as globalThis.Response;

      jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse);

      const gen = service.stream('hi');
      await expect(gen.next()).rejects.toThrow('LLM failed: 500');
    });

    it('throws when response body has no reader', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        body: null,
      } as unknown as globalThis.Response;

      jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse);

      const gen = service.stream('hi');
      await expect(gen.next()).rejects.toThrow('No response body');
    });

    it('sends system prompt and user message in the request body', async () => {
      let capturedBody: any;
      const mockResponse = {
        ok: true,
        status: 200,
        body: new ReadableStream({
          pull(controller) {
            controller.close();
          },
        }),
      };
      jest.spyOn(globalThis, 'fetch').mockImplementation(
        async (_url: string | URL | Request, init: any) => {
          capturedBody = JSON.parse(init.body);
          return mockResponse as unknown as Response;
        },
      );

      const gen = service.stream('user question', 'you are helpful');
      for await (const _ of gen) { /* noop */ }

      expect(capturedBody.messages).toEqual([
        { role: 'system', content: 'you are helpful' },
        { role: 'user', content: 'user question' },
      ]);
    });

    it('skips malformed SSE lines', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        body: makeSSEStream([
          `not a data line\n\n`,
          `data: {"choices":[{"delta":{"content":"visible"}}]}\n\n`,
        ]),
      } as unknown as globalThis.Response;

      jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse);

      const chunks: string[] = [];
      for await (const chunk of service.stream('hi')) {
        if (chunk.delta) chunks.push(chunk.delta);
      }

      expect(chunks).toEqual(['visible']);
    });
  });
});

