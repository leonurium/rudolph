import { Controller, Post, Body, Res, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { QueryService } from './query.service';

interface QueryDto {
  question: string;
  project_id?: string;
  top_k?: number;
  threshold?: number;
  system_prompt?: string;
}

@Controller('query')
export class QueryController {
  private readonly logger = new Logger(QueryController.name);

  constructor(private readonly queryService: QueryService) {}

  @Post()
  async query(@Body() body: QueryDto, @Res() res: Response) {
    const { question, project_id, top_k, threshold, system_prompt } = body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      throw new HttpException('question is required', HttpStatus.BAD_REQUEST);
    }

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
      const result = await this.queryService.query({
        question: question.trim(),
        projectId: project_id,
        topK: top_k || 5,
        threshold: threshold || 0.5,
        systemPrompt: system_prompt,
      });

      // Stream LLM response
      for await (const chunk of result.stream) {
        if (chunk.done) break;
        res.write(`data: ${JSON.stringify({ delta: chunk.delta })}\n\n`);
      }

      // Send citations as final event
      const citations = result.citations.map(c => ({
        title: c.document_title,
        snippet: c.chunk_text.substring(0, 200),
        similarity: c.similarity,
      }));

      res.write(`event: done\ndata: ${JSON.stringify({
        citations,
        latency: result.latency,
      })}\n\n`);

      res.end();
    } catch (error: any) {
      this.logger.error(`Query failed: ${error.message}`);

      if (!res.headersSent) {
        throw new HttpException(
          error.message || 'Query failed',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      // If already streaming, send error event
      res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
}
