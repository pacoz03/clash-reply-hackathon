import type { FastifyInstance } from 'fastify';
import { saveNotebookSchema } from '../schemas.js';
import type { DataService } from '../data/service.js';

export function registerNotebooks(app: FastifyInstance, data: DataService): void {
  app.get('/notebooks/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const nb = await data.loadNotebook(id);
    if (!nb) return reply.code(404).send({ error: 'Quaderno non trovato.' });
    return nb;
  });

  app.post('/notebooks', async (req, reply) => {
    const parsed = saveNotebookSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Quaderno non valido.', issues: parsed.error.issues });
    }
    await data.saveNotebook(parsed.data);
    return reply.code(201).send({ ok: true, id: parsed.data.id });
  });
}
