// 行動候補（S4 Suggestion）と決定（S5 Decision）の語彙・検証・遷移規則（Issue #21）。
// 純粋関数・DB 非依存。
//
// 設計の核（State_Taxonomy §3 S4/S5, 11 §7, 06 §7）:
//   - 提案（S4）は AI/ルールが作り、利用者は編集しない。判断は S5 として別に記録する。
//   - 決定（S5）は利用者のみ。採用・修正・却下・保留を等価に記録し、不利益を与えない。
//   - 採用（修正を含む）のときだけ Task を作る。AI は決定を代行・推測確定しない。
//   - 来歴: 原情報(S1) → 解釈(S2) → 提案(S4) → 決定(S5) → Task を辿れる。
//   - 決定は可逆: 変更は新しい版として残す（履歴を消さない）。ただし Task が作られた採用は、
//     以後は Task 側で扱う（Task が削除されていれば決め直せる）。

import { z } from "zod";
import { isDateString, isTimeString } from "../time/jst";
import {
  CONFIDENCES,
  type Interpretation,
  type TaskCandidate,
  type When,
} from "./interpretation";
import { isTaskLevel } from "./task";

// ---- 提案（S4） ----

/// 提案 Entry の source。タイムラインの AI 解釈から作った行動候補であることを示す。
export const SUGGESTION_SOURCE = "ai-suggestion";
/// 決定 Entry の source。
export const DECISION_SOURCE = "user-decision";

export const SUGGESTION_VERSION = 1;

const WhenSchema = z
  .object({
    text: z.string(),
    date: z.string().nullable(),
    time: z.string().nullable(),
  })
  .strict();

/// S4 Entry の body に JSON で保存する行動候補。S2 の候補を写し、元の位置（index）を持つ。
export const SuggestionPayloadSchema = z
  .object({
    v: z.literal(SUGGESTION_VERSION),
    kind: z.literal("task"),
    /// 元の解釈（S2）の tasks 配列での位置。
    index: z.number().int().min(0),
    title: z.string().min(1),
    due: WhenSchema.nullable(),
    people: z.array(z.string()),
    nextAction: z.string().nullable(),
    confidence: z.enum(CONFIDENCES),
  })
  .strict();
export type SuggestionPayload = z.infer<typeof SuggestionPayloadSchema>;

/// S4 の id は解釈（S2）と候補の位置から決まる。同じ解釈から重複して作れない
/// （再解析・同時実行でも主キー制約で1件に収まる）。
export function suggestionEntryId(
  interpretationEntryId: string,
  index: number,
): string {
  return `sg-${interpretationEntryId}-${index}`;
}

/// 解釈（S2）のタスク候補から行動候補（S4）の中身を作る。候補が無ければ空。
export function suggestionsFromInterpretation(
  interpretation: Interpretation,
): SuggestionPayload[] {
  return interpretation.tasks.map((task: TaskCandidate, index) => ({
    v: SUGGESTION_VERSION,
    kind: "task" as const,
    index,
    title: task.title,
    due: task.due,
    people: task.people,
    nextAction: task.nextAction,
    confidence: task.confidence,
  }));
}

export function serializeSuggestion(payload: SuggestionPayload): string {
  return JSON.stringify(SuggestionPayloadSchema.parse(payload));
}

export function parseStoredSuggestion(body: string): SuggestionPayload | null {
  try {
    const result = SuggestionPayloadSchema.safeParse(JSON.parse(body));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

// ---- 決定（S5） ----

export const DECISIONS = ["adopt", "modify", "reject", "hold"] as const;
export type Decision = (typeof DECISIONS)[number];

export const DECISION_LABELS: Record<Decision, string> = {
  adopt: "採用",
  modify: "修正して採用",
  reject: "却下",
  hold: "保留",
};

export function isDecision(value: string): value is Decision {
  return (DECISIONS as readonly string[]).includes(value);
}

/// Task を作る決定（採用・修正して採用）。
export function createsTask(decision: Decision): boolean {
  return decision === "adopt" || decision === "modify";
}

/// 却下の理由（任意）。誤った提案の訂正が来歴に残る（11 §9）。
export const REJECT_REASONS = [
  "not_needed",
  "already_done",
  "wrong_content",
  "not_now",
  "other",
] as const;
export type RejectReason = (typeof REJECT_REASONS)[number];

export const REJECT_REASON_LABELS: Record<RejectReason, string> = {
  not_needed: "必要ない",
  already_done: "もう対応した",
  wrong_content: "内容が違う",
  not_now: "今はやらない",
  other: "その他",
};

/// 採用時に Task へ渡す最終値（利用者が確認・修正したもの）。
const FinalSchema = z
  .object({
    title: z.string().min(1),
    /// "YYYY-MM-DD"（JST）。空文字=期限なし。
    dueDate: z.string(),
    dueTime: z.string(),
    importance: z.number().int().nullable(),
    urgency: z.number().int().nullable(),
  })
  .strict();
export type FinalTask = z.infer<typeof FinalSchema>;

export const DECISION_VERSION = 1;

/// S5 Entry の body に JSON で保存する決定。
export const DecisionPayloadSchema = z
  .object({
    v: z.literal(DECISION_VERSION),
    decision: z.enum(DECISIONS),
    reason: z.enum(REJECT_REASONS).nullable(),
    /// 理由の補足（自由記述・任意）。
    note: z.string(),
    /// 採用時の最終値（却下・保留では null）。
    final: FinalSchema.nullable(),
    /// 提案時点の候補（修正の前後を比べられるよう、決定の時点で写しを残す）。
    candidate: SuggestionPayloadSchema,
  })
  .strict();
export type DecisionPayload = z.infer<typeof DecisionPayloadSchema>;

export class DecisionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DecisionValidationError";
  }
}

const TITLE_MAX = 80;
const NOTE_MAX = 200;

export interface DecisionInput {
  decision: string;
  reason?: string | null;
  note?: string | null;
  final?: {
    title: string;
    dueDate: string;
    dueTime: string;
    importance: number | null;
    urgency: number | null;
  } | null;
}

/// 利用者の入力を検証し、保存する決定にする。不正な入力は DecisionValidationError。
/// 採用・修正の別は、候補から最終値が変わったかで決める（利用者に区別を求めない）。
export function buildDecision(
  input: DecisionInput,
  candidate: SuggestionPayload,
): DecisionPayload {
  if (!isDecision(input.decision)) {
    throw new DecisionValidationError(`invalid decision: ${input.decision}`);
  }
  // 画面は "adopt" と "reject" と "hold" を送る。"modify" は最終値の差から決まる。
  const requested = input.decision === "modify" ? "adopt" : input.decision;

  const note = (input.note ?? "").trim().slice(0, NOTE_MAX);

  if (requested === "reject" || requested === "hold") {
    const reason =
      requested === "reject" && input.reason
        ? (REJECT_REASONS as readonly string[]).includes(input.reason)
          ? (input.reason as RejectReason)
          : null
        : null;
    if (requested === "reject" && input.reason && !reason) {
      throw new DecisionValidationError(`invalid reason: ${input.reason}`);
    }
    return {
      v: DECISION_VERSION,
      decision: requested,
      reason,
      note,
      final: null,
      candidate,
    };
  }

  const finalInput = input.final;
  if (!finalInput) {
    throw new DecisionValidationError("採用にはタスクの内容が必要です。");
  }
  const title = finalInput.title.trim();
  if (title.length === 0) {
    throw new DecisionValidationError("タスク名を入力してください。");
  }
  const dueDate = finalInput.dueDate.trim();
  if (dueDate !== "" && !isDateString(dueDate)) {
    throw new DecisionValidationError("期限日が正しくありません。");
  }
  const dueTime = finalInput.dueTime.trim();
  if (dueDate !== "" && !isTimeString(dueTime)) {
    throw new DecisionValidationError("期限の時刻が正しくありません。");
  }
  for (const [name, level] of [
    ["重要度", finalInput.importance],
    ["緊急度", finalInput.urgency],
  ] as const) {
    if (level !== null && !isTaskLevel(level)) {
      throw new DecisionValidationError(`${name}が正しくありません。`);
    }
  }

  const final: FinalTask = {
    title: title.slice(0, TITLE_MAX),
    dueDate,
    dueTime: dueDate === "" ? "" : dueTime,
    importance: finalInput.importance,
    urgency: finalInput.urgency,
  };
  const modified = isModified(candidate, final);
  return {
    v: DECISION_VERSION,
    decision: modified ? "modify" : "adopt",
    reason: null,
    note,
    final,
    candidate,
  };
}

/// 利用者が候補から変えたか。候補の期限日（確定していれば）・タイトルとの違いで判定する
/// （重要度・緊急度は AI が出さないため、変更とみなさない）。
export function isModified(
  candidate: SuggestionPayload,
  final: FinalTask,
): boolean {
  const candidateDate: string = candidate.due?.date ?? "";
  return final.title !== candidate.title || final.dueDate !== candidateDate;
}

export function serializeDecision(payload: DecisionPayload): string {
  return JSON.stringify(DecisionPayloadSchema.parse(payload));
}

export function parseStoredDecision(body: string): DecisionPayload | null {
  try {
    const result = DecisionPayloadSchema.safeParse(JSON.parse(body));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

/// S5 の id。最初の決定は S4 から、決め直しは直前の決定から決まる。
/// 同じ状態から同時に2回決めようとしても主キー制約で片方だけが成功する（二重採用・二重 Task 化の防止）。
export function decisionEntryId(
  suggestionEntryId: string,
  previousDecisionId: string | null,
): string {
  return previousDecisionId
    ? `${previousDecisionId}+`
    : `dc-${suggestionEntryId}`;
}

// ---- 遷移規則 ----

/// 提案の現在の決定状態（最新の決定。無ければ undecided）。
export type DecisionState = "undecided" | Decision;

/// 決め直しが許されるか。
///   - 未決・保留・却下 → どの決定にもできる（同じ決定への変更は意味が無いので不可）。
///   - 採用（Task 作成済み）→ 決め直せない（Task 側で編集・削除する）。ただし Task が削除済みなら決め直せる。
export function canDecide(
  current: DecisionState,
  next: Decision,
  taskExists: boolean,
): boolean {
  if (current === "adopt" || current === "modify") {
    return !taskExists;
  }
  if (current === "undecided") {
    return true;
  }
  const target = next === "modify" ? "adopt" : next;
  return current !== target;
}

/// When の表示用の短い文（候補の期限表示で再利用）。
export function dueHint(due: When | null): string | null {
  if (!due) {
    return null;
  }
  if (due.date) {
    return null;
  }
  return due.text || null;
}
