"use client";

import { useActionState } from "react";
import { saveAiSettings, type AiSettingsState } from "./actions";
import {
  errorTextClass,
  inputClass,
  labelClass,
  primaryButtonClass,
  successTextClass,
} from "@/components/ui/styles";

const initialState: AiSettingsState = {};

export function AiSettingsForm({
  aiModel,
  aiApiKeyMasked,
}: {
  aiModel: string;
  aiApiKeyMasked: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    saveAiSettings,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <label className={labelClass}>
        モデル
        <input
          id="model"
          name="model"
          type="text"
          defaultValue={aiModel}
          required
          className={`${inputClass} font-mono`}
        />
      </label>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>
          Claude API キー
          <input
            id="apiKey"
            name="apiKey"
            type="password"
            autoComplete="off"
            placeholder={aiApiKeyMasked ?? "未設定"}
            className={`${inputClass} font-mono`}
          />
        </label>
        <p className="text-xs text-fog">
          {aiApiKeyMasked
            ? `設定済み（${aiApiKeyMasked}）。変更する場合のみ入力してください。`
            : "未設定です。入力すると保存されます。"}
        </p>
      </div>

      {state.error ? <p className={errorTextClass}>{state.error}</p> : null}
      {state.success ? (
        <p className={successTextClass}>保存しました。</p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className={`${primaryButtonClass} self-start`}
      >
        {pending ? "保存中..." : "保存"}
      </button>
    </form>
  );
}
