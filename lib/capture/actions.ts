"use server";

import { revalidatePath } from "next/cache";
import { createEntry } from "@/lib/db/entries";

export interface QuickCaptureState {
  success?: boolean;
  error?: string;
}

/// Quick Capture 保存 Server Action。分類を強制せず、常に Entry(kind=note, origin=human) を生成する。
export async function saveQuickCapture(
  _prevState: QuickCaptureState,
  formData: FormData,
): Promise<QuickCaptureState> {
  const body = formData.get("body");

  if (typeof body !== "string" || body.trim().length === 0) {
    return { error: "内容を入力してください。" };
  }

  await createEntry({
    kind: "note",
    body: body.trim(),
    source: "quick-capture",
    origin: "human",
  });

  // Inbox（/knowledge）に保存直後の記録を反映する。
  revalidatePath("/knowledge");
  return { success: true };
}
