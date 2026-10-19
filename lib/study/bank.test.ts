import { describe, expect, it } from "vitest";
import { EXAMS } from "./exams";

// 問題集の整合性（ID の重複・分野の参照・選択肢の数と重複・正答の範囲）。
describe.each(EXAMS.map((exam) => [exam.id, exam] as const))(
  "問題集 %s",
  (_id, exam) => {
    const categoryIds = new Set(exam.categories.map((c) => c.id));

    it("問題 ID が重複しない", () => {
      const ids = exam.questions.map((q) => q.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("すべての問題が定義済みの分野に属し、どの分野にも問題がある", () => {
      for (const q of exam.questions) {
        expect(categoryIds.has(q.category), q.id).toBe(true);
      }
      for (const c of exam.categories) {
        expect(
          exam.questions.some((q) => q.category === c.id),
          c.id,
        ).toBe(true);
      }
    });

    it("選択肢は空でない4つで重複せず、正答は 0〜3、解説と論点がある", () => {
      for (const q of exam.questions) {
        expect(q.choices, q.id).toHaveLength(4);
        expect(new Set(q.choices).size, q.id).toBe(4);
        expect(
          q.choices.every((c) => c.trim().length > 0),
          q.id,
        ).toBe(true);
        expect([0, 1, 2, 3], q.id).toContain(q.answer);
        expect(q.explanation.trim().length, q.id).toBeGreaterThan(0);
        expect(q.topic.trim().length, q.id).toBeGreaterThan(0);
      }
    });
  },
);
