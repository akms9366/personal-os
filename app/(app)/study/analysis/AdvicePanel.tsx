"use client";

import Link from "next/link";
import { useActionState } from "react";
import { generateAdviceAction, type AdviceState } from "../actions";
import type { StudyAdviceBody } from "@/lib/ai/study";
import {
  aiBadgeClass,
  errorTextClass,
  eyebrowClass,
  metaClass,
  noticeClass,
  secondaryButtonClass,
} from "@/components/ui/styles";

const initialState: AdviceState = {};

/// AI による学習アドバイス（提案）。保存済みの最新のものを表示し、記録が増えたら作り直せる。
export function AdvicePanel({
  exam,
  aiConfigured,
  advice,
  attemptCount,
}: {
  exam: string;
  aiConfigured: boolean;
  advice: {
    body: StudyAdviceBody;
    createdAt: string;
    attemptCount: number;
    model: string;
  } | null;
  attemptCount: number;
}) {
  const [state, formAction, pending] = useActionState(
    generateAdviceAction,
    initialState,
  );

  if (!aiConfigured) {
    return (
      <p className={noticeClass}>
        AI のアドバイスを使うには、
        <Link href="/settings" className="underline underline-offset-4">
          Settings
        </Link>
        で API キーを設定してください。
      </p>
    );
  }

  const newAttempts = advice
    ? attemptCount - advice.attemptCount
    : attemptCount;

  return (
    <div className="flex flex-col gap-5">
      {advice ? (
        <article className="flex flex-col gap-5 rounded-2xl bg-cream p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className={aiBadgeClass}>AI の提案</span>
            <span className={metaClass}>
              {advice.createdAt} · {advice.attemptCount} 解答時点 ·{" "}
              {advice.model}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-ink">
            {advice.body.summary}
          </p>

          {advice.body.focusAreas.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h3 className={eyebrowClass}>重点的に学ぶこと</h3>
              <ol className="flex flex-col gap-3">
                {advice.body.focusAreas.map((area, i) => (
                  <li key={i} className="flex flex-col gap-1">
                    <p className="text-sm font-medium text-ink">
                      {i + 1}. {area.title}
                    </p>
                    <p className="text-sm leading-relaxed text-steel">
                      {area.why}
                    </p>
                    <p className="text-sm leading-relaxed text-ink">
                      → {area.howToStudy}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {advice.body.misconceptions.length > 0 ? (
            <section className="flex flex-col gap-2">
              <h3 className={eyebrowClass}>混同していそうな点</h3>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-sm leading-relaxed text-ink">
                {advice.body.misconceptions.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {advice.body.nextSteps.length > 0 ? (
            <section className="flex flex-col gap-2">
              <h3 className={eyebrowClass}>次の1週間でやること</h3>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-sm leading-relaxed text-ink">
                {advice.body.nextSteps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </article>
      ) : null}

      <form action={formAction} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="exam" value={exam} />
        <button
          type="submit"
          disabled={pending || attemptCount < 5}
          className={secondaryButtonClass}
        >
          {pending
            ? "AI が分析中…"
            : advice
              ? "アドバイスを作り直す"
              : "AI にアドバイスをもらう"}
        </button>
        <span className="text-xs text-fog">
          {attemptCount < 5
            ? "5 問以上解くと使えます"
            : advice
              ? newAttempts > 0
                ? `前回から ${newAttempts} 問解いています`
                : "前回から新しい解答はありません"
              : "集計値と直近の誤答だけを AI に送ります"}
        </span>
      </form>
      {state.error ? (
        <p role="alert" className={errorTextClass}>
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
