import { EmbeddingService } from './embedding.service';

describe('EmbeddingService', () => {
  let service: EmbeddingService;

  beforeEach(() => {
    // Clear env so tests are hermetic
    delete process.env.NINE_ROUTER_URL;
    delete process.env.NINE_ROUTER_API_KEY;
    delete process.env.LLM_MODEL_EMBEDDING;
    service = new EmbeddingService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('embed()', () => {
    it('returns a number array on success', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          data: [{ embedding: [0.1, 0.2, 0.3] }],
        }),
      } as unknown as globalThis.Response;

      jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse);

      const result = await service.embed('hello world');

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(3);
      expect(result).toEqual([0.1, 0.2, 0.3]);
    });

    it('throws when fetch fails', async () => {
      const mockResponse = {
        ok: false,
        status: 502,
        text: async () => 'Bad Gateway',
      } as unknown as globalThis.Response;

      jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse);

      await expect(service.embed('hello')).rejects.toThrow('Embedding failed: 502');
    });

    it('throws when response has no embedding', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      } as unknown as globalThis.Response;

      jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse);

      await expect(service.embed('hello')).rejects.toThrow('Invalid embedding response');
    });

    it('uses custom model when provided', async () => {
      let capturedBody: any;
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ data: [{ embedding: [0.5] }] }),
      } as unknown as globalThis.Response;

      jest.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
        capturedBody = JSON.parse((init as any).body);
        return mockResponse;
      });

      await service.embed('test', 'custom/model');

      expect(capturedBody.model).toBe('custom/model');
    });
  });
});
