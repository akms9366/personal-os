"use server";

import { revalidatePath } from "next/cache";
import { updateAiSettings } from "@/lib/settings/store";

export interface AiSettingsState {
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
