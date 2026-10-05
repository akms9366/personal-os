"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import {
  deleteTaskAction,
  updateTaskAction,
  updateTaskStatusAction,
  type TaskActionState,
} from "./actions";
import { TaskFields } from "./TaskFields";
import type { TaskStatus } from "@/lib/domain/task";
import {
  dangerButtonClass,
  emptyClass,
  errorTextClass,
  listCardClass,
  listRowClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui/styles";

export interface TaskView {
  id: string;
  title: string;
  note: string | null;
  status: string;
  /// 表示用の期限ラベル（例: "10/4(日) 18:00"）。期限なしは null。
  dueLabel: string | null;
  dueDate: string;
  dueTime: string;
  overdue: boolean;
  importance: number | null;
  urgency: number | null;
}

// 状態は中立的な表現にする（`11 §2`: 保留・未完了を失敗として扱わない）。
const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "未着手",
  doing: "進行中",
  hold: "保留",
  done: "完了",
};

const STATUS_OPTIONS: TaskStatus[] = ["todo", "doing", "hold", "done"];

const LEVEL_BADGE: Record<number, string> = {
  3: "bg-ink text-paper",
  2: "bg-paper text-steel ring-1 ring-dove",
  1: "text-pewter ring-1 ring-dove",
};

function LevelBadge({ label, level }: { label: string; level: number | null }) {
  if (level == null) {
    return null;
  }
  return (
    <span
      className={`rounded-full px-2 py-0.5 font-mono text-[10px] leading-4 ${LEVEL_BADGE[level]}`}
    >
      {label}
      {level}
    </span>
  );
}

const initialState: TaskActionState = {};

function TaskEditForm({
  task,
  onDone,
}: {
  task: TaskView;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    async (prevState: TaskActionState, formData: FormData) => {
      const result = await updateTaskAction(prevState, formData);
      if (result.success) {
        onDone();
      }
      return result;
    },
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4 pt-4">
      <input type="hidden" name="taskId" value={task.id} />
      <TaskFields
        showNote
        defaults={{
          title: task.title,
          note: task.note ?? "",
          dueDate: task.dueDate,
          dueTime: task.dueTime,
          importance: task.importance ?? 2,
          urgency: task.urgency ?? 2,
        }}
      />
      <div className="flex items-center justify-end gap-2">
        {state.error ? <p className={errorTextClass}>{state.error}</p> : null}
        <button type="button" onClick={onDone} className={secondaryButtonClass}>
          キャンセル
        </button>
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? "保存中..." : "保存"}
        </button>
      </div>
    </form>
  );
}

function TaskRow({ task }: { task: TaskView }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);

  function run(action: typeof updateTaskStatusAction, formData: FormData) {
    startTransition(async () => {
      await action({}, formData);
      // revalidatePath はサーバ側キャッシュを無効化するのみで、直接呼び出し（フォーム送信を
      // 介さない）の場合はクライアントの再描画を自動でトリガーしないため明示的に refresh する。
      router.refresh();
    });
  }

  function handleStatusChange(nextStatus: string) {
    const formData = new FormData();
    formData.set("taskId", task.id);
    formData.set("status", nextStatus);
    run(updateTaskStatusAction, formData);
  }

  function handleDelete() {
    if (!window.confirm(`「${task.title}」を削除しますか？`)) {
      return;
    }
    const formData = new FormData();
    formData.set("taskId", task.id);
    run(deleteTaskAction, formData);
  }

  const done = task.status === "done";

  return (
    <li className={listRowClass}>
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => setEditing((value) => !value)}
          className="flex min-w-0 flex-1 flex-col items-start gap-1 text-left"
          aria-expanded={editing}
        >
          <span
            className={`text-sm ${done ? "text-pewter line-through" : "text-ink"}`}
          >
            {task.title}
          </span>
          <span className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-fog">
            {task.dueLabel ? (
              <span className={task.overdue && !done ? "text-danger" : ""}>
                {task.dueLabel}
              </span>
            ) : (
              <span>期限なし</span>
            )}
            <LevelBadge label="重要" level={task.importance} />
            <LevelBadge label="緊急" level={task.urgency} />
          </span>
        </button>
        <select
          value={task.status}
          disabled={pending}
          onChange={(event) => handleStatusChange(event.target.value)}
          aria-label="状態"
          className="shrink-0 cursor-pointer rounded-full bg-paper px-3 py-1 text-xs font-medium text-ink ring-1 ring-dove outline-none hover:ring-pewter disabled:opacity-60"
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>

      {editing ? (
        <>
          <TaskEditForm task={task} onDone={() => setEditing(false)} />
          <div className="flex justify-start pt-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className={dangerButtonClass}
            >
              削除
            </button>
          </div>
        </>
      ) : null}
    </li>
  );
}

export function TaskList({
  tasks,
  emptyText,
}: {
  tasks: TaskView[];
  emptyText: string;
}) {
  if (tasks.length === 0) {
    return <p className={emptyClass}>{emptyText}</p>;
  }

  return (
    <ul className={listCardClass}>
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} />
      ))}
    </ul>
  );
}
