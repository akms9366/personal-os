import { describe, expect, it } from "vitest";
import { normalizeTagNames } from "./memos";

describe("normalizeTagNames", () => {
  it("splits on newlines and commas, strips # and dedupes", () => {
    expect(normalizeTagNames("#本\n映画, 本、 旅行 \n\n")).toEqual([
      "本",
      "映画",
      "旅行",
    ]);
  });

  it("returns an empty list for blank input", () => {
    expect(normalizeTagNames("  \n , ")).toEqual([]);
  });
});
