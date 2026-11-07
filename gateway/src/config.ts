import { z } from 'zod';

/** Variabili d'ambiente del gateway. Valida con default sensati. */
export const configSchema = z.object({
  GATEWAY_PORT: z.coerce.number().int().positive().default(8787),
  GATEWAY_HOST: z.string().default('0.0.0.0'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  GATEWAY_AI_PROVIDER: z.enum(['local', 'openai']).default('local'),
  // locali (LM Studio, OpenAI-compatibile)
  GATEWAY_AI_BASE_URL: z.string().default('http://localhost:1234/v1'),
  GATEWAY_AI_MODEL: z.string().default('local'),
  GATEWAY_AI_API_KEY: z.string().default('lm-studio'),

  // openai (il base URL è fisso)
  OPENAI_API_KEY: z.string().optional(),

  GATEWAY_AI_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),
  GATEWAY_AI_MAX_TOKENS: z.coerce.number().int().positive().default(400),

  // Modalità di output strutturato del modello:
  //  none   = niente response_format, ci affidiamo a prompt + parse difensivo (più portatile)
  //  object = response_format { type: 'json_object' } (OpenAI, alcuni modelli)
  //  schema = response_format { type: 'json_schema', ... } (es. Qwen su LM Studio)
  GATEWAY_AI_JSON_MODE: z.enum(['none', 'object', 'schema']).default('none'),
});
export type Config = z.infer<typeof configSchema>;

/** Impostazioni risolte del provider AI, indipendenti dal provider scelto. */
export type JsonMode = 'none' | 'object' | 'schema';

export interface ResolvedAi {
  provider: 'local' | 'openai';
  baseURL: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
  maxTokens: number;
  jsonMode: JsonMode;
}

export function loadConfig(): Config {
  const parsed = configSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ');
    throw new Error(`Configurazione non valida: ${issues}`);
  }
  return parsed.data;
}

export function resolveAi(cfg: Config): ResolvedAi {
  if (cfg.GATEWAY_AI_PROVIDER === 'openai') {
    if (!cfg.OPENAI_API_KEY) throw new Error('Provider "openai" selezionato ma OPENAI_API_KEY mancante.');
    return {
      provider: 'openai',
      baseURL: 'https://api.openai.com/v1',
      apiKey: cfg.OPENAI_API_KEY,
      model: cfg.GATEWAY_AI_MODEL || 'gpt-4o-mini',
      timeoutMs: cfg.GATEWAY_AI_TIMEOUT_MS,
      maxTokens: cfg.GATEWAY_AI_MAX_TOKENS,
      jsonMode: cfg.GATEWAY_AI_JSON_MODE,
    };
  }
  return {
    provider: 'local',
    baseURL: cfg.GATEWAY_AI_BASE_URL,
    apiKey: cfg.GATEWAY_AI_API_KEY,
    model: cfg.GATEWAY_AI_MODEL,
    timeoutMs: cfg.GATEWAY_AI_TIMEOUT_MS,
    maxTokens: cfg.GATEWAY_AI_MAX_TOKENS,
    jsonMode: cfg.GATEWAY_AI_JSON_MODE,
  };
}
