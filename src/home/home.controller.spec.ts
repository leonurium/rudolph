import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { HomeController } from './home.controller';

describe('HomeController', () => {
  let controller: HomeController;
  let mockRes: Partial<Response>;
  let sendMock: jest.Mock;
  let setHeaderMock: jest.Mock;

  beforeEach(async () => {
    sendMock = jest.fn();
    setHeaderMock = jest.fn();
    mockRes = {
      send: sendMock,
      setHeader: setHeaderMock,
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HomeController],
    }).compile();

    controller = module.get<HomeController>(HomeController);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('home()', () => {
    it('returns HTML with joke on successful API response', async () => {
      const mockJoke = {
        id: 1,
        type: 'general',
        setup: 'Why did the chicken cross the road?',
        punchline: 'To get to the other side!',
      };
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => mockJoke,
      } as unknown as globalThis.Response;

      jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse);

      await controller.home(mockRes as Response);

      expect(setHeaderMock).toHaveBeenCalledWith(
        'Content-Type',
        'text/html; charset=utf-8',
      );
      expect(sendMock).toHaveBeenCalledTimes(1);
      const html = sendMock.mock.calls[0][0] as string;
      expect(html).toContain('Why did the chicken cross the road?');
      expect(html).toContain('To get to the other side!');
      expect(html).toContain('Rudolph Joke Machine');
    });

    it('returns HTML with error message when fetch fails', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
      } as unknown as globalThis.Response;

      jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse);

      await controller.home(mockRes as Response);

      expect(setHeaderMock).toHaveBeenCalledWith(
        'Content-Type',
        'text/html; charset=utf-8',
      );
      const html = sendMock.mock.calls[0][0] as string;
      expect(html).toContain('Oops: API returned 500');
    });

    it('returns HTML with error when fetch throws', async () => {
      jest.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
        new Error('Network failure'),
      );

      await controller.home(mockRes as Response);

      const html = sendMock.mock.calls[0][0] as string;
      expect(html).toContain('Oops: Network failure');
    });
  });
});
