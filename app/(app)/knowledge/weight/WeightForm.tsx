"use client";

import { useActionState, useEffect, useRef } from "react";
import { saveWeightAction, type WeightActionState } from "./actions";
import {
  inputClass,
  labelClass,
  primaryButtonClass,
} from "@/components/ui/styles";

const initialState: WeightActionState = {};

export function WeightForm({ today }: { today: string }) {
  const [state, formAction, pending] = useActionState(
    saveWeightAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className={`${labelClass} col-span-2 sm:col-span-1`}>
          日付
          <input
            name="date"
            type="date"
            required
            defaultValue={today}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          体重（kg）
          <input
            name="weightKg"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="1"
            required
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          体脂肪率（%）
          <input
            name="bodyFatPct"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            max="100"
            className={inputClass}
          />
        </label>
      </div>
      <label className={labelClass}>
        メモ（任意）
        <input name="note" className={inputClass} />
      </label>
      <div className="flex items-center justify-end gap-3">
        <span className="mr-auto text-xs text-zinc-500 dark:text-zinc-400">
          同じ日付で保存すると上書きします。
        </span>
        {state.error ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            {state.error}
          </p>
        ) : null}
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? "保存中..." : "記録"}
        </button>
      </div>
    </form>
  );
}
