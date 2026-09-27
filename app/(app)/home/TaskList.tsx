"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { updateTaskStatusAction } from "./actions";
import type { TaskStatus } from "@/lib/domain/task";

export interface TaskView {
  id: string;
  title: string;
  status: string;
}

// 状態は中立的な表現にする（`11 §2`: 保留・未完了を失敗として扱わない）。
const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "未着手",
  doing: "進行中",
  hold: "保留",
  done: "完了",
};

const STATUS_OPTIONS: TaskStatus[] = ["todo", "doing", "hold", "done"];

function TaskRow({ task }: { task: TaskView }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleChange(nextStatus: string) {
    const formData = new FormData();
    formData.set("taskId", task.id);
    formData.set("status", nextStatus);
    startTransition(async () => {
      await updateTaskStatusAction({}, formData);
      // revalidatePath はサーバ側キャッシュを無効化するのみで、直接呼び出し（フォーム送信を
      // 介さない）の場合はクライアントの再描画を自動でトリガーしないため明示的に refresh する。
      router.refresh();
    });
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
      <span className="text-sm text-zinc-900 dark:text-zinc-50">
        {task.title}
      </span>
      <select
        value={task.status}
        disabled={pending}
        onChange={(event) => handleChange(event.target.value)}
        className="rounded-md border border-zinc-300 bg-transparent px-2 py-1 text-sm text-zinc-900 outline-none disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-50"
      >
        {STATUS_OPTIONS.map((status) => (
          <option key={status} value={status}>
            {STATUS_LABELS[status]}
          </option>
        ))}
      </select>
    </li>
  );
}

export function TaskList({ tasks }: { tasks: TaskView[] }) {
  if (tasks.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        まだタスクがありません。下から追加できます。
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} />
      ))}
    </ul>
  );
}
