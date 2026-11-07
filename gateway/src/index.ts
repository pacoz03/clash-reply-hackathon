import 'dotenv/config'; // carica gateway/.env in process.env (tsx non lo fa da solo)
import { loadConfig, resolveAi } from './config.js';
import { buildApp } from './app.js';
import { OpenAiCompatibleProvider } from './ai/provider.js';
import { InMemoryDataService } from './data/memory.js';

async function main(): Promise<void> {
  const cfg = loadConfig();
  const ai = resolveAi(cfg);

  const provider = new OpenAiCompatibleProvider(ai);
  // TODO(Person B): sostituire con l'implementazione SQLite (stessa interfaccia DataService).
  const data = new InMemoryDataService();

  const app = await buildApp({ provider, data, corsOrigin: cfg.CORS_ORIGIN });
  await app.listen({ port: cfg.GATEWAY_PORT, host: cfg.GATEWAY_HOST });
  app.log.info(`AI provider: ${ai.provider} · modello: ${ai.model} · ${ai.baseURL}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
