"use client";

import { useActionState, useEffect, useRef } from "react";
import { createTaskAction, type TaskActionState } from "./actions";

const initialState: TaskActionState = {};

export function TaskCreateForm() {
  const [state, formAction, pending] = useActionState(
    createTaskAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="flex gap-2">
      <input
        name="title"
        type="text"
        required
        placeholder="タスクを追加..."
        className="flex-1 rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:text-zinc-50"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "追加中..." : "追加"}
      </button>
      {state.error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      ) : null}
    </form>
  );
}
