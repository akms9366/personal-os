// Entry ドメイン — 状態区別コアの型と語彙（SSOT）。
// 設計参照: docs/99_Reference/State_Taxonomy.md, docs/06_Data_Model.md §7,
//           docs/14_Implementation_Backlog.md §2（軽量フィールド方式）。

/// 起源（Origin / 06 §7 所有権）。
/// System（S6/S7 実行系）は Entry の対象外のため含めない。
export const ORIGINS = ["human", "ai", "external"] as const;
export type Origin = (typeof ORIGINS)[number];

/// 情報状態（State Taxonomy）の MVP 軽量サブセット。
/// S1=原情報 / S2=解釈 / S4=提案 / S5=決定 / S8=振り返り（Issue #17 で追加）。
export const STATES = ["S1", "S2", "S4", "S5", "S8"] as const;
export type EntryState = (typeof STATES)[number];

/// 「利用者本人の一次記録」として扱う状態（06 §2.2 / State_Taxonomy §2, §3）。
/// S1（原情報）・S8（振り返り）はいずれも本人の一次記録であり、AI/ルールの派生
/// （S2/S4/S5）と異なり sourceEntryId を持たない／要求しない。将来 S0（意図・制約）を
/// 追加する場合もここに加える。単一 state==="S1" 比較にしないのはこのため
/// （PR #4 レビュー IMPORTANT 指摘、Issue #17 着手にあたり解消）。
const ORIGINAL_STATES: readonly EntryState[] = ["S1", "S8"];

/// 種別（#2 で定義、#14 で "event" 追加）。許容値の SSOT をドメイン層に集約する。
export const KINDS = ["note", "journal", "bookmark", "event"] as const;
export type EntryKind = (typeof KINDS)[number];

/// 本人の一次記録（S1・S8）かどうか。それ以外（S2/S4/S5）は派生・決定。
export function isOriginalState(state: EntryState): boolean {
  return ORIGINAL_STATES.includes(state);
}

/// 派生（来歴参照が必須）か。原情報（S1）以外はすべて親 Entry を参照する。
export function isDerivedState(state: EntryState): boolean {
  return !isOriginalState(state);
}

export function isOrigin(value: string): value is Origin {
  return (ORIGINS as readonly string[]).includes(value);
}

export function isEntryState(value: string): value is EntryState {
  return (STATES as readonly string[]).includes(value);
}

export function isEntryKind(value: string): value is EntryKind {
  return (KINDS as readonly string[]).includes(value);
}
