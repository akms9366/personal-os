"use client";

import { useActionState, useState, useTransition } from "react";
import {
  deleteInboxEntry,
  reviseInboxEntry,
  taskifyInboxEntry,
  type InboxActionState,
} from "./actions";

export interface InboxEntryView {
  id: string;
  kind: string;
  body: string;
  createdAt: string;
}

const initialState: InboxActionState = {};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export function InboxItem({ entry }: { entry: InboxEntryView }) {
  const [editing, setEditing] = useState(false);
  const [reviseState, reviseAction, revisePending] = useActionState(
    reviseInboxEntry,
    initialState,
  );
  const [deletePending, startDeleteTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [taskifyPending, startTaskifyTransition] = useTransition();
  const [taskifyState, setTaskifyState] = useState<InboxActionState>({});

  function handleDelete() {
    if (!window.confirm("この記録を削除しますか？削除すると元に戻せません。")) {
      return;
    }
    setDeleteError(null);
    const formData = new FormData();
    formData.set("entryId", entry.id);
    startDeleteTransition(async () => {
      const result = await deleteInboxEntry(initialState, formData);
      if (result.error) {
        setDeleteError(result.error);
      }
    });
  }

  function handleTaskify() {
    setTaskifyState({});
    const formData = new FormData();
    formData.set("entryId", entry.id);
    startTaskifyTransition(async () => {
      const result = await taskifyInboxEntry(initialState, formData);
      setTaskifyState(result);
    });
  }

  if (editing && !reviseState.success) {
    return (
      <li className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
        <form action={reviseAction} className="flex flex-col gap-2">
          <input type="hidden" name="entryId" value={entry.id} />
          <textarea
            name="body"
            rows={3}
            required
            defaultValue={entry.body}
            autoFocus
            className="resize-none rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:text-zinc-50"
          />
          {reviseState.error ? (
            <p className="text-sm text-red-600 dark:text-red-400">
              {reviseState.error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={revisePending}
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {revisePending ? "保存中..." : "新版として保存"}
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="mb-2 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">
          {entry.kind}
        </span>
        <span>{formatTimestamp(entry.createdAt)}</span>
      </div>
      <p className="whitespace-pre-wrap text-sm text-zinc-900 dark:text-zinc-50">
        {entry.body}
      </p>
      {deleteError ? (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          {deleteError}
        </p>
      ) : null}
      {taskifyState.error ? (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          {taskifyState.error}
        </p>
      ) : null}
      {taskifyState.success ? (
        <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">
          タスク化しました（Home の今日のタスクに追加）。
        </p>
      ) : null}
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={handleTaskify}
          disabled={taskifyPending}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-60 dark:text-zinc-400 dark:hover:bg-zinc-900"
        >
          {taskifyPending ? "タスク化中..." : "タスク化"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
        >
          編集
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deletePending}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/30"
        >
          削除
        </button>
      </div>
    </li>
  );
}
