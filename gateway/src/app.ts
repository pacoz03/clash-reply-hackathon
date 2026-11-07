import Fastify from 'fastify';
import cors from '@fastify/cors';
import type { AiProvider } from './ai/provider.js';
import type { DataService } from './data/service.js';
import { registerHealth } from './routes/health.js';
import { registerTutor } from './routes/tutor.js';
import { registerNotebooks } from './routes/notebooks.js';

interface BuildOptions {
  provider: AiProvider;
  data: DataService;
  corsOrigin: string;
}

export async function buildApp({ provider, data, corsOrigin }: BuildOptions) {
  // bodyLimit alto: le pagine sono data URL PNG (decine di MB).
  const app = Fastify({ logger: true, bodyLimit: 50 * 1024 * 1024 });
  await app.register(cors, { origin: corsOrigin });

  registerHealth(app);
  registerTutor(app, provider, data);
  registerNotebooks(app, data);

  return app;
}
