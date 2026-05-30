"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const bootstrap_app_1 = require("./bootstrap-app");
async function bootstrap() {
    const app = await (0, bootstrap_app_1.createConfiguredNestApp)();
    const port = Number(process.env.PORT ?? 3000);
    await app.listen(port);
    console.log(`Rudolph running on http://localhost:${port}`);
}
void bootstrap();
