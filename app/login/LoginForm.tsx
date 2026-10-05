"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";
import {
  errorTextClass,
  inputClass,
  labelClass,
  primaryButtonClass,
} from "@/components/ui/styles";

const initialState: LoginState = {};

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form
      action={formAction}
      className="flex w-full flex-col gap-5 rounded-2xl bg-cream p-6 sm:p-8"
    >
      <input type="hidden" name="next" value={next} />
      <label className={labelClass}>
        パスワード
        <input
          id="password"
          name="password"
          type="password"
          required
          autoFocus
          className={inputClass}
        />
      </label>

      {state.error ? <p className={errorTextClass}>{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className={`${primaryButtonClass} py-2.5`}
      >
        {pending ? "確認中..." : "ログイン"}
      </button>
    </form>
  );
}
