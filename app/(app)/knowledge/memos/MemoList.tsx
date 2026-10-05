"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteMemoAction } from "./actions";
import { MemoForm, type MemoFormValues } from "./MemoForm";
import {
  dangerButtonClass,
  emptyClass,
  ghostButtonClass,
  metaClass,
  tagClass,
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
      <li className="rounded-2xl bg-cream p-5 ring-1 ring-dove">
        <MemoForm
          memo={memo}
          tagSuggestions={tagSuggestions}
          onDone={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-4 rounded-2xl bg-cream p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-medium tracking-[-0.01em] text-ink">
            {memo.title}
          </p>
          {memo.body ? (
            <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap text-steel">
              {memo.body}
            </p>
          ) : null}
          {memo.url ? (
            <a
              href={memo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 block truncate font-mono text-xs text-fog underline decoration-dove underline-offset-2 hover:text-ink hover:decoration-ink"
            >
              {memo.url}
            </a>
          ) : null}
        </div>
        <span className={`shrink-0 ${metaClass}`}>{memo.updatedLabel}</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {memo.tags.map((tag) => (
            <Link
              key={tag}
              href={`/knowledge/memos?tag=${encodeURIComponent(tag)}`}
              className={tagClass}
            >
              #{tag}
            </Link>
          ))}
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={ghostButtonClass}
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
    <ul className="flex flex-col gap-3">
      {memos.map((memo) => (
        <MemoItem key={memo.id} memo={memo} tagSuggestions={tagSuggestions} />
      ))}
    </ul>
  );
}
