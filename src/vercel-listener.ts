import type { IncomingMessage, ServerResponse } from 'http';
import { createConfiguredNestApp } from './bootstrap-app';

type NodeListener = (
  req: IncomingMessage,
  res: ServerResponse,
) => void | Promise<void>;

let listenerPromise: Promise<NodeListener> | undefined;

export async function getVercelListener(): Promise<NodeListener> {
  if (!listenerPromise) {
    listenerPromise = (async () => {
      const app = await createConfiguredNestApp();
      await app.init();
      return app.getHttpAdapter().getInstance() as NodeListener;
    })();
  }
  return listenerPromise;
}
