"use server";

import { revalidatePath } from "next/cache";
import { createTask, deleteTask, updateTask } from "@/lib/db/tasks";
import { createEntry } from "@/lib/db/entries";
import { isTaskLevel, isTaskStatus, type TaskLevel } from "@/lib/domain/task";
import { parseJstDateTime } from "@/lib/time/jst";

export interface TaskActionState {
  success?: boolean;
  error?: string;
}

interface TaskFormValues {
  title: string;
  note: string | null;
  dueAt: Date | null;
  importance: TaskLevel;
  urgency: TaskLevel;
}

/// タスクフォーム（作成・編集共通）の値を読み取る。
/// 期限は日付＋時刻（23:59/18:00/12:00 またはその他の任意時刻）を JST として解釈する。
function readTaskForm(formData: FormData): TaskFormValues | { error: string } {
  const title = formData.get("title");
  if (typeof title !== "string" || title.trim().length === 0) {
    return { error: "タイトルを入力してください。" };
  }

  const importance = Number(formData.get("importance"));
  const urgency = Number(formData.get("urgency"));
  if (!isTaskLevel(importance) || !isTaskLevel(urgency)) {
    return { error: "重要度・緊急度を選んでください。" };
  }

  const dueDate = String(formData.get("dueDate") ?? "").trim();
  let dueTime = String(formData.get("dueTime") ?? "").trim();
  if (dueTime === "custom") {
    dueTime = String(formData.get("dueTimeCustom") ?? "").trim();
  }

  let dueAt: Date | null = null;
  if (dueDate.length > 0) {
    dueAt = parseJstDateTime(dueDate, dueTime || "23:59");
    if (!dueAt) {
      return { error: "期限の日時が正しくありません。" };
    }
  }

  const note = String(formData.get("note") ?? "").trim();

  return {
    title: title.trim(),
    note: note.length > 0 ? note : null,
    dueAt,
    importance,
    urgency,
  };
}

/// タスク作成 Server Action。重要度・緊急度・期限は利用者が選ぶ（自動確定しない）。
export async function createTaskAction(
  _prevState: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const values = readTaskForm(formData);
  if ("error" in values) {
    return values;
  }

  await createTask({ ...values, note: values.note ?? undefined });
  revalidatePath("/home");
  return { success: true };
}

/// タスク編集 Server Action（タイトル・期限日時・重要度・緊急度・メモ）。
export async function updateTaskAction(
  _prevState: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const taskId = formData.get("taskId");
  if (typeof taskId !== "string" || taskId.length === 0) {
    return { error: "対象が指定されていません。" };
  }

  const values = readTaskForm(formData);
  if ("error" in values) {
    return values;
  }

  await updateTask(taskId, values);
  revalidatePath("/home");
  return { success: true };
}

/// タスク削除 Server Action。確認ダイアログはクライアント側で挟む。
export async function deleteTaskAction(
  _prevState: TaskActionState,
  formData: FormData,
): Promise<TaskActionState> {
  const taskId = formData.get("taskId");
  if (typeof taskId !== "string" || taskId.length === 0) {
    return { error: "対象が指定されていません。" };
  }

  await deleteTask(taskId);
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
