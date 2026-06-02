import { Injectable, Logger } from "@nestjs/common";

export interface LLMStreamChunk {
  delta: string;
  done: boolean;
}

@Injectable()
export class LLMService {
  private readonly logger = new Logger(LLMService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly defaultModel: string;

  constructor() {
    this.baseUrl = process.env.NINE_ROUTER_URL || "";
    this.apiKey = process.env.NINE_ROUTER_API_KEY || "";
    this.defaultModel = process.env.LLM_MODEL || "openai/minimax/MiniMax-M1";
  }

  async *stream(
    prompt: string,
    systemPrompt?: string,
    model?: string,
  ): AsyncGenerator<LLMStreamChunk> {
    const url = `${this.baseUrl}/v1/chat/completions`;
    const messages: any[] = [];

    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const body = {
      model: model || this.defaultModel,
      messages,
      stream: true,
    };

    this.logger.debug(`Streaming LLM (${model || this.defaultModel})`);

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      this.logger.error(`LLM failed: ${resp.status} ${errText}`);
      throw new Error(`LLM failed: ${resp.status}`);
    }

    const reader = resp.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;

        const rawData = trimmed.slice(6);
        try {
          const parsed = JSON.parse(rawData);
          const content = parsed.choices[0].delta.content;
          if (content) {
            yield { delta: content, done: false };
          }
        } catch {
          // skip malformed chunks
        }
      }
    }

    // Stream exhausted — yield final done marker
    yield { delta: "", done: true };
  }
}
