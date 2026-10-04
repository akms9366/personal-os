"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteMemoAction } from "./actions";
import { MemoForm, type MemoFormValues } from "./MemoForm";
import {
  dangerButtonClass,
  emptyClass,
  secondaryButtonClass,
} from "@/components/ui/styles";

export interface MemoView extends MemoFormValues {
  id: string;
  updatedLabel: string;
}

function MemoItem({
  memo,
  tagSuggestions,
}: {
  memo: MemoView;
  tagSuggestions: string[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm(`「${memo.title}」を削除しますか？`)) {
      return;
    }
    startTransition(async () => {
      await deleteMemoAction(memo.id);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <li className="rounded-lg border border-zinc-300 p-3 dark:border-zinc-700">
        <MemoForm
          memo={memo}
          tagSuggestions={tagSuggestions}
          onDone={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {memo.title}
          </p>
          {memo.body ? (
            <p className="mt-1 text-sm whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">
              {memo.body}
            </p>
          ) : null}
          {memo.url ? (
            <a
              href={memo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block truncate text-xs text-blue-600 underline dark:text-blue-400"
            >
              {memo.url}
            </a>
          ) : null}
        </div>
        <span className="shrink-0 text-xs text-zinc-400">
          {memo.updatedLabel}
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {memo.tags.map((tag) => (
            <Link
              key={tag}
              href={`/knowledge/memos?tag=${encodeURIComponent(tag)}`}
              className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
            >
              #{tag}
            </Link>
          ))}
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={secondaryButtonClass}
          >
            編集
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className={dangerButtonClass}
          >
            削除
          </button>
        </div>
      </div>
    </li>
  );
}

export function MemoList({
  memos,
  tagSuggestions,
}: {
  memos: MemoView[];
  tagSuggestions: string[];
}) {
  if (memos.length === 0) {
    return <p className={emptyClass}>メモはまだありません。</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {memos.map((memo) => (
        <MemoItem key={memo.id} memo={memo} tagSuggestions={tagSuggestions} />
      ))}
    </ul>
  );
}
