import { prisma } from "./client";

// 気になるメモ（Memo）とタグ（Tag）の CRUD。Entry（不変の原情報）と違い通常どおり編集できる。

export const TAG_MAX_LENGTH = 30;

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

export interface MemoParams {
  title: string;
  body: string | null;
  url: string | null;
  tagNames: string[];
}

export async function listMemos(tagName?: string) {
  return prisma.memo.findMany({
    where: tagName ? { tags: { some: { name: tagName } } } : undefined,
    include: { tags: { orderBy: { name: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });
}

export async function createMemo(params: MemoParams) {
  return prisma.memo.create({
    data: {
      title: params.title,
      body: params.body,
      url: params.url,
      tags: { connectOrCreate: connectTags(params.tagNames) },
    },
  });
}

export async function updateMemo(id: string, params: MemoParams) {
  return prisma.memo.update({
    where: { id },
    data: {
      title: params.title,
      body: params.body,
      url: params.url,
      // タグは「指定されたものだけ」に置き換える（外したタグは関連のみ解除し、タグ自体は残す）。
      tags: { set: [], connectOrCreate: connectTags(params.tagNames) },
    },
  });
}

export async function deleteMemo(id: string) {
  await prisma.memo.delete({ where: { id } });
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
