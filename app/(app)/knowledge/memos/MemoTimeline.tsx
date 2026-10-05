"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteMemoAction } from "./actions";
import { MemoAvatar, MemoComposer } from "./MemoComposer";
import { extractHashtags, tokenizeMemoText } from "@/lib/domain/memo";
import {
  dangerButtonClass,
  emptyClass,
  ghostButtonClass,
  metaClass,
  tagClass,
} from "@/components/ui/styles";

export interface MemoPostView {
  id: string;
  /// 投稿テキスト（1行目=title、2行目以降=body）。
  text: string;
  tags: string[];
  /// 相対時刻（"3時間" / "10月4日" など）。
  timeLabel: string;
  /// 正確な投稿日時（ホバーで表示）。
  timeTitle: string;
  edited: boolean;
}

function tagHref(tag: string): string {
  return `/knowledge/memos?tag=${encodeURIComponent(tag)}`;
}

function displayUrl(url: string): string {
  const stripped = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return stripped.length > 40 ? `${stripped.slice(0, 39)}…` : stripped;
}

function MemoText({ text }: { text: string }) {
  return (
    <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap text-ink">
      {tokenizeMemoText(text).map((token, index) => {
        if (token.type === "tag") {
          return (
            <Link
              key={index}
              href={tagHref(token.value)}
              className="font-medium text-ink underline decoration-dove underline-offset-2 hover:decoration-ink"
            >
              #{token.value}
            </Link>
          );
        }
        if (token.type === "url") {
          return (
            <a
              key={index}
              href={token.value}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[13px] text-steel underline decoration-dove underline-offset-2 hover:text-ink hover:decoration-ink"
            >
              {displayUrl(token.value)}
            </a>
          );
        }
        return token.value;
      })}
    </p>
  );
}

function MemoPost({
  memo,
  tagSuggestions,
}: {
  memo: MemoPostView;
  tagSuggestions: string[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    const preview = memo.text.split("\n")[0];
    if (!window.confirm(`「${preview}」を削除しますか？`)) {
      return;
    }
    startTransition(async () => {
      await deleteMemoAction(memo.id);
      router.refresh();
    });
  }

  // 本文に #タグ として現れないタグ（旧データ等）は、本文の下にチップで示す。
  const inText = extractHashtags(memo.text);
  const extraTags = memo.tags.filter((tag) => !inText.includes(tag));

  return (
    <li className="flex gap-3 py-5">
      <MemoAvatar />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-baseline gap-2 pt-0.5">
          <span className="text-sm font-medium text-ink">自分</span>
          <time className={metaClass} title={memo.timeTitle}>
            {memo.timeLabel}
          </time>
          {memo.edited ? <span className={metaClass}>· 編集済み</span> : null}
        </div>

        {editing ? (
          <MemoComposer
            memo={memo}
            tagSuggestions={tagSuggestions}
            onDone={() => setEditing(false)}
          />
        ) : (
          <>
            <MemoText text={memo.text} />
            {extraTags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {extraTags.map((tag) => (
                  <Link key={tag} href={tagHref(tag)} className={tagClass}>
                    #{tag}
                  </Link>
                ))}
              </div>
            ) : null}
            <div className="-ml-3 flex gap-1">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className={`${ghostButtonClass} text-xs`}
              >
                編集
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={pending}
                className={`${dangerButtonClass} text-xs`}
              >
                削除
              </button>
            </div>
          </>
        )}
      </div>
    </li>
  );
}

/// メモのタイムライン（新しい順）。
export function MemoTimeline({
  memos,
  tagSuggestions,
  emptyText,
}: {
  memos: MemoPostView[];
  tagSuggestions: string[];
  emptyText: string;
}) {
  if (memos.length === 0) {
    return <p className={emptyClass}>{emptyText}</p>;
  }
  return (
    <ul className="divide-y divide-dove/60">
      {memos.map((memo) => (
        <MemoPost key={memo.id} memo={memo} tagSuggestions={tagSuggestions} />
      ))}
    </ul>
  );
}
