"use client";

import { useActionState, useEffect, useRef } from "react";
import { saveJournalEntry, type InboxActionState } from "./actions";
import {
  cardClass,
  errorTextClass,
  primaryButtonClass,
  sectionTitleClass,
  successTextClass,
  textareaClass,
} from "@/components/ui/styles";

const initialState: InboxActionState = {};

// Journal 作成フォーム（Issue #9）。Quick Capture（kind=note 固定）とは別の入口として、
// 内省・振り返りの原情報（S1、将来の S8 振り返り領域 #17 の土台）を明示的に残す。
export function JournalForm() {
  const [state, formAction, pending] = useActionState(
    saveJournalEntry,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <section className={cardClass}>
      <h2 className={`mb-4 ${sectionTitleClass}`}>Journal</h2>
      <form ref={formRef} action={formAction} className="flex flex-col gap-3">
        <textarea
          name="body"
          rows={3}
          required
          placeholder="今日の出来事・気づき・内省を記録..."
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
    </section>
  );
}
