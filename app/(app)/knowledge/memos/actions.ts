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

export interface MemoActionState {
  success?: boolean;
  error?: string;
}

const PATH = "/knowledge/memos";

function readMemoForm(formData: FormData): MemoParams | { error: string } {
  const title = String(formData.get("title") ?? "").trim();
  if (title.length === 0) {
    return { error: "タイトルを入力してください。" };
  }
  const body = String(formData.get("body") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  if (url.length > 0 && !/^https?:\/\//i.test(url)) {
    return { error: "URL は http(s):// から入力してください。" };
  }
  return {
    title,
    body: body || null,
    url: url || null,
    tagNames: normalizeTagNames(String(formData.get("tags") ?? "")),
  };
}

export async function saveMemoAction(
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
