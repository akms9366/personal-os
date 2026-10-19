// Entry ドメイン — 状態区別コアの不変条件ガード（純粋関数・DB 非依存）。
//
// 設計の核（P3 来歴 / 06 §7 所有原則 / State_Taxonomy §5, §6）:
//   - 原情報（S1）は不変。修正は in-place 更新ではなく新版（新レコード）生成。
//   - AI は原情報を書き換えない（origin=ai は S1 を生成・更新できない）。
//   - 派生（S2/S4/S5）は必ず親原情報を参照する（sourceEntryId 必須）。原情報は sourceEntryId=null。
//
// これらは SQLite/Prisma の制約では表現できないため、全書込み経路が通すガードとして実装する。

import {
  isDerivedState,
  isEntryKind,
  isEntryState,
  isOrigin,
  isOriginalState,
  type EntryState,
  type Origin,
} from "./entry";

/// ドメイン不変条件違反。
export class EntryInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EntryInvariantError";
  }
}

export interface EntryShape {
  kind: string;
  origin: string;
  state: string;
  sourceEntryId?: string | null;
}

/// 新規 Entry の値域・来歴・所有の不変条件を検証する。違反時は EntryInvariantError。
export function validateEntryInvariants(entry: EntryShape): void {
  if (!isEntryKind(entry.kind)) {
    throw new EntryInvariantError(`invalid kind: ${entry.kind}`);
  }
  if (!isOrigin(entry.origin)) {
    throw new EntryInvariantError(`invalid origin: ${entry.origin}`);
  }
  if (!isEntryState(entry.state)) {
    throw new EntryInvariantError(`invalid state: ${entry.state}`);
  }

  const origin: Origin = entry.origin;
  const state: EntryState = entry.state;
  const hasSource =
    entry.sourceEntryId !== null && entry.sourceEntryId !== undefined;

  // 来歴: 派生は親必須 / 原情報は親を持たない。
  if (isDerivedState(state) && !hasSource) {
    throw new EntryInvariantError(
      `derived entry (state=${state}) requires sourceEntryId`,
    );
  }
  if (isOriginalState(state) && hasSource) {
    throw new EntryInvariantError(
      `original entry (state=S1) must not have sourceEntryId`,
    );
  }

  // 所有: AI は原情報（S1）を生成できない。
  if (origin === "ai" && isOriginalState(state)) {
    throw new EntryInvariantError(
      `ai origin cannot author original (S1) entry`,
    );
  }

  // 所有: 決定（S5）は利用者のみ。AI・外部は決定を作れない（代行・推測確定の禁止, State_Taxonomy §3 S5）。
  if (state === "S5" && origin !== "human") {
    throw new EntryInvariantError(
      `decision (S5) can only be made by the user (origin=${origin})`,
    );
  }
  // 所有: 提案（S4）は AI/ルールが作る。利用者の手書きの記録は S1/S8 であって提案ではない。
  if (state === "S4" && origin !== "ai") {
    throw new EntryInvariantError(
      `suggestion (S4) must be generated (origin=ai), got origin=${origin}`,
    );
  }
}

/// 原情報（S1）の in-place 更新を禁止する（修正は新版生成）。違反時は EntryInvariantError。
export function assertOriginalImmutable(target: { state: string }): void {
  if (isEntryState(target.state) && isOriginalState(target.state)) {
    throw new EntryInvariantError(
      `original (S1) entry is immutable; create a new version instead`,
    );
  }
}

/// 完了条件の核: AI origin から原情報（S1）Entry を更新できないことを保証する。
/// actorOrigin=ai が対象 state=S1 を更新しようとした場合に EntryInvariantError。
export function assertAiCannotWriteOriginal(params: {
  actorOrigin: string;
  target: { state: string };
}): void {
  const { actorOrigin, target } = params;
  if (
    actorOrigin === "ai" &&
    isEntryState(target.state) &&
    isOriginalState(target.state)
  ) {
    throw new EntryInvariantError(`ai origin cannot write original (S1) entry`);
  }
}

/// 「修正は新版生成」（Issue #8）の対象は原情報（S1）のみに限定する。
/// 派生（S2/S4/S5）の再生成・決定変更は別概念（#20/#21）であり、ここでの revise 対象にしない。
export function assertRevisionTargetIsOriginal(target: {
  state: string;
}): void {
  if (!isEntryState(target.state) || !isOriginalState(target.state)) {
    throw new EntryInvariantError(
      `only an original (S1) entry can be revised as a new version`,
    );
  }
}

/// AI 解釈（S2, Issue #20）の対象にできるのは、本人または許可済み外部の原情報（S1）だけ。
/// 派生（S2 以降）や振り返り（S8）を解釈の元にしない。カレンダー由来の予定（kind=event）も対象外。
export function assertInterpretationSource(source: {
  state: string;
  kind: string;
}): void {
  if (source.state !== "S1") {
    throw new EntryInvariantError(
      `only an original (S1) entry can be interpreted (state=${source.state})`,
    );
  }
  if (source.kind === "event") {
    throw new EntryInvariantError(`calendar events are not interpreted`);
  }
}

/// 行動候補（S4, Issue #21）の元にできるのは、AI の解釈（S2, origin=ai）だけ。
export function assertSuggestionSource(source: {
  state: string;
  origin: string;
}): void {
  if (source.state !== "S2" || source.origin !== "ai") {
    throw new EntryInvariantError(
      `a suggestion (S4) must derive from an AI interpretation (S2), got state=${source.state} origin=${source.origin}`,
    );
  }
}

/// 決定（S5, Issue #21）の対象にできるのは、提案（S4）だけ。
export function assertDecisionTarget(target: { state: string }): void {
  if (target.state !== "S4") {
    throw new EntryInvariantError(
      `a decision (S5) must target a suggestion (S4), got state=${target.state}`,
    );
  }
}

/// 決定の「決め直し」（新しい版）の対象にできるのは、同じ提案への利用者の決定（S5）だけ。
/// 決定は版管理し、前の決定は書き換えない（可逆・履歴を残す, 06 §9）。
export function assertDecisionRevisionTarget(
  previous: { state: string; origin: string; sourceEntryId: string | null },
  suggestionId: string,
): void {
  if (
    previous.state !== "S5" ||
    previous.origin !== "human" ||
    previous.sourceEntryId !== suggestionId
  ) {
    throw new EntryInvariantError(
      `only the user's decision (S5) on the same suggestion can be revised`,
    );
  }
}

/// 派生（S2/S4/S5）の in-place 更新を禁止する。
/// 解釈・提案の再生成は新しいレコード、決定の変更は新しい版として残す。
export function assertDerivedImmutable(target: { state: string }): void {
  if (isEntryState(target.state) && isDerivedState(target.state)) {
    throw new EntryInvariantError(
      `derived entry (state=${target.state}) is immutable; create a new record or version instead`,
    );
  }
}
