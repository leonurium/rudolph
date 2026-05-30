"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var QueryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryService = void 0;
const common_1 = require("@nestjs/common");
const embedding_service_1 = require("../embedding/embedding.service");
const llm_service_1 = require("../llm/llm.service");
const supabase_adapter_1 = require("../supabase/supabase.adapter");
let QueryService = QueryService_1 = class QueryService {
    constructor(embedding, llm, supabase) {
        this.embedding = embedding;
        this.llm = llm;
        this.supabase = supabase;
        this.logger = new common_1.Logger(QueryService_1.name);
    }
    async query(options) {
        const { question, topK = 5, threshold = 0.5, systemPrompt } = options;
        const start = Date.now();
        const embedStart = Date.now();
        const vector = await this.embedding.embed(question);
        const embedTime = Date.now() - embedStart;
        this.logger.log(`Embedding: ${embedTime}ms`);
        const searchStart = Date.now();
        const citations = await this.supabase.search(vector, topK, threshold);
        const searchTime = Date.now() - searchStart;
        this.logger.log(`Search: ${searchTime}ms (${citations.length} results)`);
        const context = citations
            .map((c, i) => `[${i + 1}] ${c.document_title}: ${c.chunk_text}`)
            .join('\n\n');
        const defaultSystem = `You are a helpful assistant. Answer the question based on the provided context. If the context doesn't contain enough information, say so. Cite sources using [N] notation.`;
        const prompt = `Context:\n${context}\n\nQuestion: ${question}\n\nAnswer:`;
        const llmStart = Date.now();
        let firstToken = true;
        let llmFirstTokenTime = 0;
        const wrappedStream = (async function* (self) {
            for await (const chunk of self.llm.stream(prompt, systemPrompt || defaultSystem)) {
                if (firstToken && chunk.delta) {
                    llmFirstTokenTime = Date.now() - llmStart;
                    self.logger.log(`LLM first token: ${llmFirstTokenTime}ms`);
                    firstToken = false;
                }
                yield chunk;
            }
        })(this);
        const totalTime = Date.now() - start;
        this.logger.log(`Total setup: ${totalTime}ms`);
        return {
            stream: wrappedStream,
            citations,
            latency: {
                embed: embedTime,
                search: searchTime,
                llmFirstToken: llmFirstTokenTime,
                total: totalTime,
            },
        };
    }
};
exports.QueryService = QueryService;
exports.QueryService = QueryService = QueryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [embedding_service_1.EmbeddingService,
        llm_service_1.LLMService,
        supabase_adapter_1.SupabaseAdapter])
], QueryService);
