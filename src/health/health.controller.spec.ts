import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(() => {
    controller = new HealthController();
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check()', () => {
    it('returns ok status', () => {
      const result = controller.check();
      expect(result.status).toBe('ok');
    });

    it('returns a timestamp', () => {
      const before = new Date().toISOString();
      const result = controller.check();
      const after = new Date().toISOString();
      expect(result.timestamp).toEqual(expect.any(String));
      expect(result.timestamp >= before && result.timestamp <= after).toBe(true);
    });

    it('returns a valid ISO timestamp', () => {
      const result = controller.check();
      expect(() => new Date(result.timestamp)).not.toThrow();
    });
  });
});
