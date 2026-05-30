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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var QueryController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryController = void 0;
const common_1 = require("@nestjs/common");
const query_service_1 = require("./query.service");
let QueryController = QueryController_1 = class QueryController {
    constructor(queryService) {
        this.queryService = queryService;
        this.logger = new common_1.Logger(QueryController_1.name);
    }
    async query(body, res) {
        const { question, project_id, top_k, threshold, system_prompt } = body;
        if (!question || typeof question !== 'string' || question.trim().length === 0) {
            throw new common_1.HttpException('question is required', common_1.HttpStatus.BAD_REQUEST);
        }
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
            for await (const chunk of result.stream) {
                if (chunk.done)
                    break;
                res.write(`data: ${JSON.stringify({ delta: chunk.delta })}\n\n`);
            }
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
        }
        catch (error) {
            this.logger.error(`Query failed: ${error.message}`);
            if (!res.headersSent) {
                throw new common_1.HttpException(error.message || 'Query failed', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
            }
            res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
            res.end();
        }
    }
};
exports.QueryController = QueryController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], QueryController.prototype, "query", null);
exports.QueryController = QueryController = QueryController_1 = __decorate([
    (0, common_1.Controller)('query'),
    __metadata("design:paramtypes", [query_service_1.QueryService])
], QueryController);
