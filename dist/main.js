"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const core_1 = require("@nestjs/core");
const platform_express_1 = require("@nestjs/platform-express");
const express_1 = __importDefault(require("express"));
const app_module_1 = require("./app.module");
const expressApp = (0, express_1.default)();
let cachedApp;
async function createNestApp() {
    if (!cachedApp) {
        cachedApp = await core_1.NestFactory.create(app_module_1.AppModule, new platform_express_1.ExpressAdapter(expressApp));
        cachedApp.enableCors();
        await cachedApp.init();
    }
    return expressApp;
}
async function handler(req, res) {
    const app = await createNestApp();
    app(req, res);
}
if (require.main === module) {
    core_1.NestFactory.create(app_module_1.AppModule).then(app => {
        app.enableCors();
        return app.listen(3000);
    }).then(() => console.log('Rudolph running on http://localhost:3000'));
}
//# sourceMappingURL=main.js.map