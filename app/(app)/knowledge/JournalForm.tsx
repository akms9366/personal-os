"use client";

import { useActionState, useEffect, useRef } from "react";
import { saveJournalEntry, type InboxActionState } from "./actions";

const initialState: InboxActionState = {};

// Journal 作成フォーム（Issue #9）。Quick Capture（kind=note 固定）とは別の入口として、
// 内省・振り返りの原情報（S1、将来の S8 振り返り領域 #17 の土台）を明示的に残す。
export function JournalForm() {
  const [state, formAction, pending] = useActionState(saveJournalEntry, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Journal
      </h2>
      <form ref={formRef} action={formAction} className="flex flex-col gap-3">
        <textarea
          name="body"
          rows={3}
          required
          placeholder="今日の出来事・気づき・内省を記録..."
          className="resize-none rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:text-zinc-50"
        />
        {state.error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
        ) : null}
        {state.success ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            記録しました。
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "保存中..." : "記録する"}
        </button>
      </form>
    </section>
  );
}
