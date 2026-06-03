import { HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { QueryController } from './query.controller';
import { QueryService } from './query.service';
import { LLMStreamChunk } from '../llm/llm.service';
import { SearchResult } from '../supabase/supabase.adapter';

describe('QueryController', () => {
  let controller: QueryController;
  let queryService: jest.Mocked<QueryService>;
  let mockRes: Partial<Response>;
  let writeMock: jest.Mock;
  let endMock: jest.Mock;
  let setHeaderMock: jest.Mock;

  beforeEach(() => {
    writeMock = jest.fn();
    endMock = jest.fn();
    setHeaderMock = jest.fn();

    mockRes = {
      setHeader: setHeaderMock,
      write: writeMock,
      end: endMock,
      headersSent: false,
    };

    queryService = {
      query: jest.fn(),
    } as any;

    controller = new QueryController(queryService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /query — validation', () => {
    it('throws 422 when question is missing', async () => {
      await expect(
        controller.query({ question: undefined as any }, mockRes as Response),
      ).rejects.toMatchObject({ status: HttpStatus.UNPROCESSABLE_ENTITY, message: 'question is required' });
    });

    it('throws 422 when question is not a string', async () => {
      await expect(
        controller.query({ question: 123 as any }, mockRes as Response),
      ).rejects.toMatchObject({ status: HttpStatus.UNPROCESSABLE_ENTITY, message: 'question is required' });
    });

    it('throws 422 when question is only whitespace', async () => {
      await expect(
        controller.query({ question: '   ' }, mockRes as Response),
      ).rejects.toMatchObject({ status: HttpStatus.UNPROCESSABLE_ENTITY, message: 'question is required' });
    });

    it('throws 422 when question is an empty string', async () => {
      await expect(
        controller.query({ question: '' }, mockRes as Response),
      ).rejects.toMatchObject({ status: HttpStatus.UNPROCESSABLE_ENTITY, message: 'question is required' });
    });
  });

  describe('POST /query — happy path', () => {
    beforeEach(() => {
      queryService.query.mockResolvedValue({
        stream: (async function* (): AsyncGenerator<LLMStreamChunk> {
          yield { delta: 'Hello', done: false };
          yield { delta: ' world', done: false };
          yield { delta: '', done: true };
        })(),
        citations: [
          {
            chunk_text: 'Test chunk text',
            document_title: 'Doc Title',
            document_id: 'doc-1',
            chunk_index: 0,
            similarity: 0.9,
          },
        ],
        latency: { embed: 10, search: 20, llmFirstToken: 30, total: 100 },
      });
    });

    it('sets SSE headers', async () => {
      await controller.query({ question: 'What is this?' }, mockRes as Response);
      expect(setHeaderMock).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(setHeaderMock).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(setHeaderMock).toHaveBeenCalledWith('Connection', 'keep-alive');
      expect(setHeaderMock).toHaveBeenCalledWith('X-Accel-Buffering', 'no');
    });

    it('calls queryService with mapped options', async () => {
      await controller.query(
        { question: 'What is this?', project_id: 'proj-1', top_k: 10, threshold: 0.7, system_prompt: 'Be brief' },
        mockRes as Response,
      );
      expect(queryService.query).toHaveBeenCalledWith({
        question: 'What is this?',
        projectId: 'proj-1',
        topK: 10,
        threshold: 0.7,
        systemPrompt: 'Be brief',
      });
    });

    it('uses default topK and threshold', async () => {
      await controller.query({ question: 'What is this?' }, mockRes as Response);
      expect(queryService.query).toHaveBeenCalledWith(
        expect.objectContaining({ topK: 5, threshold: 0.5 }),
      );
    });

    it('streams chunks as SSE data events', async () => {
      await controller.query({ question: 'What is this?' }, mockRes as Response);
      expect(writeMock).toHaveBeenCalledWith('data: {"delta":"Hello"}\n\n');
      expect(writeMock).toHaveBeenCalledWith('data: {"delta":" world"}\n\n');
    });

    it('sends citations + latency as final done event', async () => {
      await controller.query({ question: 'What is this?' }, mockRes as Response);
      const doneCall = writeMock.mock.calls.find(
        ([arg]: [string]) => arg.startsWith('event: done'),
      );
      expect(doneCall).toBeDefined();
      const eventData = JSON.parse(doneCall![0].split('\ndata: ')[1]);
      expect(eventData.citations).toHaveLength(1);
      expect(eventData.citations[0]).toMatchObject({
        title: 'Doc Title',
        snippet: 'Test chunk text'.substring(0, 200),
        similarity: 0.9,
      });
      expect(eventData.latency).toEqual({ embed: 10, search: 20, llmFirstToken: 30, total: 100 });
    });

    it('truncates snippet to 200 chars', async () => {
      const longChunk = 'A'.repeat(300);
      queryService.query.mockResolvedValue({
        stream: (async function* (): AsyncGenerator<LLMStreamChunk> {
          yield { delta: '', done: true };
        })(),
        citations: [{ chunk_text: longChunk, document_title: 'T', document_id: 'd', chunk_index: 0, similarity: 0.9 }],
        latency: { embed: 0, search: 0, llmFirstToken: 0, total: 0 },
      });
      await controller.query({ question: 'What?' }, mockRes as Response);
      const doneCall = writeMock.mock.calls.find(
        ([arg]: [string]) => arg.startsWith('event: done'),
      );
      const eventData = JSON.parse(doneCall![0].split('\ndata: ')[1]);
      expect(eventData.citations[0].snippet).toHaveLength(200);
    });

    it('ends the response after done event', async () => {
      await controller.query({ question: 'What is this?' }, mockRes as Response);
      expect(endMock).toHaveBeenCalled();
    });

    it('trims the question', async () => {
      await controller.query({ question: '  What is this?  ' }, mockRes as Response);
      expect(queryService.query).toHaveBeenCalledWith(
        expect.objectContaining({ question: 'What is this?' }),
      );
    });
  });

  describe('POST /query — error handling', () => {
    it('throws HttpException when queryService fails and headers not sent', async () => {
      queryService.query.mockRejectedValue(new Error('Embedding service unavailable'));

      await expect(
        controller.query({ question: 'What is this?' }, mockRes as Response),
      ).rejects.toMatchObject({ status: HttpStatus.INTERNAL_SERVER_ERROR });
    });

    it('preserves 404 status from NotFoundException (unknown project_id)', async () => {
      queryService.query.mockRejectedValue(
        new NotFoundException('Project not found: unknown-proj'),
      );

      await expect(
        controller.query({ question: 'What is this?', project_id: 'unknown-proj' }, mockRes as Response),
      ).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });
    });

    it('sets error status from thrown exception', async () => {
      queryService.query.mockRejectedValue(new Error('Embedding service unavailable'));

      await expect(
        controller.query({ question: 'What is this?' }, mockRes as Response),
      ).rejects.toMatchObject({ status: HttpStatus.INTERNAL_SERVER_ERROR });
    });

    it('sends error event and ends response when headers already sent', async () => {
      queryService.query.mockRejectedValue(new Error('Stream interrupted'));
      mockRes.headersSent = true;

      await controller.query({ question: 'What?' }, mockRes as Response);

      const errorCall = writeMock.mock.calls.find(
        ([arg]: [string]) => arg.startsWith('event: error'),
      );
      expect(errorCall).toBeDefined();
      expect(JSON.parse(errorCall![0].split('\ndata: ')[1])).toMatchObject({ error: 'Stream interrupted' });
      expect(endMock).toHaveBeenCalled();
    });
  });
});
