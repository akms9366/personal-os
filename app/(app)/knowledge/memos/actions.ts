"use server";

import { revalidatePath } from "next/cache";
import {
  createMemoPost,
  deleteMemoPost,
  deleteTag,
  ensureMemoEntry,
  MemoValidationError,
  renameTag,
  updateMemoPost,
} from "@/lib/db/memos";
import { isAiConfigured } from "@/lib/ai/client";
import { runAnalysis, type AnalysisOutcome } from "@/lib/analysis/run";

export interface MemoActionState {
  success?: boolean;
  error?: string;
  /// 投稿・編集で保存したメモ。
  memoId?: string;
}

/// メモの投稿・編集（原文の保存）。AI 解析はここでは実行しない（別の失敗境界）。
/// AI が使える設定なら解析を予約し、タイムライン側が analyzeMemoAction で実行する。
export async function postMemoAction(
  _prevState: MemoActionState,
  formData: FormData,
): Promise<MemoActionState> {
  const input = {
    text: String(formData.get("text") ?? ""),
    extraTags: String(formData.get("tags") ?? ""),
    requestAnalysis: await isAiConfigured(),
  };
  const memoId = String(formData.get("memoId") ?? "");

  try {
    if (memoId) {
      await updateMemoPost(memoId, input);
      revalidatePath("/", "layout");
      return { success: true, memoId };
    }
    const result = await createMemoPost(input);
    revalidatePath("/", "layout");
    return { success: true, memoId: result.memoId };
  } catch (error) {
    if (error instanceof MemoValidationError) {
      return { error: error.message };
    }
    throw error;
  }
}

/// メモ（の原情報の現在版）を AI で解析する。予約済みの解析の実行と、失敗後の再解析を兼ねる。
/// 成功済み・実行中なら何もしない（重複した解釈を作らない）。失敗しても原文は変わらない。
export async function analyzeMemoAction(
  memoId: string,
): Promise<AnalysisOutcome> {
  if (!(await isAiConfigured())) {
    return {
      status: "failed",
      error: "AI の API キーが未設定です。Settings で設定してください。",
    };
  }
  try {
    const entryId = await ensureMemoEntry(memoId);
    return await runAnalysis(entryId);
  } catch (error) {
    if (error instanceof MemoValidationError) {
      return { status: "failed", error: error.message };
    }
    throw error;
  } finally {
    revalidatePath("/", "layout");
  }
}

export async function deleteMemoAction(memoId: string): Promise<void> {
  await deleteMemoPost(memoId);
  revalidatePath("/", "layout");
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
  revalidatePath("/", "layout");
  return { success: true };
}

export async function deleteTagAction(tagId: string): Promise<void> {
  await deleteTag(tagId);
  revalidatePath("/", "layout");
}
