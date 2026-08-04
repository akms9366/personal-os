import { describe, expect, it } from "vitest";
import {
  EntryInvariantError,
  assertAiCannotWriteOriginal,
  assertOriginalImmutable,
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
