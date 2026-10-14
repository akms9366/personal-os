import type { Prisma } from "@prisma/client";
import { prisma } from "./client";
import { createEntry, INTERPRETATION_SOURCE, reviseEntry } from "./entries";
import { SUGGESTION_SOURCE } from "../domain/suggestion";
import {
  composeMemoText,
  MEMO_TAG_MAX_LENGTH,
  parseMemoText,
} from "../domain/memo";

// メモ（タイムライン）とタグ（Tag）。
// Memo は表示・タグ付け用の可変な層。投稿の原文は原情報（S1 Entry）として別に保存し、
// Memo.entryId で現在版を指す（Issue #20）。AI の解釈（S2）はその原情報に紐づく。

/// タイムライン投稿から作る原情報（S1）の source。
export const TIMELINE_SOURCE = "timeline";

export const TAG_MAX_LENGTH = MEMO_TAG_MAX_LENGTH;

/// タグ入力（改行・カンマ・読点区切り、先頭 # は除去）を正規化し、重複を除く。
export function normalizeTagNames(raw: string): string[] {
  const names = raw
    .split(/[\n,、，]/)
    .map((name) => name.trim().replace(/^#+/, "").trim())
    .filter((name) => name.length > 0)
    .map((name) => name.slice(0, TAG_MAX_LENGTH));
  return Array.from(new Set(names));
}

function connectTags(names: string[]) {
  return names.map((name) => ({ where: { name }, create: { name } }));
}

/// 同じ本文の投稿をこの時間内に重ねて受けたら、二重送信とみなして既存の投稿を返す。
export const DUPLICATE_POST_WINDOW_MS = 10_000;

export class MemoValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MemoValidationError";
  }
}

export interface MemoPostInput {
  /// 投稿テキスト（1行目=title、2行目以降=body）。原文として S1 Entry に残す。
  text: string;
  /// 本文の #タグ 以外に保持するタグ（編集時に外さなかった既存タグ）。改行区切り。
  extraTags?: string;
  /// AI 解析を予約するか（API キー設定済みのときだけ true にする）。
  requestAnalysis: boolean;
}

function readPost(input: MemoPostInput) {
  const text = input.text.trim();
  const parsed = parseMemoText(text);
  if (!parsed) {
    throw new MemoValidationError("メモを入力してください。");
  }
  return {
    text,
    title: parsed.title,
    body: parsed.body,
    url: parsed.url,
    tagNames: normalizeTagNames(
      [...parsed.hashtags, input.extraTags ?? ""].join("\n"),
    ),
  };
}

const memoInclude = {
  tags: { orderBy: { name: "asc" } },
  entry: {
    include: {
      aiAnalysis: true,
      // 現在版の原情報に対する AI 解釈（S2）。版ごとに1件（lib/analysis/run.ts で保証）。
      derivedEntries: {
        where: { source: INTERPRETATION_SOURCE },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          // 行動候補（S4, Issue #21）と、それぞれへの利用者の決定（S5）・採用で作られた Task。
          derivedEntries: {
            where: { source: SUGGESTION_SOURCE },
            orderBy: { id: "asc" },
            include: {
              derivedEntries: {
                where: { state: "S5" },
                orderBy: { createdAt: "asc" },
                include: {
                  revisedBy: { select: { id: true } },
                  originatedTasks: {
                    select: { id: true, title: true, status: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.MemoInclude;

export type MemoWithAnalysis = Prisma.MemoGetPayload<{
  include: typeof memoInclude;
}>;

export async function listMemos(tagName?: string, take?: number) {
  return prisma.memo.findMany({
    take,
    where: tagName ? { tags: { some: { name: tagName } } } : undefined,
    include: memoInclude,
    // タイムライン表示のため投稿（作成）順。編集しても並びは動かさない。
    orderBy: { createdAt: "desc" },
  });
}

export async function countMemos() {
  return prisma.memo.count();
}

/// タイムラインへの投稿（Issue #20）。原文を原情報（S1 Entry, origin=human）として保存し、
/// 表示・タグ付け用の Memo を同じトランザクションで作る。AI 解析は予約（pending）だけで、
/// 実行は別の失敗境界（lib/analysis/run.ts）で行う。解析に失敗しても投稿は残る。
export async function createMemoPost(
  input: MemoPostInput,
  now: Date = new Date(),
): Promise<{ memoId: string; entryId: string; duplicate: boolean }> {
  const post = readPost(input);

  // 二重送信・連打: 直前に同じ本文の投稿があれば、それを返して新しく作らない。
  const recent = await prisma.memo.findFirst({
    where: {
      createdAt: { gte: new Date(now.getTime() - DUPLICATE_POST_WINDOW_MS) },
      entry: { body: post.text },
    },
    orderBy: { createdAt: "desc" },
  });
  if (recent?.entryId) {
    return { memoId: recent.id, entryId: recent.entryId, duplicate: true };
  }

  return prisma.$transaction(async (tx) => {
    const entry = await createEntry(
      { kind: "note", body: post.text, source: TIMELINE_SOURCE },
      tx,
    );
    const memo = await tx.memo.create({
      data: {
        // 二重送信の判定（上の recent）と同じ時計で作成時刻を付ける。
        createdAt: now,
        title: post.title,
        body: post.body,
        url: post.url,
        entryId: entry.id,
        tags: { connectOrCreate: connectTags(post.tagNames) },
      },
    });
    if (input.requestAnalysis) {
      await tx.aiAnalysis.create({ data: { sourceEntryId: entry.id } });
    }
    return { memoId: memo.id, entryId: entry.id, duplicate: false };
  });
}

/// 投稿の編集。原情報（S1）は書き換えず、本文が変わったときだけ新版（revisesEntryId）を作って
/// Memo の参照を付け替える（Issue #8 の「修正は新版」）。旧版とその AI 解釈は来歴として残る。
/// タグだけの変更なら新版は作らない。
export async function updateMemoPost(
  memoId: string,
  input: MemoPostInput,
): Promise<{ entryId: string; newVersion: boolean }> {
  const post = readPost(input);
  const memo = await prisma.memo.findUnique({
    where: { id: memoId },
    include: { entry: true },
  });
  if (!memo) {
    throw new MemoValidationError("メモが見つかりません。");
  }

  const unchanged =
    memo.entry !== null &&
    (post.text === memo.entry.body.trim() ||
      post.text === composeMemoText(memo));

  return prisma.$transaction(async (tx) => {
    let entryId = memo.entryId;
    let newVersion = false;
    if (!unchanged || !entryId) {
      const entry = entryId
        ? await reviseEntry({ entryId, body: post.text }, tx)
        : await createEntry(
            { kind: "note", body: post.text, source: TIMELINE_SOURCE },
            tx,
          );
      entryId = entry.id;
      newVersion = true;
      if (input.requestAnalysis) {
        await tx.aiAnalysis.create({ data: { sourceEntryId: entry.id } });
      }
    }
    await tx.memo.update({
      where: { id: memoId },
      data: {
        title: post.title,
        body: post.body,
        url: post.url,
        entryId,
        // タグは「指定されたものだけ」に置き換える（外したタグは関連のみ解除し、タグ自体は残す）。
        tags: { set: [], connectOrCreate: connectTags(post.tagNames) },
      },
    });
    return { entryId, newVersion };
  });
}

/// 原情報を持たない Memo（移行漏れ等）に S1 を補う。解析の直前に呼ぶ。
export async function ensureMemoEntry(memoId: string): Promise<string> {
  const memo = await prisma.memo.findUnique({ where: { id: memoId } });
  if (!memo) {
    throw new MemoValidationError("メモが見つかりません。");
  }
  if (memo.entryId) {
    return memo.entryId;
  }
  return prisma.$transaction(async (tx) => {
    const entry = await createEntry(
      { kind: "note", body: composeMemoText(memo), source: TIMELINE_SOURCE },
      tx,
    );
    await tx.memo.update({
      where: { id: memoId },
      data: { entryId: entry.id },
    });
    return entry.id;
  });
}

/// 投稿の削除。Memo と、その原情報の版の連鎖・そこから派生した全ての Entry（AI 解釈 S2・行動候補 S4・
/// 利用者の決定 S5）・解析記録を一緒に消す（元を消した後に派生を無検証で残さない。06 §8）。
/// ただし、その連鎖のどれかがタスクの起点（Task.originEntryId。採用した決定を含む）になっている場合は
/// 来歴を守るため Entry 側は残し、Memo だけを消す。
export async function deleteMemoPost(memoId: string): Promise<void> {
  const memo = await prisma.memo.findUnique({ where: { id: memoId } });
  if (!memo) {
    return;
  }

  // 現在版から revisesEntryId を辿って、全ての版（S1）を集める。
  const tree = new Set<string>();
  let cursor = memo.entryId;
  while (cursor && !tree.has(cursor)) {
    tree.add(cursor);
    const entry: { revisesEntryId: string | null } | null =
      await prisma.entry.findUnique({
        where: { id: cursor },
        select: { revisesEntryId: true },
      });
    cursor = entry?.revisesEntryId ?? null;
  }

  // そこから sourceEntryId で派生した Entry を、深さごとに全て集める。
  let frontier = [...tree];
  while (frontier.length > 0) {
    const children = await prisma.entry.findMany({
      where: { sourceEntryId: { in: frontier } },
      select: { id: true },
    });
    frontier = children.map((child) => child.id).filter((id) => !tree.has(id));
    frontier.forEach((id) => tree.add(id));
  }

  const ids = [...tree];
  const referencedByTask =
    ids.length > 0 &&
    (await prisma.task.count({ where: { originEntryId: { in: ids } } })) > 0;

  await prisma.$transaction(async (tx) => {
    await tx.memo.delete({ where: { id: memoId } });
    if (ids.length === 0 || referencedByTask) {
      return;
    }
    // 子（派生・新版）から順に消す。親を先に消すと参照の制約（Restrict）に当たる。
    const rows = await tx.entry.findMany({
      where: { id: { in: ids } },
      select: { id: true, sourceEntryId: true, revisesEntryId: true },
    });
    let remaining = rows;
    while (remaining.length > 0) {
      const referenced = new Set(
        remaining.flatMap((row) =>
          [row.sourceEntryId, row.revisesEntryId].filter(
            (id): id is string => id !== null,
          ),
        ),
      );
      const leaves = remaining.filter((row) => !referenced.has(row.id));
      if (leaves.length === 0) {
        throw new Error("entry reference cycle while deleting a memo");
      }
      await tx.entry.deleteMany({
        where: { id: { in: leaves.map((row) => row.id) } },
      });
      const gone = new Set(leaves.map((row) => row.id));
      remaining = remaining.filter((row) => !gone.has(row.id));
    }
  });
}

export async function listTagsWithCount() {
  return prisma.tag.findMany({
    include: { _count: { select: { memos: true } } },
    orderBy: { name: "asc" },
  });
}

export type RenameTagResult = { ok: true } | { ok: false; error: string };

/// タグ名の変更。変更先の名前が既にあれば、そのタグへ統合する。
export async function renameTag(
  id: string,
  rawName: string,
): Promise<RenameTagResult> {
  const [name] = normalizeTagNames(rawName);
  if (!name) {
    return { ok: false, error: "タグ名を入力してください。" };
  }

  const existing = await prisma.tag.findUnique({ where: { name } });
  if (existing && existing.id !== id) {
    await prisma.$transaction(async (tx) => {
      const memos = await tx.memo.findMany({
        where: { tags: { some: { id } } },
        select: { id: true },
      });
      for (const memo of memos) {
        await tx.memo.update({
          where: { id: memo.id },
          data: { tags: { connect: { id: existing.id } } },
        });
      }
      await tx.tag.delete({ where: { id } });
    });
    return { ok: true };
  }

  await prisma.tag.update({ where: { id }, data: { name } });
  return { ok: true };
}

/// タグの削除（メモ自体は残り、そのタグが外れるだけ）。
export async function deleteTag(id: string) {
  await prisma.tag.delete({ where: { id } });
}
