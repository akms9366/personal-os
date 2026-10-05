"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import {
  deleteInboxEntry,
  reviseInboxEntry,
  taskifyInboxEntry,
  type InboxActionState,
} from "./actions";
import {
  dangerButtonClass,
  errorTextClass,
  ghostButtonClass,
  metaClass,
  primaryButtonClass,
  successTextClass,
  textareaClass,
} from "@/components/ui/styles";

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
  const router = useRouter();
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
      } else {
        // 直接呼び出し（フォーム送信を介さない）では revalidatePath だけではこの
        // ページの表示が自動更新されないため、削除成功時のみ明示的に refresh する。
        router.refresh();
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
      <li className="rounded-2xl bg-cream p-5">
        <form action={reviseAction} className="flex flex-col gap-3">
          <input type="hidden" name="entryId" value={entry.id} />
          <textarea
            name="body"
            rows={3}
            required
            defaultValue={entry.body}
            autoFocus
            className={textareaClass}
          />
          {reviseState.error ? (
            <p className={errorTextClass}>{reviseState.error}</p>
          ) : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className={ghostButtonClass}
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={revisePending}
              className={primaryButtonClass}
            >
              {revisePending ? "保存中..." : "新版として保存"}
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="rounded-2xl bg-cream p-5">
      <div className="mb-3 flex items-center gap-3">
        <span className="rounded-full bg-paper px-2 py-0.5 font-mono text-[11px] text-steel ring-1 ring-dove">
          {entry.kind}
        </span>
        <span className={metaClass}>{formatTimestamp(entry.createdAt)}</span>
      </div>
      <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink">
        {entry.body}
      </p>
      {deleteError ? (
        <p className={`mt-3 ${errorTextClass}`}>{deleteError}</p>
      ) : null}
      {taskifyState.error ? (
        <p className={`mt-3 ${errorTextClass}`}>{taskifyState.error}</p>
      ) : null}
      {taskifyState.success ? (
        <p className={`mt-3 ${successTextClass}`}>
          タスク化しました（Home の今日のタスクに追加）。
        </p>
      ) : null}
      <div className="mt-3 flex justify-end gap-1">
        <button
          type="button"
          onClick={handleTaskify}
          disabled={taskifyPending}
          className={ghostButtonClass}
        >
          {taskifyPending ? "タスク化中..." : "タスク化"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={ghostButtonClass}
        >
          編集
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deletePending}
          className={dangerButtonClass}
        >
          削除
        </button>
      </div>
    </li>
  );
}
