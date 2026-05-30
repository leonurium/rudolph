import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.baseUrl = process.env.NINE_ROUTER_URL || 'https://router.schoolday.web.id';
    this.apiKey = process.env.NINE_ROUTER_API_KEY || '';
  }

  async embed(text: string, model = 'text-embedding-3-small'): Promise<number[]> {
    const url = `${this.baseUrl}/v1/embeddings`;
    const body = { input: text, model };

    this.logger.debug(`Embedding text (${text.length} chars) via ${model}`);

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      this.logger.error(`Embedding failed: ${resp.status} ${errText}`);
      throw new Error(`Embedding failed: ${resp.status}`);
    }

    const data: any = await resp.json();
    const vector = data.data?.[0]?.embedding;
    if (!vector || !Array.isArray(vector)) {
      throw new Error('Invalid embedding response');
    }

    this.logger.debug(`Embedded -> ${vector.length} dimensions`);
    return vector;
  }
}
