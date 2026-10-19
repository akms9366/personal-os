import { describe, expect, it } from "vitest";
import { analyzeStudy, type AnalysisAttempt } from "./analysis";
import type { StudyExam } from "./types";

const exam: StudyExam = {
  id: "t",
  name: "テスト試験",
  shortName: "T",
  summary: "",
  categories: [
    { id: "a", label: "分野A", scope: "", studyHint: "A のヒント。" },
    { id: "b", label: "分野B", scope: "", studyHint: "B のヒント。" },
    { id: "c", label: "分野C", scope: "", studyHint: "C のヒント。" },
  ],
  questions: [
    ...["a1", "a2", "a3"].map((id) => ({ id, category: "a", topic: "暗号" })),
    ...["b1", "b2"].map((id) => ({ id, category: "b", topic: "法規" })),
    { id: "c1", category: "c", topic: "監査" },
  ].map((q) => ({
    ...q,
    stem: q.id,
    choices: ["1", "2", "3", "4"] as const,
    answer: 0 as const,
    explanation: "",
  })),
};

const NOW = new Date("2026-10-19T03:00:00Z"); // JST 12:00

function a(
  questionId: string,
  isCorrect: boolean,
  daysAgo = 0,
  unsure = false,
): AnalysisAttempt {
  const q = exam.questions.find((x) => x.id === questionId)!;
  return {
    questionId,
    category: q.category,
    topic: q.topic,
    isCorrect,
    unsure,
    answeredAt: new Date(NOW.getTime() - daysAgo * 86_400_000),
  };
}

describe("analyzeStudy", () => {
  it("記録が無いときは「まず解いてみる」だけを提案する", () => {
    const report = analyzeStudy(exam, [], NOW);
    expect(report.accuracy).toBeNull();
    expect(report.recommendations).toHaveLength(1);
    expect(report.recommendations[0].drill?.mode).toBe("random");
  });

  it("分野別の正答率・習熟度の内訳・挑戦済み数を集計する", () => {
    const report = analyzeStudy(
      exam,
      [
        a("a1", false),
        a("a1", true),
        a("a2", false),
        a("a3", true, 0, true),
        a("b1", true),
      ],
      NOW,
    );
    const catA = report.categories.find((c) => c.category.id === "a")!;
    expect(catA).toMatchObject({
      attempts: 4,
      correct: 2,
      accuracy: 0.5,
      attempted: 3,
    });
    expect(catA.mastery).toEqual({ mastered: 1, shaky: 1, wrong: 1, new: 0 });
    expect(report.questionsAttempted).toBe(4);
    expect(report.reviewQuestionIds.sort()).toEqual(["a2", "a3"]);
  });

  it("目標未達の分野を、誤答の多い論点と学び方のヒント付きで提案する", () => {
    const report = analyzeStudy(
      exam,
      [
        a("a1", false),
        a("a2", false),
        a("a3", true),
        a("b1", true),
        a("b2", true),
        a("b1", true),
      ],
      NOW,
    );
    const first = report.recommendations[0];
    expect(first.title).toContain("分野A");
    expect(first.detail).toContain("「暗号」");
    expect(first.detail).toContain("A のヒント。");
    expect(first.drill).toEqual({ mode: "weak", categories: ["a"] });
    // 解答数が少ない分野C は「弱い」と決めつけず、未挑戦として提案する。
    expect(
      report.recommendations.some((r) => r.drill?.categories.includes("c")),
    ).toBe(true);
    expect(report.recommendations.some((r) => r.title.includes("分野B"))).toBe(
      false,
    );
  });

  it("苦手な論点は誤答の多い順", () => {
    const report = analyzeStudy(
      exam,
      [a("a1", false), a("a2", false), a("b1", false), a("b2", true)],
      NOW,
    );
    expect(report.weakTopics.map((t) => [t.topic, t.wrong])).toEqual([
      ["暗号", 2],
      ["法規", 1],
    ]);
  });

  it("日別の集計は JST の暦日で、直近7日の解答数を数える", () => {
    const report = analyzeStudy(
      exam,
      [a("a1", true, 0), a("a2", true, 3), a("a3", true, 10)],
      NOW,
    );
    expect(report.daily).toHaveLength(14);
    expect(report.daily.at(-1)).toEqual({
      date: "2026-10-19",
      attempts: 1,
      correct: 1,
    });
    expect(report.last7DaysAttempts).toBe(2);
    expect(report.studyDays).toBe(3);
  });

  it("1週間解答が無ければペースの立て直しを提案する", () => {
    const report = analyzeStudy(exam, [a("a1", true, 9)], NOW);
    expect(report.recommendations.some((r) => r.title.includes("ペース"))).toBe(
      true,
    );
  });
});
