"use server";

import { revalidatePath } from "next/cache";
import {
  createMemo,
  deleteMemo,
  deleteTag,
  normalizeTagNames,
  renameTag,
  updateMemo,
  type MemoParams,
} from "@/lib/db/memos";
import { parseMemoText } from "@/lib/domain/memo";

export interface MemoActionState {
  success?: boolean;
  error?: string;
}

const PATH = "/knowledge/memos";

function readMemoForm(formData: FormData): MemoParams | { error: string } {
  const parsed = parseMemoText(String(formData.get("text") ?? ""));
  if (!parsed) {
    return { error: "メモを入力してください。" };
  }
  // タグ = 本文中の #ハッシュタグ ＋ 本文に書かれていない既存タグ（編集時に保持するもの）。
  const extraTags = String(formData.get("tags") ?? "");
  return {
    title: parsed.title,
    body: parsed.body,
    url: parsed.url,
    tagNames: normalizeTagNames([...parsed.hashtags, extraTags].join("\n")),
  };
}

export async function postMemoAction(
  _prevState: MemoActionState,
  formData: FormData,
): Promise<MemoActionState> {
  const values = readMemoForm(formData);
  if ("error" in values) {
    return values;
  }

  const memoId = String(formData.get("memoId") ?? "");
  if (memoId) {
    await updateMemo(memoId, values);
  } else {
    await createMemo(values);
  }
  revalidatePath(PATH);
  return { success: true };
}

export async function deleteMemoAction(memoId: string): Promise<void> {
  await deleteMemo(memoId);
  revalidatePath(PATH);
}

export async function renameTagAction(
  _prevState: MemoActionState,
  formData: FormData,
): Promise<MemoActionState> {
  const tagId = String(formData.get("tagId") ?? "");
  const result = await renameTag(tagId, String(formData.get("name") ?? ""));
  if (!result.ok) {
    return { error: result.error };
  }
  revalidatePath(PATH);
  return { success: true };
}

export async function deleteTagAction(tagId: string): Promise<void> {
  await deleteTag(tagId);
  revalidatePath(PATH);
}
