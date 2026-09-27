"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { saveReflectionAction, type TaskActionState } from "./actions";

const initialState: TaskActionState = {};

// 振り返り入力（Issue #17）。強制的な日報・スコアにしない: 自由記述の1欄のみで、
// 完了・保留・変更理由・感触・明日メモを個別の必須項目に分解しない（`11 §3`）。
export function ReflectionForm({ defaultExpanded }: { defaultExpanded: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [state, formAction, pending] = useActionState(
    saveReflectionAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="self-start text-sm font-medium text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
      >
        振り返りを記録する
      </button>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <textarea
        name="body"
        rows={4}
        required
        placeholder="今日完了したこと・保留したこと・変更した理由・感触・明日への一言など、自由に。"
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
  );
}
