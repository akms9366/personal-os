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
