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
var EmbeddingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbeddingService = void 0;
const common_1 = require("@nestjs/common");
let EmbeddingService = EmbeddingService_1 = class EmbeddingService {
    constructor() {
        this.logger = new common_1.Logger(EmbeddingService_1.name);
        this.baseUrl = process.env.NINE_ROUTER_URL || 'https://router.schoolday.web.id';
        this.apiKey = process.env.NINE_ROUTER_API_KEY || '';
    }
    async embed(text, model = 'text-embedding-3-small') {
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
        const data = await resp.json();
        const vector = data.data?.[0]?.embedding;
        if (!vector || !Array.isArray(vector)) {
            throw new Error('Invalid embedding response');
        }
        this.logger.debug(`Embedded -> ${vector.length} dimensions`);
        return vector;
    }
};
exports.EmbeddingService = EmbeddingService;
exports.EmbeddingService = EmbeddingService = EmbeddingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], EmbeddingService);
//# sourceMappingURL=embedding.service.js.map