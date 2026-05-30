export declare class EmbeddingService {
    private readonly logger;
    private readonly baseUrl;
    private readonly apiKey;
    constructor();
    embed(text: string, model?: string): Promise<number[]>;
}
