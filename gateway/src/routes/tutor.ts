import type { FastifyInstance } from 'fastify';
import { tutorRequestSchema } from '../schemas.js';
import { buildPrompt } from '../ai/prompt.js';
import { mapModelToAnnotation } from '../ai/mapper.js';
import type { AiProvider } from '../ai/provider.js';
import type { DataService } from '../data/service.js';

export function registerTutor(app: FastifyInstance, provider: AiProvider, data: DataService): void {
  app.post('/tutor/help', async (req, reply) => {
    const parsed = tutorRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Richiesta non valida.', issues: parsed.error.issues });
    }
    const request = parsed.data;

    // Propaga l'abort del client al modello in corso.
    const controller = new AbortController();
    req.raw.once('aborted', () => controller.abort());

    const prompt = buildPrompt({
      question: request.question,
      selection: request.selection,
      previousHints: request.previousHints,
    });

    let raw: string;
    try {
      raw = await provider.completeVision({ ...prompt, image: request.image, signal: controller.signal });
    } catch (err) {
      // Loggiamo la causa reale (servizio assente, timeout, rifiuto del modello…).
      req.log.error(err, 'chiamata AI fallita');
      return reply.code(503).send({ error: 'Il tutor non è disponibile. Il tuo lavoro è al sicuro: riprova tra poco.' });
    }

    const annotation = mapModelToAnnotation(raw, request);

    // Memoria didattica (R11): best-effort, non fallisce la risposta.
    await data
      .recordInteraction({
        pageId: request.pageId,
        revision: request.revision,
        kind: annotation.kind,
        text: annotation.text,
      })
      .catch(() => undefined);

    return reply.code(200).send({
      pageId: request.pageId,
      revision: request.revision,
      annotation,
    });
  });
}
