import OpenAI from 'openai';
import type { ResolvedAi, JsonMode } from '../config.js';

export interface VisionInput {
  system: string;
  user: string;
  image: string; // data URL
  signal?: AbortSignal;
}

/**
 * Abstrazione del provider AI. LM Studio ed OpenAI parlano entrambi
 * dell'API OpenAI-compatibile, quindi un singolo client copre i due casi:
 * il passaggio local → openai è solo un cambio di configurazione.
 */
export interface AiProvider {
  completeVision(input: VisionInput): Promise<string>;
}

export class OpenAiCompatibleProvider implements AiProvider {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly jsonMode: JsonMode;

  constructor(cfg: ResolvedAi) {
    this.client = new OpenAI({ baseURL: cfg.baseURL, apiKey: cfg.apiKey, timeout: cfg.timeoutMs });
    this.model = cfg.model;
    this.maxTokens = cfg.maxTokens;
    this.jsonMode = cfg.jsonMode;
  }

  async completeVision({ system, user, image, signal }: VisionInput): Promise<string> {
    // `response_format` è opzionale: alcuni backend (es. Qwen su LM Studio)
    // rifiutano "json_object". Con "none" ci affidiamo a prompt + parse difensivo.
    const responseFormat =
      this.jsonMode === 'object'
        ? { type: 'json_object' }
        : this.jsonMode === 'schema'
          ? {
              type: 'json_schema',
              json_schema: {
                name: 'tutor_annotation',
                schema: {
                  type: 'object',
                  properties: {
                    kind: { type: 'string', enum: ['hint', 'question'] },
                    text: { type: 'string' },
                    source: { type: 'string' },
                  },
                  required: ['kind', 'text'],
                  additionalProperties: false,
                },
              },
            }
          : undefined;

    const res = await this.client.chat.completions.create(
      {
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: 0.4,
        messages: [
          { role: 'system', content: system },
          {
            role: 'user',
            content: [
              { type: 'text' as const, text: user },
              { type: 'image_url' as const, image_url: { url: image } },
            ],
          },
        ],
        ...(responseFormat ? { response_format: responseFormat } : {}),
      } as Parameters<typeof this.client.chat.completions.create>[0],
      { signal },
    );
    return res.choices[0]?.message?.content ?? '';
  }
}
