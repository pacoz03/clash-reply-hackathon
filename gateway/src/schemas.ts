import { z } from 'zod';

// Larghezza logica della pagina, condivisa col frontend (src/model.ts).
export const PAGE_WIDTH = 794;

export const selectionSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().positive(),
  height: z.number().positive(),
});
export type Selection = z.infer<typeof selectionSchema>;

/** Corpo di POST /tutor/help (contratto fissato dal frontend). */
export const tutorRequestSchema = z.object({
  pageId: z.string().min(1),
  revision: z.number().int().nonnegative(),
  image: z.string().min(1), // data URL: consegna + tratti, senza selezione/annotazioni
  selection: selectionSchema.nullable(),
  question: z.string().min(1),
  previousHints: z.array(z.string()).default([]),
});
export type TutorRequest = z.infer<typeof tutorRequestSchema>;

/** Annotazione che il gateway restituisce al frontend (specchia annotationSchema del modello). */
export const annotationSchema = z.object({
  id: z.string().min(1),
  anchor: selectionSchema,
  text: z.string().min(1).max(600),
  kind: z.enum(['hint', 'question']),
  source: z.string().optional(),
});
export type Annotation = z.infer<typeof annotationSchema>;

export const tutorResponseSchema = z.object({
  pageId: z.string().min(1),
  revision: z.number().int().nonnegative(),
  annotation: annotationSchema,
});
export type TutorResponse = z.infer<typeof tutorResponseSchema>;

/** Quello che il MODELLO deve produrre: solo il contenuto, non id né coordinate. */
export const modelOutputSchema = z.object({
  kind: z.enum(['hint', 'question']),
  text: z.string().min(1),
  source: z.string().optional(),
});
export type ModelOutput = z.infer<typeof modelOutputSchema>;

// ---- notebook (salvataggio lato server, backup) ----
export const saveNotebookSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  payload: z.string().min(1), // notebook serializzato (JSON)
});
export type SaveNotebook = z.infer<typeof saveNotebookSchema>;
