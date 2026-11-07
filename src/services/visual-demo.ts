import type { VisualElement } from "../canvas-visual";

const element = (id: string, kind: VisualElement["kind"], x: number, y: number, width: number, height: number, text = "", color: VisualElement["color"] = "ink", speech = ""): VisualElement => ({ id, kind, x, y, width, height, text, color, speech });

// Explicit examples only. These do not interpret the student's page.
export function demoDrawing(chainRule: boolean) {
  return chainRule ? {
    title: "Demo · look inside the composition",
    elements: [
      element("inner", "box", .04, .20, .34, .26, "u = x² + 1", "sage", "In this scripted example, first identify the inner function: x squared plus one."),
      element("link", "arrow", .40, .33, .17, 0, "", "ink", "The output of the inner function becomes the input of sine."),
      element("outer", "box", .60, .20, .34, .26, "sin(u)", "sage", "Sine is the outer function. Which derivative do you still need to include?"),
      element("prompt", "label", .10, .64, .82, .16, "Two functions. How do their derivatives combine?", "clay"),
    ],
  } : {
    title: "Demo · a free-body sketch",
    elements: [
      element("body", "box", .40, .31, .18, .22, "m", "ink", "This is a scripted free body diagram for a block on a horizontal surface."),
      element("surface", "line", .12, .55, .76, 0),
      element("normal", "arrow", .49, .29, 0, -.24, "N", "sage", "The normal force points away from the horizontal surface."),
      element("weight", "arrow", .49, .56, 0, .32, "mg", "clay", "Weight points vertically down. Which forces would balance if the block has no vertical acceleration?"),
      element("note", "label", .08, .91, .84, .07, "Illustrative example · not an analysis of your page", "ink"),
    ],
  };
}
