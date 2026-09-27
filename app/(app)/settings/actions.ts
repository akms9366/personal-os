"use server";

import { revalidatePath } from "next/cache";
import {
  connectCalendar,
  disconnectCalendar,
  updateAiSettings,
} from "@/lib/settings/store";

export interface AiSettingsState {
  success?: boolean;
  error?: string;
}

export interface CalendarConnectionState {
  success?: boolean;
  error?: string;
}

/// AI & Automation フォームの保存 Server Action。
export async function saveAiSettings(
  _prevState: AiSettingsState,
  formData: FormData,
): Promise<AiSettingsState> {
  const model = formData.get("model");
  const apiKey = formData.get("apiKey");

  if (typeof model !== "string" || model.trim().length === 0) {
    return { error: "モデル名を入力してください。" };
  }

  await updateAiSettings({
    model: model.trim(),
    apiKey: typeof apiKey === "string" ? apiKey : undefined,
  });

  revalidatePath("/settings");
  return { success: true };
}

/// Google Calendar（ICS）接続 Server Action（Issue #13）。
export async function connectCalendarAction(
  _prevState: CalendarConnectionState,
  formData: FormData,
): Promise<CalendarConnectionState> {
  const icsUrl = formData.get("icsUrl");
  if (typeof icsUrl !== "string" || icsUrl.trim().length === 0) {
    return { error: "ICS秘密URLを入力してください。" };
  }

  const result = await connectCalendar(icsUrl.trim());
  if (!result.ok) {
    return { error: result.error ?? "接続に失敗しました。" };
  }

  revalidatePath("/settings");
  return { success: true };
}

/// 切断 Server Action（Issue #13 完了条件）。
export async function disconnectCalendarAction(
  _prevState: CalendarConnectionState,
  _formData: FormData,
): Promise<CalendarConnectionState> {
  await disconnectCalendar();
  revalidatePath("/settings");
  return { success: true };
}
