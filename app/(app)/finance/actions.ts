"use server";

import { revalidatePath } from "next/cache";
import { describeAiError } from "@/lib/ai/client";
import { extractFinanceDrafts, type ExtractInput } from "@/lib/ai/finance";
import {
  createFinanceRecords,
  deleteFinanceRecord,
  FinanceValidationError,
  updateFinanceRecord,
} from "@/lib/db/finance";
import type { FinanceDraft } from "@/lib/domain/finance";
import { todayJst } from "@/lib/time/jst";

const PATH = "/finance";

export interface ExtractActionResult {
  drafts?: FinanceDraft[];
  note?: string;
  error?: string;
}

const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
type ImageType = (typeof IMAGE_TYPES)[number];

/// AI で下書きを作る（保存はしない）。
export async function extractFinanceAction(input: {
  text: string;
  image?: { mediaType: string; base64: string };
}): Promise<ExtractActionResult> {
  const text = input.text.trim();
  if (!text && !input.image) {
    return { error: "内容を入力するか、レシートの写真を選んでください。" };
  }

  let image: ExtractInput["image"];
  if (input.image) {
    if (!(IMAGE_TYPES as readonly string[]).includes(input.image.mediaType)) {
      return { error: "画像は JPEG / PNG / WebP / GIF に対応しています。" };
    }
    image = {
      mediaType: input.image.mediaType as ImageType,
      base64: input.image.base64,
    };
  }

  try {
    const result = await extractFinanceDrafts({
      text,
      image,
      today: todayJst(),
    });
    return { drafts: result.drafts, note: result.note };
  } catch (error) {
    console.error("extractFinanceAction failed", error);
    return { error: describeAiError(error) };
  }
}

export interface SaveActionResult {
  success?: boolean;
  error?: string;
}

/// 利用者が確認した下書きを保存する。
export async function saveFinanceDraftsAction(input: {
  drafts: FinanceDraft[];
  source: "ai" | "manual";
  sourceText: string | null;
}): Promise<SaveActionResult> {
  if (input.drafts.length === 0) {
    return { error: "保存する記録がありません。" };
  }
  try {
    await createFinanceRecords(
      input.drafts,
      input.source === "ai" ? "ai" : "manual",
      input.sourceText,
    );
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return { error: error.message };
    }
    throw error;
  }
  revalidatePath(PATH);
  return { success: true };
}

export async function updateFinanceRecordAction(
  id: string,
  draft: FinanceDraft,
): Promise<SaveActionResult> {
  try {
    await updateFinanceRecord(id, draft);
  } catch (error) {
    if (error instanceof FinanceValidationError) {
      return { error: error.message };
    }
    throw error;
  }
  revalidatePath(PATH);
  return { success: true };
}

export async function deleteFinanceRecordAction(id: string): Promise<void> {
  await deleteFinanceRecord(id);
  revalidatePath(PATH);
}
