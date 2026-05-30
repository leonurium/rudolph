"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const query_module_1 = require("./query/query.module");
const health_module_1 = require("./health/health.module");
const notion_chunk_entity_1 = require("./supabase/entities/notion-chunk.entity");
const notion_document_entity_1 = require("./supabase/entities/notion-document.entity");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forRootAsync({
                useFactory: () => {
                    const isVercel = process.env.VERCEL === '1';
                    return {
                        type: 'postgres',
                        url: process.env.DATABASE_URL,
                        entities: [notion_chunk_entity_1.NotionChunk, notion_document_entity_1.NotionDocument],
                        synchronize: false,
                        ssl: { rejectUnauthorized: false },
                        ...(isVercel
                            ? {
                                extra: {
                                    max: 1,
                                },
                            }
                            : {}),
                    };
                },
            }),
            query_module_1.QueryModule,
            health_module_1.HealthModule,
        ],
    })
], AppModule);
