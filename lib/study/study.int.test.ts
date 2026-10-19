// 統合テスト: 使い捨ての SQLite に全マイグレーションを当て、ドリルの開始 → 解答の記録 → 完了 →
// 分析までを実際の DB で通す。
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { analyzeStudy } from "./analysis";
import { arrangeChoices } from "./drill";
import { getExam, getQuestion } from "./exams";

const dir = mkdtempSync(join(tmpdir(), "pos-study-"));
const databaseUrl = `file:${join(dir, "test.db").replace(/\\/g, "/")}`;

type Modules = {
  prisma: typeof import("../db/client").prisma;
  study: typeof import("../db/study");
};
let m: Modules;

beforeAll(async () => {
  process.env.DATABASE_URL = databaseUrl;
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "ignore",
  });
  m = {
    prisma: (await import("../db/client")).prisma,
    study: await import("../db/study"),
  };
}, 120_000);

afterAll(async () => {
  await m?.prisma.$disconnect();
  rmSync(dir, { recursive: true, force: true });
});

beforeEach(async () => {
  await m.prisma.studySession.deleteMany();
  await m.prisma.studyAdvice.deleteMany();
});

const exam = getExam("sg")!;
const IDS = ["sg-crypto-02", "sg-law-04"];

async function answer(sessionId: string, questionId: string, correct: boolean) {
  const question = getQuestion(exam, questionId)!;
  const arranged = arrangeChoices(question, sessionId);
  return m.study.recordStudyAttempt({
    sessionId,
    exam: exam.id,
    questionId,
    category: question.category,
    topic: question.topic,
    stem: question.stem,
    choices: arranged.choices,
    correctIndex: arranged.answer,
    explanation: question.explanation,
    selectedIndex: correct ? arranged.answer : (arranged.answer + 1) % 4,
    unsure: false,
  });
}

describe("ドリルの記録", () => {
  it("出題時点の問題文・選択肢・正答を写して記録し、全問解答で完了にする", async () => {
    const session = await m.study.createStudySession({
      exam: exam.id,
      mode: "random",
      categories: [],
      questionIds: IDS,
    });

    const first = await answer(session.id, IDS[0], true);
    expect(first.isCorrect).toBe(true);
    expect(first.stem).toBe(getQuestion(exam, IDS[0])!.stem);
    const choices = m.study.parseStringList(first.choices);
    expect(choices).toHaveLength(4);
    expect(choices[first.correctIndex]).toBe(
      getQuestion(exam, IDS[0])!.choices[getQuestion(exam, IDS[0])!.answer],
    );
    expect((await m.study.getStudySession(session.id))?.finishedAt).toBeNull();

    const second = await answer(session.id, IDS[1], false);
    expect(second.isCorrect).toBe(false);
    expect(
      (await m.study.getStudySession(session.id))?.finishedAt,
    ).not.toBeNull();
  });

  it("同じドリル・同じ問題への2回目の送信は記録せず、最初の記録を返す", async () => {
    const session = await m.study.createStudySession({
      exam: exam.id,
      mode: "random",
      categories: [],
      questionIds: IDS,
    });
    const first = await answer(session.id, IDS[0], true);
    const again = await answer(session.id, IDS[0], false);
    expect(again.id).toBe(first.id);
    expect(again.isCorrect).toBe(true);
    expect(await m.prisma.studyAttempt.count()).toBe(1);
  });

  it("解答記録を分析に渡せる。ドリルを削除すると解答も消える", async () => {
    const session = await m.study.createStudySession({
      exam: exam.id,
      mode: "random",
      categories: [],
      questionIds: IDS,
    });
    await answer(session.id, IDS[0], true);
    await answer(session.id, IDS[1], false);

    const report = analyzeStudy(
      exam,
      await m.study.listAttemptsForAnalysis(exam.id),
    );
    expect(report.attempts).toBe(2);
    expect(report.reviewQuestionIds).toEqual([IDS[1]]);

    expect(await m.study.findUnfinishedSession(exam.id)).toBeNull();
    await m.study.deleteStudySession(session.id);
    expect(await m.prisma.studyAttempt.count()).toBe(0);
  });
});
