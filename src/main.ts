import 'dotenv/config';
import { createConfiguredNestApp } from './bootstrap-app';

async function bootstrap(): Promise<void> {
  const app = await createConfiguredNestApp();
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`Rudolph running on http://localhost:${port}`);
}
void bootstrap();
