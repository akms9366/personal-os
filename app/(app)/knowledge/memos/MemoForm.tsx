"use client";

import { useActionState, useState } from "react";
import { saveMemoAction, type MemoActionState } from "./actions";
import { TagEditor } from "./TagEditor";
import {
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui/styles";

export interface MemoFormValues {
  id?: string;
  title: string;
  body: string;
  url: string;
  tags: string[];
}

const initialState: MemoActionState = {};

/// メモの作成・編集フォーム（memo.id があれば編集）。
export function MemoForm({
  memo,
  tagSuggestions,
  onDone,
}: {
  memo?: MemoFormValues;
  tagSuggestions: string[];
  onDone?: () => void;
}) {
  const [formKey, setFormKey] = useState(0);
  // 成功時: 編集なら閉じる（onDone）、新規なら入力欄を空に戻す（form を作り直す）。
  const [state, formAction, pending] = useActionState(
    async (prevState: MemoActionState, formData: FormData) => {
      const result = await saveMemoAction(prevState, formData);
      if (result.success) {
        if (onDone) {
          onDone();
        } else {
          setFormKey((key) => key + 1);
        }
      }
      return result;
    },
    initialState,
  );

  return (
    <form key={formKey} action={formAction} className="flex flex-col gap-3">
      {memo?.id ? <input type="hidden" name="memoId" value={memo.id} /> : null}
      <input
        name="title"
        required
        defaultValue={memo?.title}
        placeholder="気になること（本・店・場所・アイデアなど）"
        aria-label="タイトル"
        className={inputClass}
      />
      <textarea
        name="body"
        rows={2}
        defaultValue={memo?.body}
        placeholder="メモ（任意）"
        aria-label="メモ"
        className={inputClass}
      />
      <input
        name="url"
        type="url"
        defaultValue={memo?.url}
        placeholder="URL（任意）"
        aria-label="URL"
        className={inputClass}
      />
      <TagEditor defaultTags={memo?.tags ?? []} suggestions={tagSuggestions} />
      <div className="flex items-center justify-end gap-2">
        {state.error ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            {state.error}
          </p>
        ) : null}
        {onDone ? (
          <button
            type="button"
            onClick={onDone}
            className={secondaryButtonClass}
          >
            キャンセル
          </button>
        ) : null}
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? "保存中..." : memo?.id ? "保存" : "追加"}
        </button>
      </div>
    </form>
  );
}
