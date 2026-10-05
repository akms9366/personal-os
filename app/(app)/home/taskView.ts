import type { Task } from "@prisma/client";
import {
  formatDateTimeLabel,
  toJstDateString,
  toJstTimeString,
} from "@/lib/time/jst";
import type { TaskView } from "./TaskList";

/// DB の Task → 一覧表示用の値（Home と完了一覧で共通）。
export function toTaskView(task: Task, now: Date): TaskView {
  return {
    id: task.id,
    title: task.title,
    note: task.note,
    status: task.status,
    dueLabel: task.dueAt ? formatDateTimeLabel(task.dueAt) : null,
    dueDate: task.dueAt ? toJstDateString(task.dueAt) : "",
    dueTime: task.dueAt ? toJstTimeString(task.dueAt) : "23:59",
    overdue: task.dueAt ? task.dueAt.getTime() < now.getTime() : false,
    importance: task.importance,
    urgency: task.urgency,
  };
}
