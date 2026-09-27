"use server";

import { revalidatePath } from "next/cache";
import { createTask, updateTask } from "@/lib/db/tasks";
import { createEntry } from "@/lib/db/entries";
import { isTaskStatus } from "@/lib/domain/task";

export interface TaskActionState {
  success?: boolean;
  error?: string;
}

/// 今日のタスク作成 Server Action（Issue #11）。優先順位は自動確定しないため未設定のまま作る。
export async function createTaskAction(
  _prevState: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const title = formData.get("title");
  if (typeof title !== "string" || title.trim().length === 0) {
    return { error: "タイトルを入力してください。" };
  }

  await createTask({ title: title.trim() });
  revalidatePath("/home");
  return { success: true };
}

/// 状態遷移 Server Action（todo↔doing↔hold↔done）。順序を強制しない（`11 §2`）。
export async function updateTaskStatusAction(
  _prevState: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const taskId = formData.get("taskId");
  const status = formData.get("status");

  if (typeof taskId !== "string" || taskId.length === 0) {
    return { error: "対象が指定されていません。" };
  }
  if (typeof status !== "string" || !isTaskStatus(status)) {
    return { error: "不正な状態です。" };
  }

  await updateTask(taskId, { status });
  revalidatePath("/home");
  return { success: true };
}

/// 夜の振り返り保存 Server Action（Issue #17）。評価・スコアは求めず自由記述のみ。
/// Entry(kind=journal, state=S8) として保存する（保存は Journal 基盤を利用、Issue #9）。
export async function saveReflectionAction(
  _prevState: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const body = formData.get("body");
  if (typeof body !== "string" || body.trim().length === 0) {
    return { error: "内容を入力してください。" };
  }

  await createEntry({
    kind: "journal",
    body: body.trim(),
    source: "reflection",
    origin: "human",
    state: "S8",
  });

  revalidatePath("/home");
  return { success: true };
}
