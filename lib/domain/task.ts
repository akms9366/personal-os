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
