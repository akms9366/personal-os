"use client";

import { useActionState, useState } from "react";
import { createTaskAction, type TaskActionState } from "./actions";
import { TaskFields } from "./TaskFields";
import { primaryButtonClass } from "@/components/ui/styles";

const initialState: TaskActionState = {};

export function TaskCreateForm({ today }: { today: string }) {
  // 送信成功ごとに入力欄を初期状態へ戻す（時刻の「その他」選択状態も含めてリセットする）。
  const [formKey, setFormKey] = useState(0);
  const [state, formAction, pending] = useActionState(
    async (prevState: TaskActionState, formData: FormData) => {
      const result = await createTaskAction(prevState, formData);
      if (result.success) {
        setFormKey((key) => key + 1);
      }
      return result;
    },
    initialState,
  );

  return (
    <form
      key={formKey}
      action={formAction}
      className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
    >
      <TaskFields
        defaults={{
          title: "",
          note: "",
          dueDate: today,
          dueTime: "23:59",
          importance: 2,
          urgency: 2,
        }}
      />
      <div className="flex items-center justify-end gap-3">
        {state.error ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            {state.error}
          </p>
        ) : null}
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? "追加中..." : "追加"}
        </button>
      </div>
    </form>
  );
}
