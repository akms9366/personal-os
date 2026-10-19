"use client";

import { useActionState } from "react";
import { startDrillAction, type StartDrillState } from "./actions";
import { errorTextClass, secondaryButtonClass } from "@/components/ui/styles";

const initialState: StartDrillState = {};

/// 分析の提案などから、条件を決め打ちしてドリルを始めるボタン。
export function StartDrillButton({
  exam,
  mode,
  categories,
  count = 10,
  label = "このドリルを始める",
}: {
  exam: string;
  mode: string;
  categories: string[];
  count?: number;
  label?: string;
}) {
  const [state, formAction, pending] = useActionState(
    startDrillAction,
    initialState,
  );
  return (
    <form action={formAction} className="flex flex-col items-start gap-1.5">
      <input type="hidden" name="exam" value={exam} />
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="count" value={count} />
      {categories.map((id) => (
        <input key={id} type="hidden" name="category" value={id} />
      ))}
      <button type="submit" disabled={pending} className={secondaryButtonClass}>
        {pending ? "準備中…" : label}
        <span aria-hidden>→</span>
      </button>
      {state.error ? (
        <p role="alert" className={errorTextClass}>
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
