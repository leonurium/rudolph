import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../../.env') });

const REQUIRED_VARS = ['DATABASE_URL', 'NINE_ROUTER_API_KEY'] as const;

const PLACEHOLDER_PATTERN = /^(your-|changeme|xxx|$)/i;

function isConfigured(name: string): boolean {
  const value = process.env[name]?.trim();
  if (!value) {
    return false;
  }
  return !PLACEHOLDER_PATTERN.test(value);
}

export function getMissingLiveEnvVars(): string[] {
  return REQUIRED_VARS.filter((name) => !isConfigured(name));
}

export function hasLiveEnv(): boolean {
  return getMissingLiveEnvVars().length === 0;
}

if (!hasLiveEnv()) {
  const missing = getMissingLiveEnvVars().join(', ');
  console.warn(
    `[live e2e] Skipping: missing env (${missing}). Copy .env.example → .env or set RUN_LIVE_E2E=1 with credentials.`,
  );
}
