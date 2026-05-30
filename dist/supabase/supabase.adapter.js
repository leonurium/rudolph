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
var SupabaseAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseAdapter = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const notion_chunk_entity_1 = require("./entities/notion-chunk.entity");
const notion_document_entity_1 = require("./entities/notion-document.entity");
let SupabaseAdapter = SupabaseAdapter_1 = class SupabaseAdapter {
    constructor(chunkRepo, docRepo) {
        this.chunkRepo = chunkRepo;
        this.docRepo = docRepo;
        this.logger = new common_1.Logger(SupabaseAdapter_1.name);
    }
    async search(embedding, topK = 5, threshold = 0.5) {
        this.logger.debug(`Searching pgvector (top_k=${topK}, threshold=${threshold})`);
        const embeddingStr = `[${embedding.join(',')}]`;
        const results = await this.chunkRepo.query(`
      SELECT
        nc.chunk_text,
        nd.title AS document_title,
        nd.id AS document_id,
        nc.chunk_index,
        1 - (nc.embedding <=> $1::vector) AS similarity
      FROM notion_chunks nc
      JOIN notion_documents nd ON nd.id = nc.document_id
      WHERE nc.embedding IS NOT NULL
      ORDER BY nc.embedding <=> $1::vector
      LIMIT $2
      `, [embeddingStr, topK]);
        const filtered = results.filter((r) => r.similarity >= threshold);
        this.logger.debug(`Found ${filtered.length} results`);
        return filtered;
    }
};
exports.SupabaseAdapter = SupabaseAdapter;
exports.SupabaseAdapter = SupabaseAdapter = SupabaseAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(notion_chunk_entity_1.NotionChunk)),
    __param(1, (0, typeorm_1.InjectRepository)(notion_document_entity_1.NotionDocument)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], SupabaseAdapter);
