// UI テスト: 投稿の表示部分をサーバ描画し、原文・AI 解析の状態・候補と確定情報の区別を確かめる。
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  normalizeInterpretation,
  serializeInterpretation,
} from "@/lib/domain/interpretation";
import { MemoPostBody } from "./MemoPostBody";
import {
  toAnalysisView,
  type MemoAnalysisView,
  type MemoPostView,
} from "./memoView";

const NOW = new Date("2026-10-15T03:00:00Z");

function post(
  analysis: MemoAnalysisView,
  overrides: Partial<MemoPostView> = {},
): MemoPostView {
  return {
    id: "m1",
    text: "明日までに田中さんに見積もりを送る #仕事",
    tags: ["仕事", "あとで"],
    timeLabel: "たった今",
    timeTitle: "10/15(木) 12:00",
    edited: false,
    entryId: "e1",
    analysis,
    ...overrides,
  };
}

function render(memo: MemoPostView, analyzing = false, canAnalyze = true) {
  return renderToStaticMarkup(
    <MemoPostBody
      memo={memo}
      analyzing={analyzing}
      onAnalyze={canAnalyze ? () => {} : undefined}
    />,
  );
}

const interpretation = normalizeInterpretation(
  {
    categories: ["task_candidate"],
    summary: "田中さんに見積もりを送る",
    uncertain: false,
    tasks: [
      {
        title: "見積もりを送る",
        due: { text: "明日まで", date: "2026-10-16", time: null },
        people: ["田中さん"],
        nextAction: null,
        confidence: "high",
      },
    ],
    events: [],
    knowledge: null,
    topics: ["見積もり"],
  },
  "明日までに田中さんに見積もりを送る",
);

describe("MemoPostBody", () => {
  it("原文を表示する（未解析・AI 未設定でも）", () => {
    const html = render(post({ state: "none" }), false, false);
    expect(html).toContain("明日までに田中さんに見積もりを送る");
    expect(html).not.toContain("未解析");
  });

  it("AI が使えるなら未解析の投稿に解析ボタンを出す", () => {
    expect(render(post({ state: "none" }))).toContain("AI で解析");
  });

  it("解析中の状態を表示する", () => {
    expect(render(post({ state: "running" }))).toContain("解析中");
    expect(render(post({ state: "pending" }), true)).toContain("解析中");
    expect(render(post({ state: "pending" }))).toContain("解析待ち");
  });

  it("解析に失敗しても原文は表示され続け、理由と再解析を示す", () => {
    const html = render(
      post({ state: "failed", error: "AI に接続できませんでした。" }),
    );
    expect(html).toContain("明日までに田中さんに見積もりを送る");
    expect(html).toContain("解析に失敗しました");
    expect(html).toContain("AI に接続できませんでした。");
    expect(html).toContain("再解析");
  });

  it("解析結果を元の投稿に紐づけて表示し、AI の候補であることを示す", () => {
    const html = render(
      post({
        state: "succeeded",
        interpretation,
        generatedLabel: "10/15(木) 12:00",
        model: "claude-sonnet-5",
        suggestions: [],
      }),
    );
    // 原文 → AI 解釈の順で、同じ投稿の中に出る。
    expect(html.indexOf("data-memo-text")).toBeLessThan(
      html.indexOf("data-ai-interpretation"),
    );
    expect(html).toContain("AI 解釈");
    expect(html).toContain("タスク候補");
    expect(html).toContain("未確定の候補");
    expect(html).toContain("田中さんに見積もりを送る");
    expect(html).toContain("原文は変更していません");
  });

  it("AI のタグ候補（破線）と確定したタグ（実線のリンク）を区別する", () => {
    const html = render(
      post({
        state: "succeeded",
        interpretation,
        generatedLabel: "10/15(木) 12:00",
        model: null,
        suggestions: [],
      }),
    );
    // 確定タグ「あとで」は本文に無いのでタグのリンクとして出る。
    expect(html).toMatch(/href="\/knowledge\/memos\?tag=[^"]+"[^>]*>#あとで/);
    // AI の候補「見積もり」はリンクではなく破線のピル。
    expect(html).not.toContain("tag=%E8%A6%8B%E7%A9%8D%E3%82%82%E3%82%8A");
    expect(html).toMatch(/border-dashed[^>]*>#見積もり/);
  });

  it("壊れた解析結果は読み込めない旨を出し、原文は残す", () => {
    const html = render(
      post({
        state: "succeeded",
        interpretation: null,
        generatedLabel: "",
        model: null,
        suggestions: [],
      }),
    );
    expect(html).toContain("解析結果を読み込めませんでした");
    expect(html).toContain("明日までに田中さんに見積もりを送る");
  });
});

describe("toAnalysisView", () => {
  const base = { error: null, model: "m", startedAt: NOW };

  it("解釈があれば解析済み", () => {
    const view = toAnalysisView(
      {
        aiAnalysis: { ...base, status: "succeeded" },
        derivedEntries: [
          { body: serializeInterpretation(interpretation), createdAt: NOW },
        ],
      },
      NOW,
    );
    expect(view.state).toBe("succeeded");
    expect(view.state === "succeeded" && view.interpretation?.summary).toBe(
      "田中さんに見積もりを送る",
    );
  });

  it("解析記録の状態をそのまま映し、止まった解析は失敗として扱う", () => {
    const entry = (status: string, startedAt: Date | null = NOW) => ({
      aiAnalysis: { ...base, status, startedAt },
      derivedEntries: [],
    });
    expect(toAnalysisView(null, NOW)).toEqual({ state: "none" });
    expect(
      toAnalysisView({ aiAnalysis: null, derivedEntries: [] }, NOW),
    ).toEqual({
      state: "none",
    });
    expect(toAnalysisView(entry("pending"), NOW)).toEqual({ state: "pending" });
    expect(toAnalysisView(entry("running"), NOW)).toEqual({ state: "running" });
    expect(
      toAnalysisView(
        entry("running", new Date(NOW.getTime() - 10 * 60_000)),
        NOW,
      ).state,
    ).toBe("failed");
    expect(toAnalysisView(entry("failed"), NOW)).toEqual({
      state: "failed",
      error: "AI 解析に失敗しました。",
    });
  });
});
