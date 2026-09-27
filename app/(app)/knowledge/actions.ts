"use server";

import { revalidatePath } from "next/cache";
import { createEntry, deleteEntry, reviseEntry } from "@/lib/db/entries";

export interface InboxActionState {
  success?: boolean;
  error?: string;
}

/// Journal 作成 Server Action（Issue #9）。常に Entry(kind=journal, origin=human) を生成する。
/// 時点（createdAt）は Entry モデルの既定（不変・作成時刻）でそのまま保持される。
export async function saveJournalEntry(
  _prevState: InboxActionState,
  formData: FormData,
): Promise<InboxActionState> {
  const body = formData.get("body");
  if (typeof body !== "string" || body.trim().length === 0) {
    return { error: "内容を入力してください。" };
  }

  await createEntry({
    kind: "journal",
    body: body.trim(),
    source: "journal",
    origin: "human",
  });

  revalidatePath("/knowledge");
  return { success: true };
}

/// Inbox の「編集」= 新版として保存する Server Action（原情報は不変、Issue #8）。
export async function reviseInboxEntry(
  _prevState: InboxActionState,
  formData: FormData,
): Promise<InboxActionState> {
  const entryId = formData.get("entryId");
  const body = formData.get("body");

  if (typeof entryId !== "string" || entryId.length === 0) {
    return { error: "対象が指定されていません。" };
  }
  if (typeof body !== "string" || body.trim().length === 0) {
    return { error: "内容を入力してください。" };
  }

  await reviseEntry({ entryId, body: body.trim() });
  revalidatePath("/knowledge");
  return { success: true };
}

/// Inbox の「削除」Server Action。確認ダイアログはクライアント側（window.confirm）で挟む。
export async function deleteInboxEntry(
  _prevState: InboxActionState,
  formData: FormData,
): Promise<InboxActionState> {
  const entryId = formData.get("entryId");
  if (typeof entryId !== "string" || entryId.length === 0) {
    return { error: "対象が指定されていません。" };
  }

  const result = await deleteEntry(entryId);
  if (result.blocked) {
    return { error: result.blocked };
  }

  revalidatePath("/knowledge");
  return { success: true };
}
