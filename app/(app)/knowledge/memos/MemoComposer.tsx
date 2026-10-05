"use client";

import { useActionState, useRef, useState } from "react";
import { postMemoAction, type MemoActionState } from "./actions";
import { extractHashtags } from "@/lib/domain/memo";
import {
  errorTextClass,
  ghostButtonClass,
  primaryButtonClass,
} from "@/components/ui/styles";

const initialState: MemoActionState = {};

/// 投稿者アイコン（自分専用なのでロゴと同じピルの印）。
export function MemoAvatar() {
  return (
    <span
      aria-hidden
      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cream ring-1 ring-dove"
    >
      <span className="h-4 w-2 rounded-full bg-ink" />
    </span>
  );
}

/// メモの投稿欄（新規）／編集欄（memo あり）。1つのテキストに書き、#タグ で分類する。
export function MemoComposer({
  memo,
  tagSuggestions,
  onDone,
}: {
  memo?: { id: string; text: string; tags: string[] };
  tagSuggestions: string[];
  onDone?: () => void;
}) {
  const [text, setText] = useState(memo?.text ?? "");
  // 本文に #タグ として書かれていない既存タグ（旧データ等）。編集時に外さない限り保持する。
  const [keptTags, setKeptTags] = useState(() => {
    const inText = extractHashtags(memo?.text ?? "");
    return (memo?.tags ?? []).filter((tag) => !inText.includes(tag));
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [state, formAction, pending] = useActionState(
    async (prevState: MemoActionState, formData: FormData) => {
      const result = await postMemoAction(prevState, formData);
      if (result.success) {
        if (onDone) {
          onDone();
        } else {
          setText("");
        }
      }
      return result;
    },
    initialState,
  );

  const hashtags = extractHashtags(text);
  const suggestions = tagSuggestions.filter(
    (tag) => !hashtags.includes(tag) && !keptTags.includes(tag),
  );

  function insertTag(tag: string) {
    const separator = text.length === 0 || /\s$/.test(text) ? "" : " ";
    setText(`${text}${separator}#${tag} `);
    textareaRef.current?.focus();
  }

  return (
    <form action={formAction} className="flex gap-3">
      {memo ? null : <MemoAvatar />}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {memo ? <input type="hidden" name="memoId" value={memo.id} /> : null}
        <input type="hidden" name="tags" value={keptTags.join("\n")} />
        <textarea
          ref={textareaRef}
          name="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.currentTarget.form?.requestSubmit();
            }
          }}
          rows={memo ? 4 : 3}
          autoFocus={Boolean(memo)}
          placeholder="いま気になっていることは？  #タグ で分類できます"
          aria-label="メモ"
          className="field-sizing-content min-h-20 w-full resize-none bg-transparent pt-2 text-[15px] leading-relaxed text-ink outline-none placeholder:text-pewter"
        />

        {keptTags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {keptTags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 rounded-full bg-ink py-0.5 pr-1 pl-2.5 text-xs text-paper"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => setKeptTags(keptTags.filter((t) => t !== tag))}
                  aria-label={`${tag} を外す`}
                  className="rounded-full px-1 text-paper/60 hover:text-paper"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 border-t border-dove/60 pt-3">
          <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
            {suggestions.slice(0, 8).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => insertTag(tag)}
                className="shrink-0 rounded-full border border-dashed border-dove px-2.5 py-0.5 text-xs text-fog transition hover:border-pewter hover:text-ink"
              >
                +#{tag}
              </button>
            ))}
          </div>
          {onDone ? (
            <button type="button" onClick={onDone} className={ghostButtonClass}>
              キャンセル
            </button>
          ) : null}
          <button
            type="submit"
            disabled={pending || text.trim().length === 0}
            className={primaryButtonClass}
          >
            {pending ? "保存中..." : memo ? "保存" : "ポスト"}
          </button>
        </div>
        {state.error ? <p className={errorTextClass}>{state.error}</p> : null}
      </div>
    </form>
  );
}
