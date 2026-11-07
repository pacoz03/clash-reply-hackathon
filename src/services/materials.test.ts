import { describe, expect, it } from "vitest";
import { citationMatches, selectSourceExcerpts } from "./materials";
import type { Material } from "../library";
const material: Material = {
  id: "notes",
  subjectId: "course",
  name: "Lecture.pdf",
  type: "application/pdf",
  size: 1,
  addedAt: 1,
  textPages: [
    "Newton's laws describe forces.",
    "The chain rule differentiates composite functions.",
  ],
};
describe("course sources", () => {
  it("selects the relevant real page and preserves its document identity", () => {
    const result = selectSourceExcerpts([material], "chain rule composite");
    expect(result[0]).toEqual({
      materialId: "notes",
      name: "Lecture.pdf",
      page: 2,
      text: material.textPages![1],
    });
  });
  it("bounds long excerpts without inventing text or changing the page number", () => {
    const result = selectSourceExcerpts(
      [{ ...material, textPages: ["x ".repeat(15000)] }],
      "",
    );
    expect(result).toHaveLength(8);
    expect(
      result.every(
        (e) =>
          e.page === 1 && e.text.length <= 2800 && material.id === e.materialId,
      ),
    ).toBe(true);
  });
  it("has no source when no attached document has readable text", () => {
    expect(
      selectSourceExcerpts(
        [{ ...material, textPages: ["", " "] }],
        "chain rule",
      ),
    ).toEqual([]);
  });
  it("accepts quoted text with normalized whitespace, rejecting an invented quote or page", () => {
    const excerpts = selectSourceExcerpts([material], "chain rule");
    const ref = {
      materialId: "notes",
      page: 2,
      quote: "chain  rule differentiates",
    };
    expect(citationMatches(excerpts, ref)).toBe(true);
    expect(citationMatches(excerpts, { ...ref, page: 1 })).toBe(false);
    expect(
      citationMatches(excerpts, { ...ref, quote: "invented theorem" }),
    ).toBe(false);
    expect(citationMatches(excerpts, { ...ref, materialId: "other" })).toBe(
      false,
    );
    expect(
      citationMatches(excerpts, { ...ref, quote: "                  " }),
    ).toBe(false);
  });
});
