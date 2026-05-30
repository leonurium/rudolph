export interface LLMStreamChunk {
    delta: string;
    done: boolean;
}
export declare class LLMService {
    private readonly logger;
    private readonly baseUrl;
    private readonly apiKey;
    private readonly defaultModel;
    constructor();
    stream(prompt: string, systemPrompt?: string, model?: string): AsyncGenerator<LLMStreamChunk>;
}
