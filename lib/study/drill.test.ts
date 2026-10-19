import { describe, expect, it } from "vitest";
import {
  arrangeChoices,
  buildQuestionStats,
  masteryOf,
  pickQuestions,
  seededRandom,
  type AttemptRecord,
} from "./drill";
import type { StudyQuestion } from "./types";

function q(id: string, extra: Partial<StudyQuestion> = {}): StudyQuestion {
  return {
    id,
    category: "c",
    topic: "t",
    stem: id,
    choices: ["A", "B", "C", "D"],
    answer: 1,
    explanation: "e",
    ...extra,
  };
}

const at = (minutes: number) => new Date(Date.UTC(2026, 9, 19, 0, minutes));

function attempt(
  questionId: string,
  isCorrect: boolean,
  minutes: number,
  unsure = false,
): AttemptRecord {
  return { questionId, isCorrect, unsure, answeredAt: at(minutes) };
}

describe("buildQuestionStats / masteryOf", () => {
  it("直近の解答で習熟度を決める（過去の誤答は直近の正解で上書き）", () => {
    const stats = buildQuestionStats([
      attempt("a", false, 1),
      attempt("a", true, 2),
      attempt("b", true, 1),
      attempt("b", false, 2),
      attempt("c", true, 1, true),
    ]);
    expect(stats.get("a")).toMatchObject({
      attempts: 2,
      correct: 1,
      lastCorrect: true,
    });
    expect(masteryOf(stats.get("a"))).toBe("mastered");
    expect(masteryOf(stats.get("b"))).toBe("wrong");
    expect(masteryOf(stats.get("c"))).toBe("shaky");
    expect(masteryOf(stats.get("d"))).toBe("new");
  });

  it("記録の並び順に依らず、answeredAt が最も新しい解答を直近とする", () => {
    const stats = buildQuestionStats([
      attempt("a", true, 5),
      attempt("a", false, 1),
    ]);
    expect(stats.get("a")?.lastCorrect).toBe(true);
  });
});

describe("pickQuestions", () => {
  const questions = ["a", "b", "c", "d", "e"].map((id) => q(id));
  const stats = buildQuestionStats([
    attempt("a", true, 1),
    attempt("b", false, 2),
    attempt("c", true, 3, true),
    attempt("d", true, 0),
  ]);
  const random = seededRandom("test");

  it("指定数を超えて出さない", () => {
    expect(
      pickQuestions({ questions, stats, mode: "random", count: 3, random }),
    ).toHaveLength(3);
  });

  it("未挑戦優先: 未挑戦 → 最後に解いたのが古い順", () => {
    expect(
      pickQuestions({ questions, stats, mode: "unanswered", count: 5, random }),
    ).toEqual(["e", "d", "a", "b", "c"]);
  });

  it("苦手優先: 不正解 → 自信なし → 未挑戦 → 定着 の順", () => {
    const picked = pickQuestions({
      questions,
      stats,
      mode: "weak",
      count: 5,
      random,
    });
    expect(picked.slice(0, 3)).toEqual(["b", "c", "e"]);
    expect(new Set(picked.slice(3))).toEqual(new Set(["a", "d"]));
  });

  it("復習のみ: 直近で不正解・自信なしの問題だけ", () => {
    expect(
      pickQuestions({ questions, stats, mode: "review", count: 10, random }),
    ).toEqual(["b", "c"]);
  });

  it("復習の対象が無ければ空", () => {
    expect(
      pickQuestions({
        questions,
        stats: new Map(),
        mode: "review",
        count: 10,
        random,
      }),
    ).toEqual([]);
  });
});

describe("arrangeChoices", () => {
  const question = q("x", { choices: ["正", "誤1", "誤2", "誤3"], answer: 0 });

  it("並べ替えても正答の選択肢を指し続ける", () => {
    for (const session of ["s1", "s2", "s3", "s4", "s5"]) {
      const arranged = arrangeChoices(question, session);
      expect(arranged.choices[arranged.answer]).toBe("正");
      expect([...arranged.choices].sort()).toEqual(
        [...question.choices].sort(),
      );
    }
  });

  it("同じドリル・同じ問題なら常に同じ並び", () => {
    expect(arrangeChoices(question, "s1")).toEqual(
      arrangeChoices(question, "s1"),
    );
  });

  it("ドリルが変わると正答の位置が変わりうる", () => {
    const positions = new Set(
      Array.from(
        { length: 20 },
        (_, i) => arrangeChoices(question, `s${i}`).answer,
      ),
    );
    expect(positions.size).toBeGreaterThan(1);
  });

  it("keepOrder の問題は並べ替えない", () => {
    const ordered = q("n", {
      choices: ["10", "20", "45", "90"],
      answer: 2,
      keepOrder: true,
    });
    expect(arrangeChoices(ordered, "s1")).toEqual({
      choices: ["10", "20", "45", "90"],
      answer: 2,
    });
  });
});
