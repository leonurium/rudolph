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
var LLMService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMService = void 0;
const common_1 = require("@nestjs/common");
let LLMService = LLMService_1 = class LLMService {
    constructor() {
        this.logger = new common_1.Logger(LLMService_1.name);
        this.baseUrl = process.env.NINE_ROUTER_URL || 'https://router.schoolday.web.id';
        this.apiKey = process.env.NINE_ROUTER_API_KEY || '';
        this.defaultModel = process.env.LLM_MODEL || 'openai/minimax/MiniMax-M1';
    }
    async *stream(prompt, systemPrompt, model) {
        const url = `${this.baseUrl}/v1/chat/completions`;
        const messages = [];
        if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt });
        }
        messages.push({ role: 'user', content: prompt });
        const body = {
            model: model || this.defaultModel,
            messages,
            stream: true,
        };
        this.logger.debug(`Streaming LLM (${model || this.defaultModel})`);
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
            this.logger.error(`LLM failed: ${resp.status} ${errText}`);
            throw new Error(`LLM failed: ${resp.status}`);
        }
        const reader = resp.body?.getReader();
        if (!reader)
            throw new Error('No response body');
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data: '))
                    continue;
                const data = trimmed.slice(6);
                if (data === '[DONE]') {
                    yield { delta: '', done: true };
                    return;
                }
                try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices?.[0]?.delta?.content;
                    if (content) {
                        yield { delta: content, done: false };
                    }
                }
                catch {
                }
            }
        }
    }
};
exports.LLMService = LLMService;
exports.LLMService = LLMService = LLMService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], LLMService);
