// 統合テスト: 使い捨ての SQLite に全マイグレーションを当て、AI 解釈（S2）→ 行動候補（S4）→
// 利用者の決定（S5）→ Task までを実際の DB で通す（Issue #21）。AI はモックで、実 API には接続しない。
import { execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { RawInterpretation } from "../domain/interpretation";

const dir = mkdtempSync(join(tmpdir(), "pos-decide-"));
const databaseUrl = `file:${join(dir, "test.db").replace(/\\/g, "/")}`;

type Modules = {
  prisma: typeof import("../db/client").prisma;
  memos: typeof import("../db/memos");
  suggestions: typeof import("../db/suggestions");
  run: typeof import("../analysis/run");
  view: typeof import("../../components/memo/memoView");
};
let m: Modules;

const NOW = new Date("2026-10-15T03:00:00Z");

function raw(): RawInterpretation {
  return {
    categories: ["task_candidate"],
    summary: "見積もりと資料",
    uncertain: false,
    tasks: [
      {
        title: "見積もりを送る",
        due: { text: "明日", date: "2026-10-16", time: null },
        people: ["田中さん"],
        nextAction: null,
        confidence: "high",
      },
      {
        title: "資料を確認する",
        due: { text: "来週まで", date: null, time: null },
        people: [],
        nextAction: null,
        confidence: "low",
      },
    ],
    events: [],
    knowledge: null,
    topics: [],
  };
}

const deps = {
  interpret: async () => ({ raw: raw(), model: "mock-model" }),
  now: () => NOW,
};

const FINAL = {
  title: "見積もりを送る",
  dueDate: "2026-10-16",
  dueTime: "23:59",
  importance: 3,
  urgency: 2,
};

beforeAll(async () => {
  process.env.DATABASE_URL = databaseUrl;
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "ignore",
  });
  m = {
    prisma: (await import("../db/client")).prisma,
    memos: await import("../db/memos"),
    suggestions: await import("../db/suggestions"),
    run: await import("../analysis/run"),
    view: await import("../../components/memo/memoView"),
  };
}, 120_000);

afterAll(async () => {
  await m?.prisma.$disconnect();
  rmSync(dir, { recursive: true, force: true });
});

beforeEach(async () => {
  const { prisma } = m;
  await prisma.task.deleteMany();
  await prisma.memo.deleteMany();
  await prisma.aiAnalysis.deleteMany();
  // 子（派生・新版）から順に消す（親を先に消すと参照の制約に当たる）。
  let rows = await prisma.entry.findMany({
    select: { id: true, sourceEntryId: true, revisesEntryId: true },
  });
  while (rows.length > 0) {
    const referenced = new Set(
      rows.flatMap((row) =>
        [row.sourceEntryId, row.revisesEntryId].filter(
          (id): id is string => id !== null,
        ),
      ),
    );
    const leaves = rows.filter((row) => !referenced.has(row.id));
    await prisma.entry.deleteMany({
      where: { id: { in: leaves.map((row) => row.id) } },
    });
    const gone = new Set(leaves.map((row) => row.id));
    rows = rows.filter((row) => !gone.has(row.id));
  }
});

/// 投稿して解析まで済ませ、行動候補（S4）を返す。
async function analyzedPost(
  text = "明日までに田中さんに見積もりを送る。来週までに資料を確認する",
) {
  const { memoId, entryId } = await m.memos.createMemoPost(
    { text, requestAnalysis: true },
    NOW,
  );
  await m.run.runAnalysis(entryId, deps);
  const s2 = await m.prisma.entry.findFirstOrThrow({
    where: { sourceEntryId: entryId, state: "S2" },
  });
  const s4 = await m.prisma.entry.findMany({
    where: { sourceEntryId: s2.id, state: "S4" },
    orderBy: { id: "asc" },
  });
  return { memoId, entryId, s2, s4 };
}

/// Task → 決定（S5）→ 提案（S4）→ 解釈（S2）→ 原情報（S1）と来歴を辿る。
async function provenance(taskId: string) {
  const chain: string[] = [];
  const task = await m.prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  let id: string | null = task.originEntryId;
  while (id) {
    const entry: { state: string; sourceEntryId: string | null } =
      await m.prisma.entry.findUniqueOrThrow({ where: { id } });
    chain.push(entry.state);
    id = entry.sourceEntryId;
  }
  return chain;
}

describe("行動候補（S4）の生成", () => {
  it("解釈（S2）のタスク候補ごとに、AI 由来の S4 を作って解釈に紐づける", async () => {
    const { s2, s4 } = await analyzedPost();
    expect(s4).toHaveLength(2);
    for (const entry of s4) {
      expect(entry).toMatchObject({
        state: "S4",
        origin: "ai",
        source: "ai-suggestion",
        sourceEntryId: s2.id,
      });
    }
    expect(JSON.parse(s4[0].body)).toMatchObject({
      kind: "task",
      index: 0,
      title: "見積もりを送る",
    });
  });

  it("同じ解釈から重複して作らない", async () => {
    const { s2, s4 } = await analyzedPost();
    const { parseStoredInterpretation } =
      await import("../domain/interpretation");
    const interpretation = parseStoredInterpretation(s2.body)!;
    const created = await m.prisma.$transaction((tx) =>
      m.suggestions.createSuggestionsForInterpretation(
        tx,
        s2.id,
        interpretation,
      ),
    );
    expect(created).toBe(0);
    expect(await m.prisma.entry.count({ where: { state: "S4" } })).toBe(
      s4.length,
    );
  });

  it("タスク候補が無い解釈からは作らない", async () => {
    const { entryId } = await m.memos.createMemoPost(
      { text: "なんとなくのメモ", requestAnalysis: true },
      NOW,
    );
    await m.run.runAnalysis(entryId, {
      interpret: async () => ({
        raw: { ...raw(), tasks: [], categories: ["note"] },
        model: "mock",
      }),
      now: () => NOW,
    });
    expect(await m.prisma.entry.count({ where: { state: "S4" } })).toBe(0);
  });
});

describe("決定（S5）と Task 化", () => {
  it("採用すると、利用者の決定（S5）を記録して Task を作る。来歴を辿れる", async () => {
    const { s4 } = await analyzedPost();
    const result = await m.suggestions.decideSuggestion(s4[0].id, {
      decision: "adopt",
      final: FINAL,
    });
    expect(result).toMatchObject({ ok: true, decision: "adopt" });

    const s5 = await m.prisma.entry.findMany({ where: { state: "S5" } });
    expect(s5).toHaveLength(1);
    expect(s5[0]).toMatchObject({
      origin: "human",
      source: "user-decision",
      sourceEntryId: s4[0].id,
      revisesEntryId: null,
    });

    const task = await m.prisma.task.findFirstOrThrow({});
    expect(task).toMatchObject({
      title: "見積もりを送る",
      importance: 3,
      urgency: 2,
      status: "todo",
      originEntryId: s5[0].id,
    });
    expect(task.dueAt?.toISOString()).toBe("2026-10-16T14:59:00.000Z");
    expect(task.note).toContain("田中さんに見積もりを送る");
    // Task → 決定(S5) → 提案(S4) → 解釈(S2) → 原情報(S1)
    expect(await provenance(task.id)).toEqual(["S5", "S4", "S2", "S1"]);
  });

  it("候補を修正して採用すると modify として記録し、修正前の候補も残す", async () => {
    const { s4 } = await analyzedPost();
    await m.suggestions.decideSuggestion(s4[1].id, {
      decision: "adopt",
      final: { ...FINAL, title: "資料を読んで確認する", dueDate: "2026-10-23" },
    });
    const s5 = await m.prisma.entry.findFirstOrThrow({
      where: { state: "S5" },
    });
    const body = JSON.parse(s5.body);
    expect(body.decision).toBe("modify");
    expect(body.candidate.title).toBe("資料を確認する");
    expect(body.final.title).toBe("資料を読んで確認する");
    expect((await m.prisma.task.findFirstOrThrow({})).title).toBe(
      "資料を読んで確認する",
    );
  });

  it("却下・保留は Task を作らず、採用と同じ決定（S5）として記録する", async () => {
    const { s4 } = await analyzedPost();
    expect(
      await m.suggestions.decideSuggestion(s4[0].id, {
        decision: "reject",
        reason: "not_now",
      }),
    ).toMatchObject({ ok: true, decision: "reject", taskId: null });
    expect(
      await m.suggestions.decideSuggestion(s4[1].id, { decision: "hold" }),
    ).toMatchObject({ ok: true, decision: "hold", taskId: null });

    expect(await m.prisma.task.count()).toBe(0);
    const decisions = await m.prisma.entry.findMany({ where: { state: "S5" } });
    expect(decisions).toHaveLength(2);
    expect(decisions.every((d) => d.origin === "human")).toBe(true);
    const reject = decisions.find((d) => d.sourceEntryId === s4[0].id)!;
    expect(JSON.parse(reject.body)).toMatchObject({
      decision: "reject",
      reason: "not_now",
    });
  });

  it("保留・却下はあとから決め直せる。前の決定は消さず、新しい版として残る", async () => {
    const { s4 } = await analyzedPost();
    await m.suggestions.decideSuggestion(s4[0].id, { decision: "hold" });
    const held = await m.prisma.entry.findFirstOrThrow({
      where: { state: "S5" },
    });
    const heldBody = held.body;

    const rejected = await m.suggestions.decideSuggestion(s4[0].id, {
      decision: "reject",
    });
    expect(rejected.ok).toBe(true);
    const adopted = await m.suggestions.decideSuggestion(s4[0].id, {
      decision: "adopt",
      final: FINAL,
    });
    expect(adopted).toMatchObject({ ok: true, decision: "adopt" });

    const all = await m.prisma.entry.findMany({
      where: { state: "S5" },
      orderBy: { createdAt: "asc" },
    });
    expect(all).toHaveLength(3);
    expect(all[1].revisesEntryId).toBe(all[0].id);
    expect(all[2].revisesEntryId).toBe(all[1].id);
    expect(all.every((d) => d.sourceEntryId === s4[0].id)).toBe(true);
    expect(
      (await m.prisma.entry.findUniqueOrThrow({ where: { id: held.id } })).body,
    ).toBe(heldBody);
    expect(await m.prisma.task.count()).toBe(1);
    // Task の起点は最新の決定。
    expect((await m.prisma.task.findFirstOrThrow({})).originEntryId).toBe(
      all[2].id,
    );
  });

  it("同じ決定への変更は拒否する", async () => {
    const { s4 } = await analyzedPost();
    await m.suggestions.decideSuggestion(s4[0].id, { decision: "hold" });
    expect(
      await m.suggestions.decideSuggestion(s4[0].id, { decision: "hold" }),
    ).toMatchObject({
      ok: false,
    });
    expect(await m.prisma.entry.count({ where: { state: "S5" } })).toBe(1);
  });

  it("Task を作った採用は決め直せない。タスクを削除すれば決め直せる", async () => {
    const { s4 } = await analyzedPost();
    await m.suggestions.decideSuggestion(s4[0].id, {
      decision: "adopt",
      final: FINAL,
    });

    const blocked = await m.suggestions.decideSuggestion(s4[0].id, {
      decision: "reject",
    });
    expect(blocked.ok).toBe(false);
    expect(await m.prisma.task.count()).toBe(1);

    await m.prisma.task.deleteMany();
    const again = await m.suggestions.decideSuggestion(s4[0].id, {
      decision: "adopt",
      final: FINAL,
    });
    expect(again).toMatchObject({ ok: true, decision: "adopt" });
    expect(await m.prisma.task.count()).toBe(1);
  });

  it("同時に2回採用しても、Task は1件だけ作られる", async () => {
    const { s4 } = await analyzedPost();
    const results = await Promise.all([
      m.suggestions.decideSuggestion(s4[0].id, {
        decision: "adopt",
        final: FINAL,
      }),
      m.suggestions.decideSuggestion(s4[0].id, {
        decision: "adopt",
        final: FINAL,
      }),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(await m.prisma.task.count()).toBe(1);
    expect(await m.prisma.entry.count({ where: { state: "S5" } })).toBe(1);
  });

  it("不正な入力・存在しない提案・提案以外は拒否し、何も作らない", async () => {
    const { s2, s4 } = await analyzedPost();
    expect(
      await m.suggestions.decideSuggestion(s4[0].id, {
        decision: "adopt",
        final: { ...FINAL, title: " " },
      }),
    ).toMatchObject({ ok: false });
    expect(
      await m.suggestions.decideSuggestion("nope", { decision: "hold" }),
    ).toMatchObject({
      ok: false,
    });
    // 提案（S4）ではない Entry（AI 解釈 S2）には決定できない。
    expect(
      await m.suggestions.decideSuggestion(s2.id, { decision: "hold" }),
    ).toMatchObject({
      ok: false,
    });
    expect(await m.prisma.task.count()).toBe(0);
    expect(await m.prisma.entry.count({ where: { state: "S5" } })).toBe(0);
  });
});

describe("タイムラインでの表示用データ", () => {
  it("一覧で、提案とそれぞれの決定状態・作られたタスクが原文に紐づいて返る", async () => {
    const { memoId, s4 } = await analyzedPost();
    await m.suggestions.decideSuggestion(s4[0].id, {
      decision: "adopt",
      final: FINAL,
    });
    await m.suggestions.decideSuggestion(s4[1].id, {
      decision: "reject",
      reason: "wrong_content",
    });

    const memos = await m.memos.listMemos();
    const view = m.view.toMemoPostView(
      memos.find((x) => x.id === memoId)!,
      NOW,
    );
    expect(view.analysis.state).toBe("succeeded");
    if (view.analysis.state !== "succeeded") throw new Error("unreachable");
    const [adopted, rejected] = view.analysis.suggestions;
    expect(adopted.decision).toMatchObject({
      state: "adopt",
      task: { title: "見積もりを送る", status: "todo" },
    });
    expect(rejected.decision).toMatchObject({
      state: "reject",
      reasonLabel: "内容が違う",
    });
  });

  it("決め直したら、最新の決定だけを現在の状態として返す", async () => {
    const { memoId, s4 } = await analyzedPost();
    await m.suggestions.decideSuggestion(s4[0].id, { decision: "hold" });
    await m.suggestions.decideSuggestion(s4[0].id, { decision: "reject" });
    const memos = await m.memos.listMemos();
    const view = m.view.toMemoPostView(
      memos.find((x) => x.id === memoId)!,
      NOW,
    );
    if (view.analysis.state !== "succeeded") throw new Error("unreachable");
    expect(view.analysis.suggestions[0].decision.state).toBe("reject");
    expect(view.analysis.suggestions[1].decision.state).toBe("undecided");
  });
});

describe("投稿の削除と来歴", () => {
  it("未採用の提案・決定は、削除で原情報・解釈と一緒に消える", async () => {
    const { memoId, s4 } = await analyzedPost();
    await m.suggestions.decideSuggestion(s4[0].id, { decision: "hold" });
    await m.suggestions.decideSuggestion(s4[0].id, { decision: "reject" });

    await m.memos.deleteMemoPost(memoId);
    expect(await m.prisma.memo.count()).toBe(0);
    expect(await m.prisma.entry.count()).toBe(0);
    expect(await m.prisma.aiAnalysis.count()).toBe(0);
  });

  it("採用したタスクがあれば、来歴（原情報〜決定）を残して投稿だけを消す", async () => {
    const { memoId, s4 } = await analyzedPost();
    await m.suggestions.decideSuggestion(s4[0].id, {
      decision: "adopt",
      final: FINAL,
    });
    const task = await m.prisma.task.findFirstOrThrow({});

    await m.memos.deleteMemoPost(memoId);
    expect(await m.prisma.memo.count()).toBe(0);
    expect(await m.prisma.task.count()).toBe(1);
    expect(await provenance(task.id)).toEqual(["S5", "S4", "S2", "S1"]);
  });
});
