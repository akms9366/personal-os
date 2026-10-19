"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { answerQuestionAction, type AnswerResult } from "../../actions";
import {
  errorTextClass,
  eyebrowClass,
  ghostButtonClass,
  primaryButtonClass,
} from "@/components/ui/styles";
import { CHOICE_LABELS } from "@/lib/study/types";

export interface DrillQuestionView {
  sessionId: string;
  questionId: string;
  position: number;
  total: number;
  categoryLabel: string;
  topic: string;
  stem: string;
  choices: string[];
}

/// 1問ずつ解くドリル画面。正誤はサーバで判定して記録し、解説を見てから次の問題へ進む。
/// キーボード: 1〜4 で選択、Enter で解答・次へ。
export function DrillRunner({ question }: { question: DrillQuestionView }) {
  const router = useRouter();
  const [selected, setSelected] = useState<number | null>(null);
  const [unsure, setUnsure] = useState(false);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [pending, startTransition] = useTransition();
  const answered = result !== null && result.error === undefined;
  const isLast = question.position >= question.total;

  const submit = useCallback(() => {
    if (selected === null || pending || answered) {
      return;
    }
    startTransition(async () => {
      setResult(
        await answerQuestionAction(
          question.sessionId,
          question.questionId,
          selected,
          unsure,
        ),
      );
    });
  }, [selected, pending, answered, question, unsure]);

  const next = useCallback(() => {
    // Server Action を直接呼んだ後は表示が自動で更新されないため、明示的に再取得する。
    startTransition(() => router.refresh());
  }, [router]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // 文字入力中（メモ投稿ダイアログなど）はショートカットを奪わない。チェックボックスは対象外。
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          target.tagName === "TEXTAREA" ||
          (target instanceof HTMLInputElement && target.type !== "checkbox"))
      ) {
        return;
      }
      if (!answered && ["1", "2", "3", "4"].includes(event.key)) {
        setSelected(Number(event.key) - 1);
      } else if (event.key === "Enter" && !event.isComposing) {
        event.preventDefault();
        if (answered) {
          next();
        } else {
          submit();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [answered, next, submit]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-3">
          <p className={eyebrowClass}>
            {question.categoryLabel} · {question.topic}
          </p>
          <p className="font-mono text-xs text-fog tabular-nums">
            {question.position} / {question.total}
          </p>
        </div>
        <div
          className="h-1 overflow-hidden rounded-full bg-dove/60"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={question.total}
          aria-valuenow={question.position - (answered ? 0 : 1)}
          aria-label="進捗"
        >
          <div
            className="h-full rounded-full bg-ink transition-[width]"
            style={{
              width: `${((question.position - (answered ? 0 : 1)) / question.total) * 100}%`,
            }}
          />
        </div>
      </div>

      <p className="text-base leading-relaxed whitespace-pre-wrap text-ink sm:text-lg">
        {question.stem}
      </p>

      <ol className="flex flex-col gap-2" aria-label="選択肢">
        {question.choices.map((choice, index) => (
          <li key={index}>
            <button
              type="button"
              onClick={() => !answered && setSelected(index)}
              disabled={answered || pending}
              aria-pressed={selected === index}
              className={choiceClass(index, selected, answered ? result : null)}
            >
              <span className="mt-px font-mono text-xs text-fog">
                {CHOICE_LABELS[index]}
              </span>
              <span className="flex-1 leading-relaxed">{choice}</span>
              {answered && index === result.correctIndex ? (
                <span className="text-xs font-medium text-success">正答</span>
              ) : null}
              {answered && index === selected && !result.isCorrect ? (
                <span className="text-xs font-medium text-danger">
                  あなたの解答
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ol>

      {answered ? (
        <div
          role="status"
          className={`rounded-2xl px-5 py-4 ${result.isCorrect ? "bg-cream" : "bg-danger/[0.06]"}`}
        >
          <p
            className={`mb-2 text-sm font-medium ${result.isCorrect ? "text-success" : "text-danger"}`}
          >
            {result.isCorrect
              ? unsure
                ? "正解（自信なしとして記録しました）"
                : "正解"
              : `不正解 — 正答は ${CHOICE_LABELS[result.correctIndex ?? 0]}`}
          </p>
          <p className="text-sm leading-relaxed text-ink">
            {result.explanation}
          </p>
        </div>
      ) : null}

      {result?.error ? (
        <p role="alert" className={errorTextClass}>
          {result.error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Link href="/study" className={ghostButtonClass}>
            中断する
          </Link>
          {!answered ? (
            <label className="flex items-center gap-2 text-sm text-steel">
              <input
                type="checkbox"
                checked={unsure}
                onChange={(event) => setUnsure(event.target.checked)}
                className="size-4 accent-ink"
              />
              自信なし
            </label>
          ) : null}
        </div>
        {answered ? (
          <button
            type="button"
            onClick={next}
            disabled={pending}
            className={primaryButtonClass}
          >
            {isLast ? "結果を見る" : "次の問題へ"}
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={selected === null || pending}
            className={primaryButtonClass}
          >
            {pending ? "判定中…" : "解答する"}
          </button>
        )}
      </div>
    </div>
  );
}

function choiceClass(
  index: number,
  selected: number | null,
  result: AnswerResult | null,
): string {
  const base =
    "flex w-full items-start gap-3 rounded-2xl px-4 py-3.5 text-left text-sm transition disabled:cursor-default";
  if (result) {
    if (index === result.correctIndex) {
      return `${base} bg-paper text-ink ring-2 ring-success`;
    }
    if (index === selected) {
      return `${base} bg-paper text-ink ring-2 ring-danger`;
    }
    return `${base} bg-paper text-fog ring-1 ring-dove`;
  }
  return index === selected
    ? `${base} bg-paper text-ink ring-2 ring-ink`
    : `${base} bg-paper text-ink ring-1 ring-dove hover:ring-pewter`;
}
