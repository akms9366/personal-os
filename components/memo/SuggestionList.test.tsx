// UI テスト: 行動候補（S4）の表示と決定の操作を、サーバ描画で確かめる（Issue #21）。
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MemoAnalysisPanel } from "./MemoAnalysisPanel";
import { SuggestionList } from "./SuggestionList";
import type { MemoAnalysisView, SuggestionView } from "./memoView";
import { normalizeInterpretation } from "@/lib/domain/interpretation";

function suggestion(
  decision: SuggestionView["decision"],
  overrides: Partial<SuggestionView> = {},
): SuggestionView {
  return {
    id: "sg-1",
    title: "見積もりを送る",
    defaults: {
      title: "見積もりを送る",
      dueDate: "2026-10-16",
      dueTime: "23:59",
    },
    dueHint: null,
    people: ["田中さん"],
    nextAction: null,
    confidence: "high",
    decision,
    ...overrides,
  };
}

function render(suggestions: SuggestionView[], withActions = true) {
  return renderToStaticMarkup(
    <SuggestionList
      suggestions={suggestions}
      onDecide={withActions ? async () => ({ ok: true }) : undefined}
    />,
  );
}

describe("SuggestionList", () => {
  it("未決の候補は『候補』（破線）で、採用・保留・却下の操作を出す。確定とは見せない", () => {
    const html = render([suggestion({ state: "undecided" })]);
    expect(html).toContain("候補");
    expect(html).toContain("border-dashed");
    expect(html).toContain("あなたが決めるまで確定しません");
    expect(html).toContain("タスクにする");
    expect(html).toContain("保留");
    expect(html).toContain("却下");
    expect(html).not.toContain("タスクにしました");
    expect(html).toContain('data-suggestion-state="undecided"');
  });

  it("日付が未確定の期限は、日付を断定せず原文の表現を出す", () => {
    const html = render([
      suggestion(
        { state: "undecided" },
        {
          dueHint: "来週まで",
          defaults: { title: "資料を確認する", dueDate: "", dueTime: "23:59" },
        },
      ),
    ]);
    expect(html).toContain("来週まで（日付未確定）");
  });

  it("採用したものは『採用』（実線）で、作られたタスクへのリンクを出し、決め直しの操作は出さない", () => {
    const html = render([
      suggestion({
        state: "adopt",
        label: "採用",
        decidedLabel: "10/15(木) 12:00",
        task: { id: "t1", title: "見積もりを送る", status: "todo" },
      }),
    ]);
    expect(html).toContain("タスクにしました");
    expect(html).toContain('href="/home"');
    expect(html).toContain("bg-ink");
    expect(html).not.toContain("border-dashed");
    expect(html).not.toMatch(/<button[^>]*>保留<\/button>/);
    expect(html).not.toMatch(/<button[^>]*>却下<\/button>/);
    expect(html).toContain('data-suggestion-state="adopt"');
  });

  it("修正して採用も採用として扱い、タスクが削除されていればその旨を示して決め直せる", () => {
    const modified = render([
      suggestion({
        state: "modify",
        label: "修正して採用",
        decidedLabel: "10/15(木) 12:00",
        task: { id: "t1", title: "見積書を送る", status: "todo" },
      }),
    ]);
    expect(modified).toContain("修正して採用");
    expect(modified).toContain("タスクにしました");

    const deleted = render([
      suggestion({
        state: "adopt",
        label: "採用",
        decidedLabel: "10/15(木) 12:00",
        task: null,
      }),
    ]);
    expect(deleted).toContain("タスクは削除されています");
    expect(deleted).toContain("タスクにする");
  });

  it("却下・保留は採用と同じ重さで表示し、却下の理由を出す。別の決定へ決め直せる", () => {
    const rejected = render([
      suggestion({
        state: "reject",
        label: "却下",
        reasonLabel: "今はやらない",
        note: "",
        decidedLabel: "10/15(木) 12:00",
      }),
    ]);
    expect(rejected).toContain("却下しました（今はやらない）");
    expect(rejected).toContain("タスクにする");
    expect(rejected).toMatch(/<button[^>]*>保留<\/button>/);
    // 却下済みへの『却下』ボタンは出さない（状態ラベルの「却下」は出る）。
    expect(rejected).not.toMatch(/<button[^>]*>却下<\/button>/);

    const held = render([
      suggestion({
        state: "hold",
        label: "保留",
        reasonLabel: null,
        note: "",
        decidedLabel: "10/15(木) 12:00",
      }),
    ]);
    expect(held).toContain("保留中です");
    expect(held).toContain("タスクにする");
    expect(held).toMatch(/<button[^>]*>却下<\/button>/);
    expect(held).not.toMatch(/<button[^>]*>保留<\/button>/);
  });

  it("決定の操作を渡さなければ、表示のみ（ボタンを出さない）", () => {
    const html = render([suggestion({ state: "undecided" })], false);
    expect(html).not.toContain("タスクにする");
    expect(html).toContain("見積もりを送る");
  });

  it("候補が無ければ何も出さない", () => {
    expect(render([])).toBe("");
  });
});

describe("MemoAnalysisPanel × 行動候補", () => {
  const interpretation = normalizeInterpretation(
    {
      categories: ["task_candidate"],
      summary: "見積もりを送る",
      uncertain: false,
      tasks: [
        {
          title: "見積もりを送る",
          due: { text: "明日", date: "2026-10-16", time: null },
          people: [],
          nextAction: null,
          confidence: "high",
        },
      ],
      events: [],
      knowledge: null,
      topics: [],
    },
    "明日見積もりを送る",
  );

  const view = (suggestions: SuggestionView[]): MemoAnalysisView => ({
    state: "succeeded",
    interpretation,
    generatedLabel: "10/15(木) 12:00",
    model: "m",
    suggestions,
  });

  it("行動候補があるときは、タスク候補を詳細に重ねて出さない", () => {
    const html = renderToStaticMarkup(
      <MemoAnalysisPanel
        view={view([suggestion({ state: "undecided" })])}
        analyzing={false}
      />,
    );
    expect(html).toContain("行動候補");
    expect(html.match(/見積もりを送る/g)?.length).toBe(2); // 要約と候補1件
    expect(html).not.toContain("タスク候補</span> 見積もりを送る");
  });

  it("行動候補が無い旧データでは、従来どおり詳細にタスク候補を出す", () => {
    const html = renderToStaticMarkup(
      <MemoAnalysisPanel view={view([])} analyzing={false} />,
    );
    expect(html).not.toContain("行動候補");
    expect(html).toContain("タスク候補");
  });
});
