"use client";

import { useActionState, useEffect, useRef } from "react";
import { addShoppingItemsAction, type ShoppingActionState } from "./actions";
import { inputClass, primaryButtonClass } from "@/components/ui/styles";

const initialState: ShoppingActionState = {};

export function ShoppingForm() {
  const [state, formAction, pending] = useActionState(
    addShoppingItemsAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <textarea
          name="items"
          rows={1}
          required
          placeholder="買うもの（改行で複数まとめて追加）"
          aria-label="品名"
          className={`${inputClass} min-h-10 flex-1 resize-y`}
        />
        <input
          name="quantity"
          placeholder="数量"
          aria-label="数量"
          className={`${inputClass} w-20`}
        />
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          追加
        </button>
      </div>
      {state.error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      ) : null}
    </form>
  );
}
