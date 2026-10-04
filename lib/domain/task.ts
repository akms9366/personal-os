// Task ドメイン — 行動（Task）の値域（SSOT）。
// 設計参照: personal-os-design docs/06_Data_Model.md §3.3（系統B, State Taxonomy S4→S5→S6→S7 相当）,
//           docs/14_Implementation_Backlog.md §6 F3.1（Task モデルと CRUD）。
//
// Task は Entry（原情報 S1）と異なり不変ではない。利用者が選んだ行動として、
// status/priority は通常の CRUD で更新されてよい（`11 §2`: 保留・未完了は失敗ではない）。

/// 状態遷移: todo↔doing↔done↔hold。優先順位を自動確定しないため遷移順序は強制しない。
export const TASK_STATUSES = ["todo", "doing", "done", "hold"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

/// 優先度は利用者が任意で設定する（未設定=null を許容し、システムが自動確定しない）。
export const TASK_PRIORITIES = ["low", "medium", "high"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export function isTaskStatus(value: string): value is TaskStatus {
  return (TASK_STATUSES as readonly string[]).includes(value);
}

export function isTaskPriority(value: string): value is TaskPriority {
  return (TASK_PRIORITIES as readonly string[]).includes(value);
}

// ---- 重要度 × 緊急度マトリクス ----
// 重要度・緊急度ともに 3 段階（1=低 / 2=中 / 3=高）。利用者が選ぶ（自動確定しない）。

export const TASK_LEVELS = [1, 2, 3] as const;
export type TaskLevel = (typeof TASK_LEVELS)[number];

export const TASK_LEVEL_LABELS: Record<TaskLevel, string> = {
  1: "低",
  2: "中",
  3: "高",
};

export function isTaskLevel(value: unknown): value is TaskLevel {
  return value === 1 || value === 2 || value === 3;
}

/// 期限時刻の選択肢（先頭が既定）。これ以外の時刻も「その他」で入力できる。
export const DUE_TIME_PRESETS = ["23:59", "18:00", "12:00"] as const;

export interface OrganizableTask {
  status: string;
  dueAt: Date | null;
  importance: number | null;
  urgency: number | null;
  createdAt: Date;
}

export interface OrganizedTasks<T> {
  /// 緊急度 2・3（と未設定）の未完了タスク。期限の早い順（期限なしは末尾）。
  timeline: T[];
  /// 緊急度 1 の未完了タスク。重要度の高い順。
  lowUrgency: T[];
  /// 完了タスク。
  done: T[];
}

function compareDue(a: OrganizableTask, b: OrganizableTask): number {
  if (a.dueAt && b.dueAt) {
    return a.dueAt.getTime() - b.dueAt.getTime();
  }
  if (a.dueAt) {
    return -1;
  }
  if (b.dueAt) {
    return 1;
  }
  return 0;
}

function compareImportanceDesc(a: OrganizableTask, b: OrganizableTask): number {
  return (b.importance ?? 0) - (a.importance ?? 0);
}

function compareCreated(a: OrganizableTask, b: OrganizableTask): number {
  return a.createdAt.getTime() - b.createdAt.getTime();
}

/// Home のタスク表示順を決める。
///   - 時間順リスト: 期限 → 重要度（高い順）→ 作成順
///   - 緊急度1 の別枠: 重要度（高い順）→ 期限 → 作成順
export function organizeTasks<T extends OrganizableTask>(
  tasks: T[],
): OrganizedTasks<T> {
  const active = tasks.filter((task) => task.status !== "done");

  const timeline = active
    .filter((task) => task.urgency !== 1)
    .sort(
      (a, b) =>
        compareDue(a, b) || compareImportanceDesc(a, b) || compareCreated(a, b),
    );

  const lowUrgency = active
    .filter((task) => task.urgency === 1)
    .sort(
      (a, b) =>
        compareImportanceDesc(a, b) || compareDue(a, b) || compareCreated(a, b),
    );

  const done = tasks
    .filter((task) => task.status === "done")
    .sort((a, b) => compareDue(b, a) || compareCreated(b, a));

  return { timeline, lowUrgency, done };
}
