import { describe, expect, it } from "vitest";
import {
  EntryInvariantError,
  assertAiCannotWriteOriginal,
  assertDecisionRevisionTarget,
  assertDecisionTarget,
  assertDerivedImmutable,
  assertInterpretationSource,
  assertSuggestionSource,
  assertOriginalImmutable,
  assertRevisionTargetIsOriginal,
  validateEntryInvariants,
  type EntryShape,
} from "./guard";

const original: EntryShape = {
  kind: "note",
  origin: "human",
  state: "S1",
  sourceEntryId: null,
};

const derived: EntryShape = {
  kind: "note",
  origin: "ai",
  state: "S2",
  sourceEntryId: "entry_parent_id",
};

describe("assertAiCannotWriteOriginal（完了条件の核）", () => {
  it("AI origin は原情報(S1)を更新できない", () => {
    expect(() =>
      assertAiCannotWriteOriginal({
        actorOrigin: "ai",
        target: { state: "S1" },
      }),
    ).toThrow(EntryInvariantError);
  });

  it("human origin は原情報(S1)を扱える（ガードは通過）", () => {
    expect(() =>
      assertAiCannotWriteOriginal({
        actorOrigin: "human",
        target: { state: "S1" },
      }),
    ).not.toThrow();
  });

  it("AI origin でも派生(S2)は対象外（通過）", () => {
    expect(() =>
      assertAiCannotWriteOriginal({
        actorOrigin: "ai",
        target: { state: "S2" },
      }),
    ).not.toThrow();
  });
});

describe("validateEntryInvariants — 来歴（sourceEntryId）", () => {
  it("派生(S2)は sourceEntryId 必須。無ければ throw", () => {
    expect(() =>
      validateEntryInvariants({ ...derived, sourceEntryId: null }),
    ).toThrow(EntryInvariantError);
  });

  it("派生(S2)に親があれば通過", () => {
    expect(() => validateEntryInvariants(derived)).not.toThrow();
  });

  it("原情報(S1)は sourceEntryId を持てない。あれば throw", () => {
    expect(() =>
      validateEntryInvariants({ ...original, sourceEntryId: "x" }),
    ).toThrow(EntryInvariantError);
  });

  it("原情報(S1)で親が null なら通過", () => {
    expect(() => validateEntryInvariants(original)).not.toThrow();
  });
});

describe("validateEntryInvariants — 所有と値域", () => {
  it("AI origin は原情報(S1)を生成できない", () => {
    expect(() =>
      validateEntryInvariants({ ...original, origin: "ai" }),
    ).toThrow(EntryInvariantError);
  });

  it("不正な origin は throw", () => {
    expect(() =>
      validateEntryInvariants({ ...original, origin: "robot" }),
    ).toThrow(EntryInvariantError);
  });

  it("不正な state は throw", () => {
    expect(() => validateEntryInvariants({ ...original, state: "S9" })).toThrow(
      EntryInvariantError,
    );
  });

  it("不正な kind は throw", () => {
    expect(() =>
      validateEntryInvariants({ ...original, kind: "video" }),
    ).toThrow(EntryInvariantError);
  });
});

describe("assertOriginalImmutable — 原情報の不変性", () => {
  it("原情報(S1)の in-place 更新は禁止（throw）", () => {
    expect(() => assertOriginalImmutable({ state: "S1" })).toThrow(
      EntryInvariantError,
    );
  });

  it("派生(S2)は更新可能（通過）", () => {
    expect(() => assertOriginalImmutable({ state: "S2" })).not.toThrow();
  });
});

describe("assertRevisionTargetIsOriginal — 新版生成の対象制限（Issue #8）", () => {
  it("原情報(S1)は revise 対象にできる（通過）", () => {
    expect(() => assertRevisionTargetIsOriginal({ state: "S1" })).not.toThrow();
  });

  it("派生(S2)は revise 対象にできない（throw）", () => {
    expect(() => assertRevisionTargetIsOriginal({ state: "S2" })).toThrow(
      EntryInvariantError,
    );
  });

  it("不正な state は throw", () => {
    expect(() => assertRevisionTargetIsOriginal({ state: "S9" })).toThrow(
      EntryInvariantError,
    );
  });
});

describe("S8（振り返り）— S1 と同じ「本人の一次記録」として扱われること（Issue #17）", () => {
  const reflection: EntryShape = {
    kind: "journal",
    origin: "human",
    state: "S8",
    sourceEntryId: null,
  };

  it("振り返り(S8)は sourceEntryId が null なら通過", () => {
    expect(() => validateEntryInvariants(reflection)).not.toThrow();
  });

  it("振り返り(S8)は sourceEntryId を持てない。あれば throw", () => {
    expect(() =>
      validateEntryInvariants({ ...reflection, sourceEntryId: "x" }),
    ).toThrow(EntryInvariantError);
  });

  it("AI origin は振り返り(S8)を生成できない", () => {
    expect(() =>
      validateEntryInvariants({ ...reflection, origin: "ai" }),
    ).toThrow(EntryInvariantError);
  });

  it("AI origin は振り返り(S8)を更新できない（assertAiCannotWriteOriginal）", () => {
    expect(() =>
      assertAiCannotWriteOriginal({
        actorOrigin: "ai",
        target: { state: "S8" },
      }),
    ).toThrow(EntryInvariantError);
  });

  it("振り返り(S8)の in-place 更新は禁止（assertOriginalImmutable）", () => {
    expect(() => assertOriginalImmutable({ state: "S8" })).toThrow(
      EntryInvariantError,
    );
  });

  it("振り返り(S8)は revise 対象にできる（assertRevisionTargetIsOriginal）", () => {
    expect(() => assertRevisionTargetIsOriginal({ state: "S8" })).not.toThrow();
  });
});

describe("assertInterpretationSource（Issue #20）", () => {
  it("原情報（S1）だけを AI 解釈の対象にする", () => {
    expect(() =>
      assertInterpretationSource({ state: "S1", kind: "note" }),
    ).not.toThrow();
    for (const state of ["S2", "S4", "S5", "S8"]) {
      expect(() => assertInterpretationSource({ state, kind: "note" })).toThrow(
        EntryInvariantError,
      );
    }
  });

  it("カレンダー由来の予定は解釈しない", () => {
    expect(() =>
      assertInterpretationSource({ state: "S1", kind: "event" }),
    ).toThrow(EntryInvariantError);
  });

  it("AI の解釈は派生（S2）として親を必須にし、AI は原情報を作れない", () => {
    expect(() =>
      validateEntryInvariants({ kind: "note", origin: "ai", state: "S2" }),
    ).toThrow(EntryInvariantError);
    expect(() =>
      validateEntryInvariants({
        kind: "note",
        origin: "ai",
        state: "S2",
        sourceEntryId: "e1",
      }),
    ).not.toThrow();
    expect(() =>
      validateEntryInvariants({ kind: "note", origin: "ai", state: "S1" }),
    ).toThrow(EntryInvariantError);
  });
});

describe("S4 提案・S5 決定のガード（Issue #21）", () => {
  it("決定（S5）は利用者のみ。AI・外部は作れない", () => {
    const decision = { kind: "note", state: "S5", sourceEntryId: "s4" };
    expect(() =>
      validateEntryInvariants({ ...decision, origin: "human" }),
    ).not.toThrow();
    expect(() =>
      validateEntryInvariants({ ...decision, origin: "ai" }),
    ).toThrow(EntryInvariantError);
    expect(() =>
      validateEntryInvariants({ ...decision, origin: "external" }),
    ).toThrow(EntryInvariantError);
  });

  it("提案（S4）は生成物（origin=ai）。利用者の手書きの提案は作れず、親も必須", () => {
    const suggestion = { kind: "note", state: "S4", sourceEntryId: "s2" };
    expect(() =>
      validateEntryInvariants({ ...suggestion, origin: "ai" }),
    ).not.toThrow();
    expect(() =>
      validateEntryInvariants({ ...suggestion, origin: "human" }),
    ).toThrow(EntryInvariantError);
    expect(() =>
      validateEntryInvariants({
        ...suggestion,
        origin: "ai",
        sourceEntryId: null,
      }),
    ).toThrow(EntryInvariantError);
  });

  it("提案の元は AI の解釈（S2）だけ", () => {
    expect(() =>
      assertSuggestionSource({ state: "S2", origin: "ai" }),
    ).not.toThrow();
    for (const state of ["S1", "S4", "S5", "S8"]) {
      expect(() => assertSuggestionSource({ state, origin: "ai" })).toThrow(
        EntryInvariantError,
      );
    }
    expect(() =>
      assertSuggestionSource({ state: "S2", origin: "human" }),
    ).toThrow(EntryInvariantError);
  });

  it("決定の対象は提案（S4）だけ", () => {
    expect(() => assertDecisionTarget({ state: "S4" })).not.toThrow();
    for (const state of ["S1", "S2", "S5"]) {
      expect(() => assertDecisionTarget({ state })).toThrow(
        EntryInvariantError,
      );
    }
  });

  it("決め直しの対象は、同じ提案への利用者の決定（S5）だけ", () => {
    const previous = { state: "S5", origin: "human", sourceEntryId: "s4" };
    expect(() => assertDecisionRevisionTarget(previous, "s4")).not.toThrow();
    expect(() => assertDecisionRevisionTarget(previous, "other")).toThrow(
      EntryInvariantError,
    );
    expect(() =>
      assertDecisionRevisionTarget({ ...previous, origin: "ai" }, "s4"),
    ).toThrow(EntryInvariantError);
    expect(() =>
      assertDecisionRevisionTarget({ ...previous, state: "S4" }, "s4"),
    ).toThrow(EntryInvariantError);
  });

  it("派生（S2/S4/S5）は in-place 更新できない", () => {
    for (const state of ["S2", "S4", "S5"]) {
      expect(() => assertDerivedImmutable({ state })).toThrow(
        EntryInvariantError,
      );
    }
    expect(() => assertDerivedImmutable({ state: "S1" })).not.toThrow();
  });
});
