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
var SupabaseAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseAdapter = void 0;
const common_1 = require("@nestjs/common");
let SupabaseAdapter = SupabaseAdapter_1 = class SupabaseAdapter {
    constructor() {
        this.logger = new common_1.Logger(SupabaseAdapter_1.name);
        this.url = process.env.SUPABASE_URL || '';
        this.key = process.env.SUPABASE_KEY || '';
        if (!this.url || !this.key) {
            this.logger.warn('SUPABASE_URL or SUPABASE_KEY not set');
        }
    }
    async search(embedding, topK = 5, threshold = 0.5) {
        const fnUrl = `${this.url}/rest/v1/rpc/match_notion_chunks`;
        this.logger.debug(`Searching pgvector (top_k=${topK}, threshold=${threshold})`);
        const resp = await fetch(fnUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': this.key,
                'Authorization': `Bearer ${this.key}`,
            },
            body: JSON.stringify({
                query_embedding: embedding,
                match_count: topK,
                match_threshold: threshold,
            }),
        });
        if (!resp.ok) {
            const errText = await resp.text();
            this.logger.error(`Supabase search failed: ${resp.status} ${errText}`);
            throw new Error(`Supabase search failed: ${resp.status}`);
        }
        const data = await resp.json();
        this.logger.debug(`Found ${data.length} results`);
        return data;
    }
};
exports.SupabaseAdapter = SupabaseAdapter;
exports.SupabaseAdapter = SupabaseAdapter = SupabaseAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], SupabaseAdapter);
//# sourceMappingURL=supabase.adapter.js.map