import { expect, it } from "vitest";
import { layoutNotes } from "./note-layout";
import type { Annotation } from "./model";
const annotation = (id: string, y: number): Annotation => ({
  id,
  kind: "hint",
  text: "Indizio",
  anchor: { x: 100, y, width: 100, height: 40 },
});
it("allinea il primo indizio allo zoom e sposta i successivi senza sovrapporli", () => {
  const result = layoutNotes(
    [annotation("a", 300), annotation("b", 310), annotation("c", 900)],
    0.5,
    1123,
    { a: 150, b: 180, c: 80 },
    false,
  );
  expect(result.positions).toEqual([150, 312, 504]);
  expect(result.bottom).toBe(584);
});
it("sui formati compatti lascia libera la selezione e contiene una nota sul fondo", () => {
  expect(
    layoutNotes([annotation("a", 100)], 0.5, 1123, { a: 180 }, true)
      .positions[0],
  ).toBe(84);
  expect(
    layoutNotes([annotation("a", 1100)], 0.5, 1123, { a: 180 }, true).bottom,
  ).toBeLessThanOrEqual(561.5);
});
