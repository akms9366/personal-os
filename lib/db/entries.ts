import type { Prisma } from "@prisma/client";
import { prisma } from "./client";
import {
  assertInterpretationSource,
  assertRevisionTargetIsOriginal,
  validateEntryInvariants,
} from "../domain/guard";
import type { EntryKind, EntryState, Origin } from "../domain/entry";

// Entry（原情報）書込みラッパ。
// 設計参照: personal-os-design docs/14_Implementation_Backlog.md §7「書込み経路はドメインガード経由に統一」
//           （Issue #3 の Development_Log「今後への影響」で確立した規約）。
// prisma.entry.create を直接呼ぶ代わりに、必ずこの層を経由してドメイン不変条件を検証する。

/// 本人の一次記録（S1 原情報・S8 振り返り）の新規 Entry を作成する。
/// 派生（S2/S4/S5）の生成は別途ガード込みで扱う（#20/#21）。
/// db を渡すとそのトランザクション内で作成する（Issue #20: メモの投稿と同時に原情報を作る）。
export async function createEntry(
  params: {
    kind: EntryKind;
    body: string;
    source: string;
    origin?: Origin;
    state?: EntryState;
  },
  db: Prisma.TransactionClient = prisma,
) {
  const entry = {
    kind: params.kind,
    origin: params.origin ?? "human",
    state: params.state ?? "S1",
    sourceEntryId: null,
  };

  validateEntryInvariants(entry);

  return db.entry.create({
    data: {
      kind: entry.kind,
      body: params.body,
      source: params.source,
      origin: entry.origin,
      state: entry.state,
    },
  });
}

/// Inbox に表示する「現在版の原情報」のみを一覧取得する（Issue #8）。
/// state="S1" に限定する: Inbox は原情報の受信箱であり、AI 派生（S2 等）を原情報と
/// 同じ見た目で混在させない（P3 来歴 / 05 §3.1「原情報とAI要約を同じ見え方にしない」）。
/// kind="event" は除外する: Google Calendar 由来（Issue #14）は BrainDump/Quick Capture の
/// 受信箱と性質が異なり（利用者が明示的に残した断片ではない）、Home の「今日の予定」でのみ
/// read-only 表示する。Inbox に混在させると「編集（新版生成）」「削除」「タスク化」操作が
/// 外部由来データに対しても表示されてしまい、意味的に不適切（実機検証で発見・修正）。
/// revisedBy が空 = まだ誰にも新版で置き換えられていない Entry。旧版は自動的に一覧から外れる。
export async function listCurrentEntries() {
  return prisma.entry.findMany({
    where: { state: "S1", kind: { not: "event" }, revisedBy: { none: {} } },
    orderBy: { createdAt: "desc" },
  });
}

/// AI 解釈（S2）の Entry の source。タイムラインの解析結果であることを示す。
export const INTERPRETATION_SOURCE = "ai-interpretation";

/// AI 解釈（S2, Issue #20）を、元の原情報（S1）に紐づく派生 Entry として作成する。
/// origin=ai / state=S2 / sourceEntryId=原情報。原情報は読むだけで一切書き換えない。
/// body は検証済みの解釈（lib/domain/interpretation.ts で serialize した JSON）。
export async function createInterpretationEntry(
  db: Prisma.TransactionClient,
  params: { sourceEntryId: string; body: string },
) {
  const source = await db.entry.findUnique({
    where: { id: params.sourceEntryId },
  });
  if (!source) {
    throw new Error(`entry not found: ${params.sourceEntryId}`);
  }
  assertInterpretationSource(source);

  const entry = {
    kind: source.kind,
    origin: "ai",
    state: "S2",
    sourceEntryId: source.id,
  };
  validateEntryInvariants(entry);

  return db.entry.create({
    data: {
      kind: entry.kind,
      body: params.body,
      source: INTERPRETATION_SOURCE,
      origin: entry.origin,
      state: entry.state,
      sourceEntryId: entry.sourceEntryId,
    },
  });
}

/// 原情報（S1）の「修正」を新版として保存する（Issue #8）。旧版は一切書き換えない（06 §9 不変性）。
/// db を渡すとそのトランザクション内で作成する（Issue #20: メモの本文編集と同時に版を作る）。
export async function reviseEntry(
  params: { entryId: string; body: string },
  db: Prisma.TransactionClient = prisma,
) {
  const target = await db.entry.findUnique({ where: { id: params.entryId } });
  if (!target) {
    throw new Error(`entry not found: ${params.entryId}`);
  }

  assertRevisionTargetIsOriginal(target);

  const revision = {
    kind: target.kind,
    origin: target.origin,
    state: "S1",
    sourceEntryId: null,
  };
  validateEntryInvariants(revision);

  return db.entry.create({
    data: {
      kind: revision.kind,
      body: params.body,
      source: target.source,
      origin: revision.origin,
      state: revision.state,
      revisesEntryId: target.id,
    },
  });
}

export interface DeleteEntryResult {
  /// 削除がブロックされた理由（派生・改訂履歴が残っているため）。undefined なら削除成功。
  blocked?: string;
}

/// Entry を削除する（Issue #8、確認ダイアログを挟んだ上で呼ばれる前提）。
/// 派生（sourceEntryId）・改訂履歴（revisesEntryId）・起点参照（Task.originEntryId、Issue #10）の
/// いずれかを持つ場合は削除せず理由を返す（Provenance を来歴ごと消してしまうことを防ぐ。
/// PR #4 レビュー IMPORTANT 指摘への対応。Task の追加は Issue #10 でこのチェックへ反映した）。
export async function deleteEntry(entryId: string): Promise<DeleteEntryResult> {
  const [derivedCount, revisionCount, taskCount] = await Promise.all([
    prisma.entry.count({ where: { sourceEntryId: entryId } }),
    prisma.entry.count({ where: { revisesEntryId: entryId } }),
    prisma.task.count({ where: { originEntryId: entryId } }),
  ]);

  if (derivedCount > 0 || revisionCount > 0 || taskCount > 0) {
    return {
      blocked:
        "この記録には派生情報・改訂履歴・関連タスクがあるため削除できません。",
    };
  }

  await prisma.entry.delete({ where: { id: entryId } });
  return {};
}

/// 翌日への引継ぎ（Issue #18）で使う、直近の振り返り（S8）を取得する。
/// `beforeDate` より前に作成されたものに限定し、当日中に既に記録した振り返りを
/// 「前回の引継ぎ」として自分自身に表示してしまうことを避ける。
/// 記録の間隔（空白期間）は問わず、単に「直近の1件」を返す（`11 §3.2` 罰のない再開）。
export async function getLatestReflection(beforeDate: Date) {
  return prisma.entry.findFirst({
    where: { state: "S8", createdAt: { lt: beforeDate } },
    orderBy: { createdAt: "desc" },
  });
}
