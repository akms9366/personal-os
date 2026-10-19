import { describe, expect, it } from "vitest";
import { normalizeInterpretation } from "./interpretation";
import {
  buildDecision,
  canDecide,
  createsTask,
  decisionEntryId,
  DecisionValidationError,
  parseStoredDecision,
  parseStoredSuggestion,
  serializeDecision,
  serializeSuggestion,
  suggestionEntryId,
  suggestionsFromInterpretation,
  type SuggestionPayload,
} from "./suggestion";

const interpretation = normalizeInterpretation(
  {
    categories: ["task_candidate"],
    summary: "要約",
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
        nextAction: "目次だけ見る",
        confidence: "low",
      },
    ],
    events: [],
    knowledge: null,
    topics: [],
  },
  "明日までに田中さんに見積もりを送る。来週までに資料を確認する",
);

const [first, second] = suggestionsFromInterpretation(interpretation);

describe("suggestionsFromInterpretation", () => {
  it("タスク候補ごとに行動候補（S4）を作り、元の位置を持つ", () => {
    expect(suggestionsFromInterpretation(interpretation)).toHaveLength(2);
    expect(first).toMatchObject({
      kind: "task",
      index: 0,
      title: "見積もりを送る",
    });
    expect(second).toMatchObject({ index: 1, confidence: "low" });
  });

  it("タスク候補が無ければ作らない（無理に候補にしない）", () => {
    const none = normalizeInterpretation(
      {
        categories: ["note"],
        summary: "",
        uncertain: true,
        tasks: [],
        events: [],
        knowledge: null,
        topics: [],
      },
      "なんとなくのメモ",
    );
    expect(suggestionsFromInterpretation(none)).toEqual([]);
  });

  it("id は解釈と位置から決まる（重複作成を防ぐ）", () => {
    expect(suggestionEntryId("s2", 1)).toBe("sg-s2-1");
    expect(suggestionEntryId("s2", 1)).toBe(suggestionEntryId("s2", 1));
  });

  it("保存形式は往復でき、壊れた値は読み込まない", () => {
    expect(parseStoredSuggestion(serializeSuggestion(first))).toEqual(first);
    expect(parseStoredSuggestion("{broken")).toBeNull();
    expect(parseStoredSuggestion(JSON.stringify({ v: 9 }))).toBeNull();
  });
});

const final = {
  title: "見積もりを送る",
  dueDate: "2026-10-16",
  dueTime: "23:59",
  importance: 2,
  urgency: 2,
};

describe("buildDecision（利用者の入力 → 保存する決定）", () => {
  it("候補のまま採用すれば adopt、内容を変えれば modify（採用・修正の別は差分で決まる）", () => {
    expect(buildDecision({ decision: "adopt", final }, first).decision).toBe(
      "adopt",
    );
    expect(
      buildDecision(
        { decision: "adopt", final: { ...final, title: "見積書を送る" } },
        first,
      ).decision,
    ).toBe("modify");
    expect(
      buildDecision(
        { decision: "adopt", final: { ...final, dueDate: "2026-10-20" } },
        first,
      ).decision,
    ).toBe("modify");
    // 重要度・緊急度は AI が出さないので、変えても修正とはみなさない。
    expect(
      buildDecision(
        { decision: "adopt", final: { ...final, importance: 3 } },
        first,
      ).decision,
    ).toBe("adopt");
  });

  it("日付が未確定の候補に利用者が日付を選ぶと modify になる", () => {
    const decision = buildDecision(
      {
        decision: "adopt",
        final: { ...final, title: "資料を確認する", dueDate: "2026-10-23" },
      },
      second,
    );
    expect(decision.decision).toBe("modify");
    expect(createsTask(decision.decision)).toBe(true);
  });

  it("採用の最終値を検証する", () => {
    const bad = (overrides: object) => () =>
      buildDecision(
        { decision: "adopt", final: { ...final, ...overrides } },
        first,
      );
    expect(bad({ title: "  " })).toThrow(DecisionValidationError);
    expect(bad({ dueDate: "来週" })).toThrow(DecisionValidationError);
    expect(bad({ dueTime: "25:00" })).toThrow(DecisionValidationError);
    expect(bad({ importance: 9 })).toThrow(DecisionValidationError);
    expect(() => buildDecision({ decision: "adopt" }, first)).toThrow(
      DecisionValidationError,
    );
  });

  it("期限なしの採用は時刻を持たない", () => {
    const decision = buildDecision(
      { decision: "adopt", final: { ...final, dueDate: "", dueTime: "18:00" } },
      second,
    );
    expect(decision.final).toMatchObject({ dueDate: "", dueTime: "" });
  });

  it("却下・保留はタスクを作らず、採用と同じ形で記録する（却下理由は任意）", () => {
    const reject = buildDecision(
      { decision: "reject", reason: "not_now", note: " 来月 " },
      first,
    );
    expect(reject).toMatchObject({
      decision: "reject",
      reason: "not_now",
      note: "来月",
      final: null,
    });
    expect(createsTask(reject.decision)).toBe(false);

    const hold = buildDecision({ decision: "hold" }, first);
    expect(hold).toMatchObject({ decision: "hold", reason: null, final: null });
    expect(createsTask(hold.decision)).toBe(false);

    expect(buildDecision({ decision: "reject" }, first).reason).toBeNull();
    expect(() =>
      buildDecision({ decision: "reject", reason: "bogus" }, first),
    ).toThrow(DecisionValidationError);
  });

  it("不明な決定は拒否する", () => {
    expect(() => buildDecision({ decision: "approve" }, first)).toThrow(
      DecisionValidationError,
    );
  });

  it("決定は候補の写しと一緒に保存され、往復できる", () => {
    const decision = buildDecision(
      { decision: "adopt", final },
      first as SuggestionPayload,
    );
    expect(decision.candidate).toEqual(first);
    expect(parseStoredDecision(serializeDecision(decision))).toEqual(decision);
    expect(parseStoredDecision("{broken")).toBeNull();
  });
});

describe("canDecide（状態遷移）", () => {
  it("未決・保留・却下は、別の決定にできる（採用・却下・保留を等価に扱う）", () => {
    expect(canDecide("undecided", "adopt", false)).toBe(true);
    expect(canDecide("undecided", "reject", false)).toBe(true);
    expect(canDecide("undecided", "hold", false)).toBe(true);
    expect(canDecide("hold", "adopt", false)).toBe(true);
    expect(canDecide("hold", "reject", false)).toBe(true);
    expect(canDecide("reject", "adopt", false)).toBe(true);
    expect(canDecide("reject", "hold", false)).toBe(true);
  });

  it("同じ決定への変更は意味が無いので不可", () => {
    expect(canDecide("hold", "hold", false)).toBe(false);
    expect(canDecide("reject", "reject", false)).toBe(false);
  });

  it("Task を作った採用は決め直せない（タスク側で扱う）。タスクが無ければ決め直せる", () => {
    for (const adopted of ["adopt", "modify"] as const) {
      expect(canDecide(adopted, "reject", true)).toBe(false);
      expect(canDecide(adopted, "hold", true)).toBe(false);
      expect(canDecide(adopted, "adopt", true)).toBe(false);
      expect(canDecide(adopted, "reject", false)).toBe(true);
      expect(canDecide(adopted, "adopt", false)).toBe(true);
    }
  });
});

describe("decisionEntryId", () => {
  it("最初の決定は提案から、決め直しは直前の決定から決まる（同じ状態からの二重決定は同じ id になる）", () => {
    expect(decisionEntryId("sg-1", null)).toBe("dc-sg-1");
    expect(decisionEntryId("sg-1", "dc-sg-1")).toBe("dc-sg-1+");
    expect(decisionEntryId("sg-1", "dc-sg-1")).toBe(
      decisionEntryId("sg-1", "dc-sg-1"),
    );
  });
});
