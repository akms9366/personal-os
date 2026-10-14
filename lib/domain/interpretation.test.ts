import { describe, expect, it } from "vitest";
import {
  canStartAnalysis,
  describeWhen,
  InterpretationValidationError,
  normalizeInterpretation,
  parseStoredInterpretation,
  serializeInterpretation,
  type RawInterpretation,
} from "./interpretation";

function raw(overrides: Partial<RawInterpretation> = {}): RawInterpretation {
  return {
    categories: ["note"],
    summary: "要約",
    uncertain: false,
    tasks: [],
    events: [],
    knowledge: null,
    topics: [],
    ...overrides,
  };
}

describe("normalizeInterpretation", () => {
  it("accepts a valid response and keeps the categories in canonical order", () => {
    const result = normalizeInterpretation(
      raw({
        categories: ["reflection", "TASK_CANDIDATE"],
        tasks: [
          {
            title: "見積もりを送る",
            due: { text: "明日の18時", date: "2026-10-16", time: "18:00" },
            people: ["田中さん"],
            nextAction: "資料を確認",
            confidence: "high",
          },
        ],
      }),
      "明日の18時までに田中さんに見積もりを送る",
    );
    expect(result.categories).toEqual(["task_candidate", "reflection"]);
    expect(result.tasks[0].due).toEqual({
      text: "明日の18時",
      date: "2026-10-16",
      time: "18:00",
    });
  });

  it("rejects responses that do not match the schema", () => {
    expect(() => normalizeInterpretation({ foo: 1 }, "x")).toThrow(
      InterpretationValidationError,
    );
    expect(() => normalizeInterpretation("not json", "x")).toThrow(
      InterpretationValidationError,
    );
    expect(() =>
      normalizeInterpretation({ ...raw(), tasks: "none" }, "x"),
    ).toThrow(InterpretationValidationError);
  });

  it("does not assert dates or times that are not in the source", () => {
    const result = normalizeInterpretation(
      raw({
        categories: ["task_candidate"],
        tasks: [
          {
            title: "確認する",
            // 曖昧な期限に日付を付けてきた・不正な日付
            due: { text: "来週まで", date: "来週", time: "09:00" },
            people: [],
            nextAction: null,
            confidence: "maybe",
          },
        ],
      }),
      "来週までに確認する",
    );
    // 日付は不正なので捨て、原文に時刻の手がかりが無いので時刻も捨てる。表現は残す。
    expect(result.tasks[0].due).toEqual({
      text: "来週まで",
      date: null,
      time: null,
    });
    expect(result.tasks[0].confidence).toBe("low");
    expect(describeWhen(result.tasks[0].due)).toBe("来週まで（日付未確定）");
  });

  it("drops categories that have no supporting candidates and falls back to note", () => {
    const result = normalizeInterpretation(
      raw({ categories: ["task_candidate", "event_candidate", "unknown"] }),
      "なんとなく考えていること",
    );
    expect(result.categories).toEqual(["note"]);
    expect(result.tasks).toEqual([]);
  });

  it("adds a category when a candidate was extracted and cleans topics", () => {
    const result = normalizeInterpretation(
      raw({
        categories: ["note"],
        knowledge: { title: "Rust の所有権", summary: "借用規則のまとめ" },
        topics: ["#Rust", "Rust", " ", "プログラミング"],
      }),
      "Rust の所有権について学んだ",
    );
    expect(result.categories).toEqual(["note", "knowledge_candidate"]);
    expect(result.topics).toEqual(["Rust", "プログラミング"]);
  });
});

describe("stored interpretation", () => {
  it("round-trips through serialize/parse", () => {
    const interpretation = normalizeInterpretation(raw(), "メモ");
    expect(
      parseStoredInterpretation(serializeInterpretation(interpretation)),
    ).toEqual(interpretation);
  });

  it("returns null for corrupted or unknown-version payloads", () => {
    expect(parseStoredInterpretation("{broken")).toBeNull();
    expect(
      parseStoredInterpretation(
        JSON.stringify({ v: 99, categories: ["note"] }),
      ),
    ).toBeNull();
  });
});

describe("canStartAnalysis", () => {
  const now = new Date("2026-10-15T12:00:00Z");
  it("allows a first run, pending and failed runs", () => {
    expect(canStartAnalysis(null, now)).toBe(true);
    expect(canStartAnalysis({ status: "pending", startedAt: null }, now)).toBe(
      true,
    );
    expect(canStartAnalysis({ status: "failed", startedAt: now }, now)).toBe(
      true,
    );
  });

  it("does not re-run a succeeded version or a fresh running one", () => {
    expect(canStartAnalysis({ status: "succeeded", startedAt: now }, now)).toBe(
      false,
    );
    expect(
      canStartAnalysis(
        { status: "running", startedAt: new Date(now.getTime() - 10_000) },
        now,
      ),
    ).toBe(false);
  });

  it("allows taking over a stale running analysis", () => {
    expect(
      canStartAnalysis(
        { status: "running", startedAt: new Date(now.getTime() - 5 * 60_000) },
        now,
      ),
    ).toBe(true);
  });
});
