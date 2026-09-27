"use client";

import { useActionState } from "react";
import { saveAiSettings, type AiSettingsState } from "./actions";

const initialState: AiSettingsState = {};

export function AiSettingsForm({
  aiModel,
  aiApiKeyMasked,
}: {
  aiModel: string;
  aiApiKeyMasked: string | null;
}) {
  const [state, formAction, pending] = useActionState(saveAiSettings, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="model"
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          モデル
        </label>
        <input
          id="model"
          name="model"
          type="text"
          defaultValue={aiModel}
          required
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:text-zinc-50"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="apiKey"
          className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Claude API キー
        </label>
        <input
          id="apiKey"
          name="apiKey"
          type="password"
          autoComplete="off"
          placeholder={aiApiKeyMasked ?? "未設定"}
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:text-zinc-50"
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {aiApiKeyMasked
            ? `設定済み（${aiApiKeyMasked}）。変更する場合のみ入力してください。`
            : "未設定です。入力すると保存されます。"}
        </p>
      </div>

      {state.error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          保存しました。
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "保存中..." : "保存"}
      </button>
    </form>
  );
}
