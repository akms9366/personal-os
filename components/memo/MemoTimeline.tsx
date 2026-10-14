"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import {
  analyzeMemoAction,
  decideSuggestionAction,
  deleteMemoAction,
} from "@/app/(app)/knowledge/memos/actions";
import { MemoAvatar, MemoComposer } from "./MemoComposer";
import { MemoPostBody } from "./MemoPostBody";
import type { DecideHandler } from "./SuggestionList";
import type { MemoPostView } from "./memoView";
import {
  dangerButtonClass,
  emptyClass,
  ghostButtonClass,
  metaClass,
} from "@/components/ui/styles";

export type { MemoPostView } from "./memoView";

// この画面で自動開始した解析（原情報の版ごと）。同じ投稿が Home とメモページに並んでも、
// 再描画のたびに何度も開始しない。サーバ側でも版ごとに1回しか実行しない（lib/analysis/run.ts）。
const autoStarted = new Set<string>();

/// 別の要求が解析中だったとき、結果を取り直すまでの待ち時間。
const RECHECK_MS = 4000;

function MemoPost({
  memo,
  tagSuggestions,
  aiAvailable,
}: {
  memo: MemoPostView;
  tagSuggestions: string[];
  aiAvailable: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, startDelete] = useTransition();
  const [analyzing, setAnalyzing] = useState(false);

  const analyze = useCallback(async () => {
    setAnalyzing(true);
    try {
      const outcome = await analyzeMemoAction(memo.id);
      if (outcome.status === "skipped") {
        // 他の画面・要求が解析中。少し待って結果を取り直す。
        setTimeout(() => router.refresh(), RECHECK_MS);
      }
    } finally {
      setAnalyzing(false);
      router.refresh();
    }
  }, [memo.id, router]);

  // 投稿直後（解析待ち）の投稿は、表示されたら自動で解析を始める。
  useEffect(() => {
    const key = memo.entryId ?? memo.id;
    if (
      !aiAvailable ||
      memo.analysis.state !== "pending" ||
      autoStarted.has(key)
    ) {
      return;
    }
    // 描画後に開始する（StrictMode の二重実行でも、片付けで取り消されるため1回だけ）。
    const timer = setTimeout(() => {
      if (autoStarted.has(key)) {
        return;
      }
      autoStarted.add(key);
      void analyze();
    }, 0);
    return () => clearTimeout(timer);
  }, [aiAvailable, memo.analysis.state, memo.entryId, memo.id, analyze]);

  // 行動候補への決定（採用・却下・保留）。利用者のボタン操作でだけ呼ばれる。
  const decide: DecideHandler = async (suggestionId, request) => {
    const result = await decideSuggestionAction({ suggestionId, ...request });
    router.refresh();
    return result.ok ? { ok: true } : { ok: false, error: result.error };
  };

  function handleDelete() {
    const preview = memo.text.split("\n")[0];
    if (!window.confirm(`「${preview}」を削除しますか？`)) {
      return;
    }
    startDelete(async () => {
      await deleteMemoAction(memo.id);
      router.refresh();
    });
  }

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
            <MemoPostBody
              memo={memo}
              analyzing={analyzing}
              onAnalyze={aiAvailable && !analyzing ? analyze : undefined}
              onDecide={decide}
            />
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
                disabled={deleting}
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

/// メモのタイムライン（新しい順）。aiAvailable=false（API キー未設定）でも投稿・表示はそのまま使える。
export function MemoTimeline({
  memos,
  tagSuggestions,
  emptyText,
  aiAvailable,
}: {
  memos: MemoPostView[];
  tagSuggestions: string[];
  emptyText: string;
  aiAvailable: boolean;
}) {
  if (memos.length === 0) {
    return <p className={emptyClass}>{emptyText}</p>;
  }
  return (
    <ul className="divide-y divide-dove/60">
      {memos.map((memo) => (
        <MemoPost
          key={memo.id}
          memo={memo}
          tagSuggestions={tagSuggestions}
          aiAvailable={aiAvailable}
        />
      ))}
    </ul>
  );
}
