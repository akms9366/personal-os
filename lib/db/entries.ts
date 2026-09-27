import { prisma } from "./client";
import { validateEntryInvariants } from "@/lib/domain/guard";
import type { EntryKind, Origin } from "@/lib/domain/entry";

// Entry（原情報）書込みラッパ。
// 設計参照: personal-os-design docs/14_Implementation_Backlog.md §7「書込み経路はドメインガード経由に統一」
//           （Issue #3 の Development_Log「今後への影響」で確立した規約）。
// prisma.entry.create を直接呼ぶ代わりに、必ずこの層を経由してドメイン不変条件を検証する。

/// 原情報（S1）の新規 Entry を作成する。派生（S2/S4/S5）の生成は別途ガード込みで扱う（#20/#21）。
export async function createEntry(params: {
  kind: EntryKind;
  body: string;
  source: string;
  origin?: Origin;
}) {
  const entry = {
    kind: params.kind,
    origin: params.origin ?? "human",
    state: "S1",
    sourceEntryId: null,
  };

  validateEntryInvariants(entry);

  return prisma.entry.create({
    data: {
      kind: entry.kind,
      body: params.body,
      source: params.source,
      origin: entry.origin,
      state: entry.state,
    },
  });
}
