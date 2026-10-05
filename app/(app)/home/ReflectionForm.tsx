"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { saveReflectionAction, type TaskActionState } from "./actions";
import {
  errorTextClass,
  primaryButtonClass,
  secondaryButtonClass,
  successTextClass,
  textareaClass,
} from "@/components/ui/styles";

const initialState: TaskActionState = {};

// 振り返り入力（Issue #17）。強制的な日報・スコアにしない: 自由記述の1欄のみで、
// 完了・保留・変更理由・感触・明日メモを個別の必須項目に分解しない（`11 §3`）。
export function ReflectionForm({
  defaultExpanded,
}: {
  defaultExpanded: boolean;
}) {
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
        className={`${secondaryButtonClass} self-start`}
      >
        振り返りを記録する
      </button>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <textarea
        name="body"
        rows={5}
        required
        placeholder="今日完了したこと・保留したこと・変更した理由・感触・明日への一言など、自由に。"
        className={textareaClass}
      />
      {state.error ? <p className={errorTextClass}>{state.error}</p> : null}
      {state.success ? (
        <p className={successTextClass}>記録しました。</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className={`${primaryButtonClass} self-start`}
      >
        {pending ? "保存中..." : "記録する"}
      </button>
    </form>
  );
}
