/** Identificatori, in linea con uid() del frontend (src/model.ts). */
export function uid(): string {
  return globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
