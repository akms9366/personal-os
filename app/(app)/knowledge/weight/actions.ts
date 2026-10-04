"use server";

import { revalidatePath } from "next/cache";
import { deleteWeight, upsertWeight } from "@/lib/db/weight";
import { isDateString } from "@/lib/time/jst";

export interface WeightActionState {
  success?: boolean;
  error?: string;
}

const PATH = "/knowledge/weight";

export async function saveWeightAction(
  _prevState: WeightActionState,
  formData: FormData,
): Promise<WeightActionState> {
  const date = String(formData.get("date") ?? "");
  if (!isDateString(date)) {
    return { error: "日付を入力してください。" };
  }
  const weightKg = Number(formData.get("weightKg"));
  if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg >= 500) {
    return { error: "体重を正しく入力してください。" };
  }
  const bodyFatRaw = String(formData.get("bodyFatPct") ?? "").trim();
  const bodyFatPct = bodyFatRaw ? Number(bodyFatRaw) : null;
  if (
    bodyFatPct !== null &&
    (!Number.isFinite(bodyFatPct) || bodyFatPct < 0 || bodyFatPct > 100)
  ) {
    return { error: "体脂肪率を正しく入力してください。" };
  }
  const note = String(formData.get("note") ?? "").trim();

  await upsertWeight({
    date,
    weightKg: Math.round(weightKg * 100) / 100,
    bodyFatPct: bodyFatPct === null ? null : Math.round(bodyFatPct * 10) / 10,
    note: note || null,
  });
  revalidatePath(PATH);
  return { success: true };
}

export async function deleteWeightAction(id: string): Promise<void> {
  await deleteWeight(id);
  revalidatePath(PATH);
}
