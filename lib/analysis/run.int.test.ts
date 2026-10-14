// 統合テスト: 使い捨ての SQLite に全マイグレーションを当て、投稿 → 原文保存 → AI 解析 → 結果取得
// までを実際の DB で通す（Issue #20）。AI は deps.interpret をモックに差し替え、実 API には接続しない。
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { RawInterpretation } from "../domain/interpretation";

const dir = mkdtempSync(join(tmpdir(), "pos-analysis-"));
const databaseUrl = `file:${join(dir, "test.db").replace(/\\/g, "/")}`;

// 対象モジュールは DATABASE_URL を設定してから読み込む（Prisma Client が接続先を読むため）。
type Modules = {
  prisma: typeof import("../db/client").prisma;
  memos: typeof import("../db/memos");
  entries: typeof import("../db/entries");
  run: typeof import("./run");
  ai: typeof import("../ai/client");
};
let m: Modules;

function rawResult(
  overrides: Partial<RawInterpretation> = {},
): RawInterpretation {
  return {
    categories: ["task_candidate"],
    summary: "見積もりを送る",
    uncertain: false,
    tasks: [
      {
        title: "見積もりを送る",
        due: { text: "明日", date: "2026-10-16", time: null },
        people: ["田中さん"],
        nextAction: null,
        confidence: "high",
      },
    ],
    events: [],
    knowledge: null,
    topics: ["仕事"],
    ...overrides,
  };
}

const NOW = new Date("2026-10-15T03:00:00Z");

function deps(
  interpret: (text: string) => Promise<{ raw: unknown; model: string }>,
) {
  return { interpret, now: () => NOW };
}

const ok = deps(async () => ({ raw: rawResult(), model: "mock-model" }));

beforeAll(async () => {
  process.env.DATABASE_URL = databaseUrl;
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "ignore",
  });
  m = {
    prisma: (await import("../db/client")).prisma,
    memos: await import("../db/memos"),
    entries: await import("../db/entries"),
    run: await import("./run"),
    ai: await import("../ai/client"),
  };
}, 120_000);

afterAll(async () => {
  await m?.prisma.$disconnect();
  rmSync(dir, { recursive: true, force: true });
});

beforeEach(async () => {
  const { prisma } = m;
  await prisma.memo.deleteMany();
  await prisma.aiAnalysis.deleteMany();
  await prisma.entry.deleteMany({ where: { state: "S2" } });
  await prisma.entry.deleteMany({ where: { revisesEntryId: { not: null } } });
  await prisma.entry.deleteMany();
});

async function post(text: string, requestAnalysis = true) {
  return m.memos.createMemoPost({ text, requestAnalysis }, NOW);
}

describe("投稿（原文の保存）", () => {
  it("原文を S1 原情報（origin=human）として保存し、Memo と紐づけて解析を予約する", async () => {
    const text = "明日までに田中さんに見積もりを送る #仕事";
    const { memoId, entryId } = await post(`  ${text}  `);

    const entry = await m.prisma.entry.findUniqueOrThrow({
      where: { id: entryId },
    });
    expect(entry).toMatchObject({
      body: text,
      state: "S1",
      origin: "human",
      source: "timeline",
      sourceEntryId: null,
    });
    const memo = await m.prisma.memo.findUniqueOrThrow({
      where: { id: memoId },
      include: { tags: true },
    });
    expect(memo.entryId).toBe(entryId);
    expect(memo.tags.map((t) => t.name)).toEqual(["仕事"]);
    const analysis = await m.prisma.aiAnalysis.findUnique({
      where: { sourceEntryId: entryId },
    });
    expect(analysis?.status).toBe("pending");
  });

  it("API キー未設定（解析を予約しない）でも投稿できる", async () => {
    const { entryId } = await post("AI なしでも書ける", false);
    expect(await m.prisma.entry.count({ where: { id: entryId } })).toBe(1);
    expect(await m.prisma.aiAnalysis.count()).toBe(0);
  });

  it("同じ本文の連続投稿（二重送信）は1件にまとめる", async () => {
    const first = await post("連打したメモ");
    const second = await post("連打したメモ");
    expect(second).toMatchObject({ memoId: first.memoId, duplicate: true });
    expect(await m.prisma.memo.count()).toBe(1);
    expect(await m.prisma.entry.count()).toBe(1);
  });

  it("空の投稿は拒否する", async () => {
    await expect(post("   ")).rejects.toThrow(m.memos.MemoValidationError);
  });
});

describe("AI 解析", () => {
  it("解析結果を S2 解釈（origin=ai, sourceEntryId=原情報）として保存し、原文は変えない", async () => {
    const { entryId } = await post("明日までに田中さんに見積もりを送る");

    const outcome = await m.run.runAnalysis(entryId, ok);
    expect(outcome).toEqual({ status: "succeeded" });

    const source = await m.prisma.entry.findUniqueOrThrow({
      where: { id: entryId },
    });
    expect(source.body).toBe("明日までに田中さんに見積もりを送る");
    const derived = await m.prisma.entry.findMany({
      where: { sourceEntryId: entryId },
    });
    expect(derived).toHaveLength(1);
    expect(derived[0]).toMatchObject({
      origin: "ai",
      state: "S2",
      source: m.entries.INTERPRETATION_SOURCE,
    });
    expect(JSON.parse(derived[0].body)).toMatchObject({
      v: 1,
      categories: ["task_candidate"],
      tasks: [{ title: "見積もりを送る", confidence: "high" }],
    });
    const analysis = await m.prisma.aiAnalysis.findUniqueOrThrow({
      where: { sourceEntryId: entryId },
    });
    expect(analysis).toMatchObject({
      status: "succeeded",
      model: "mock-model",
      attempts: 1,
    });
  });

  it("一覧取得で、原文と解析結果が紐づいて返る", async () => {
    const { memoId, entryId } = await post("明日までに見積もりを送る");
    await m.run.runAnalysis(entryId, ok);
    const [memo] = await m.memos.listMemos();
    expect(memo.id).toBe(memoId);
    expect(memo.entry?.aiAnalysis?.status).toBe("succeeded");
    expect(memo.entry?.derivedEntries).toHaveLength(1);
  });

  it("成功した版は再解析しない（解釈を重複して作らない）", async () => {
    const { entryId } = await post("一度だけ解析する");
    await m.run.runAnalysis(entryId, ok);
    let calls = 0;
    const counting = deps(async () => {
      calls += 1;
      return { raw: rawResult(), model: "mock-model" };
    });
    expect(await m.run.runAnalysis(entryId, counting)).toEqual({
      status: "skipped",
    });
    expect(calls).toBe(0);
    expect(
      await m.prisma.entry.count({ where: { sourceEntryId: entryId } }),
    ).toBe(1);
  });

  it("同時に来た解析要求は1回だけ実行する", async () => {
    const { entryId } = await post("同時に解析される");
    let calls = 0;
    const slow = deps(async () => {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { raw: rawResult(), model: "mock-model" };
    });
    const outcomes = await Promise.all([
      m.run.runAnalysis(entryId, slow),
      m.run.runAnalysis(entryId, slow),
    ]);
    expect(outcomes.map((o) => o.status).sort()).toEqual([
      "skipped",
      "succeeded",
    ]);
    expect(calls).toBe(1);
    expect(
      await m.prisma.entry.count({ where: { sourceEntryId: entryId } }),
    ).toBe(1);
  });

  it("AI API エラーでも原文は残り、失敗として記録され、再解析できる", async () => {
    const { memoId, entryId } = await post("API が落ちていた時のメモ");
    const failing = deps(async () => {
      throw new Error("network down");
    });

    const outcome = await m.run.runAnalysis(entryId, failing);
    expect(outcome.status).toBe("failed");
    expect(outcome.error).toBeTruthy();

    expect(await m.prisma.memo.count({ where: { id: memoId } })).toBe(1);
    const source = await m.prisma.entry.findUniqueOrThrow({
      where: { id: entryId },
    });
    expect(source.body).toBe("API が落ちていた時のメモ");
    expect(
      await m.prisma.entry.count({ where: { sourceEntryId: entryId } }),
    ).toBe(0);
    expect(
      (
        await m.prisma.aiAnalysis.findUniqueOrThrow({
          where: { sourceEntryId: entryId },
        })
      ).status,
    ).toBe("failed");

    // 再解析すると成功し、解釈は1件だけ。
    expect(await m.run.runAnalysis(entryId, ok)).toEqual({
      status: "succeeded",
    });
    expect(
      await m.prisma.entry.count({ where: { sourceEntryId: entryId } }),
    ).toBe(1);
    const analysis = await m.prisma.aiAnalysis.findUniqueOrThrow({
      where: { sourceEntryId: entryId },
    });
    expect(analysis).toMatchObject({
      status: "succeeded",
      attempts: 2,
      error: null,
    });
  });

  it("API キー未設定のエラーは利用者向けの文言で失敗として残る", async () => {
    const { entryId } = await post("キーなし");
    const noKey = deps(async () => {
      throw new m.ai.AiNotConfiguredError();
    });
    const outcome = await m.run.runAnalysis(entryId, noKey);
    expect(outcome).toEqual({
      status: "failed",
      error: new m.ai.AiNotConfiguredError().message,
    });
  });

  it("形式が不正な AI 応答は保存しない", async () => {
    const { entryId } = await post("壊れた応答");
    const broken = deps(async () => ({
      raw: { categories: "task" },
      model: "mock",
    }));
    const outcome = await m.run.runAnalysis(entryId, broken);
    expect(outcome.status).toBe("failed");
    expect(
      await m.prisma.entry.count({ where: { sourceEntryId: entryId } }),
    ).toBe(0);
  });

  it("途中で止まった解析（中断）は引き継いで実行できる", async () => {
    const { entryId } = await post("中断された解析");
    await m.prisma.aiAnalysis.update({
      where: { sourceEntryId: entryId },
      data: {
        status: "running",
        startedAt: new Date(NOW.getTime() - 10 * 60_000),
      },
    });
    expect(await m.run.runAnalysis(entryId, ok)).toEqual({
      status: "succeeded",
    });
  });

  it("原情報以外（S2）は解析の対象にできない", async () => {
    const { entryId } = await post("元の記録");
    await m.run.runAnalysis(entryId, ok);
    const derived = await m.prisma.entry.findFirstOrThrow({
      where: { sourceEntryId: entryId },
    });
    await expect(m.run.runAnalysis(derived.id, ok)).rejects.toThrow(
      /only an original/,
    );
    await expect(
      m.prisma.$transaction((tx) =>
        m.entries.createInterpretationEntry(tx, {
          sourceEntryId: derived.id,
          body: "{}",
        }),
      ),
    ).rejects.toThrow(/only an original/);
  });
});

describe("編集と削除（来歴）", () => {
  it("本文の編集は新版の原情報を作り、旧版とその解釈は来歴として残る", async () => {
    const { memoId, entryId: v1 } = await post("最初の本文");
    await m.run.runAnalysis(v1, ok);

    const { entryId: v2, newVersion } = await m.memos.updateMemoPost(memoId, {
      text: "直した本文",
      requestAnalysis: true,
    });
    expect(newVersion).toBe(true);
    expect(v2).not.toBe(v1);

    const [oldVersion, newEntry, memo] = await Promise.all([
      m.prisma.entry.findUniqueOrThrow({ where: { id: v1 } }),
      m.prisma.entry.findUniqueOrThrow({ where: { id: v2 } }),
      m.prisma.memo.findUniqueOrThrow({ where: { id: memoId } }),
    ]);
    expect(oldVersion.body).toBe("最初の本文");
    expect(newEntry).toMatchObject({
      body: "直した本文",
      state: "S1",
      revisesEntryId: v1,
    });
    expect(memo.entryId).toBe(v2);
    expect(await m.prisma.entry.count({ where: { sourceEntryId: v1 } })).toBe(
      1,
    );
    expect(
      (
        await m.prisma.aiAnalysis.findUniqueOrThrow({
          where: { sourceEntryId: v2 },
        })
      ).status,
    ).toBe("pending");
  });

  it("タグだけの変更では新版を作らない", async () => {
    const { memoId, entryId } = await post("タグを足すだけ");
    const result = await m.memos.updateMemoPost(memoId, {
      text: "タグを足すだけ",
      extraTags: "あとで",
      requestAnalysis: true,
    });
    expect(result).toEqual({ entryId, newVersion: false });
    expect(await m.prisma.entry.count()).toBe(1);
  });

  it("削除すると、原情報の全版・AI 解釈・解析記録も一緒に消える", async () => {
    const { memoId, entryId: v1 } = await post("消すメモ");
    await m.run.runAnalysis(v1, ok);
    const { entryId: v2 } = await m.memos.updateMemoPost(memoId, {
      text: "消すメモ（改）",
      requestAnalysis: true,
    });
    await m.run.runAnalysis(v2, ok);

    await m.memos.deleteMemoPost(memoId);
    expect(await m.prisma.memo.count()).toBe(0);
    expect(await m.prisma.entry.count()).toBe(0);
    expect(await m.prisma.aiAnalysis.count()).toBe(0);
  });
});
