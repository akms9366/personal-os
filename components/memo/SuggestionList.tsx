"use client";

import Link from "next/link";
import { useState } from "react";
import { TaskFields } from "@/app/(app)/home/TaskFields";
import {
  canDecide,
  REJECT_REASONS,
  REJECT_REASON_LABELS,
  type Decision,
  type DecisionState,
} from "@/lib/domain/suggestion";
import { CONFIDENCE_LABELS } from "@/lib/domain/interpretation";
import {
  errorTextClass,
  ghostButtonClass,
  inputClass,
  metaClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui/styles";
import type { SuggestionView } from "./memoView";

// 行動候補（S4）の表示と、利用者の決定（採用・却下・保留）の操作（Issue #21）。
//   - 候補は破線の枠・「候補」ラベルで、決めるまで正式なタスクではないことを示す。
//   - 採用したものだけが実線の「採用」になり、作られたタスクへのリンクを出す。
//   - 却下・保留は採用と同じ重さで記録され、あとから決め直せる。
//   - AI は決めない。ボタンは利用者の操作でだけ決定を送る。

export interface DecisionRequest {
  decision: "adopt" | "reject" | "hold";
  reason?: string | null;
  final?: {
    title: string;
    dueDate: string;
    dueTime: string;
    importance: number | null;
    urgency: number | null;
  } | null;
}

export type DecideHandler = (
  suggestionId: string,
  request: DecisionRequest,
) => Promise<{ ok: boolean; error?: string }>;

const statePillClass =
  "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium";

function dueText(suggestion: SuggestionView): string | null {
  if (suggestion.defaults.dueDate) {
    const [, month, day] = suggestion.defaults.dueDate.split("-").map(Number);
    return `${month}/${day}`;
  }
  return suggestion.dueHint ? `${suggestion.dueHint}（日付未確定）` : null;
}

function currentState(suggestion: SuggestionView): DecisionState {
  const { decision } = suggestion;
  return decision.state;
}

function SuggestionItem({
  suggestion,
  onDecide,
}: {
  suggestion: SuggestionView;
  onDecide?: DecideHandler;
}) {
  const [mode, setMode] = useState<"idle" | "adopt" | "reject">("idle");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { decision } = suggestion;
  const state = currentState(suggestion);
  const taskExists =
    (decision.state === "adopt" || decision.state === "modify") &&
    decision.task !== null;
  const can = (next: Decision) => canDecide(state, next, taskExists);

  async function send(request: DecisionRequest) {
    if (!onDecide || pending) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await onDecide(suggestion.id, request);
      if (!result.ok) {
        setError(result.error ?? "決定を記録できませんでした。");
      } else {
        setMode("idle");
      }
    } catch {
      setError("決定を記録できませんでした。もう一度お試しください。");
    } finally {
      setPending(false);
    }
  }

  const facts = [
    dueText(suggestion) ? `期限 ${dueText(suggestion)}` : null,
    suggestion.people.length > 0
      ? `関係者 ${suggestion.people.join("・")}`
      : null,
    suggestion.nextAction ? `次の行動 ${suggestion.nextAction}` : null,
    CONFIDENCE_LABELS[suggestion.confidence],
  ].filter(Boolean);

  const adopted = decision.state === "adopt" || decision.state === "modify";

  return (
    <li
      className={`flex flex-col gap-2 rounded-xl px-3 py-2.5 ${
        adopted ? "bg-cream" : "border border-dashed border-dove"
      }`}
      data-suggestion-state={decision.state}
    >
      <div className="flex flex-wrap items-center gap-2">
        {adopted ? (
          <span className={`${statePillClass} bg-ink text-paper`}>
            {decision.label}
          </span>
        ) : decision.state === "undecided" ? (
          <span
            className={`${statePillClass} border border-dashed border-dove text-steel`}
          >
            候補
          </span>
        ) : (
          <span
            className={`${statePillClass} bg-paper text-steel ring-1 ring-dove`}
          >
            {decision.label}
          </span>
        )}
        <span className="text-sm text-ink">{suggestion.title}</span>
      </div>
      <p className="flex flex-wrap gap-x-3 text-xs text-fog">
        {facts.map((fact) => (
          <span key={String(fact)}>{fact}</span>
        ))}
      </p>

      {adopted ? (
        <p className="text-xs text-steel">
          {decision.task ? (
            <>
              タスクにしました（
              <Link
                href="/home"
                className="underline decoration-dove underline-offset-2 hover:decoration-ink"
              >
                Home で見る
              </Link>
              ）
            </>
          ) : (
            "採用しましたが、タスクは削除されています。"
          )}
          <span className={`ml-2 ${metaClass}`}>{decision.decidedLabel}</span>
        </p>
      ) : null}
      {decision.state === "reject" || decision.state === "hold" ? (
        <p className="text-xs text-steel">
          {decision.state === "hold"
            ? "保留中です。あとで採用・却下できます。"
            : `却下しました${decision.reasonLabel ? `（${decision.reasonLabel}）` : ""}。`}
          <span className={`ml-2 ${metaClass}`}>{decision.decidedLabel}</span>
        </p>
      ) : null}

      {mode === "adopt" ? (
        <form
          className="flex flex-col gap-3 pt-1"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            let dueTime = String(data.get("dueTime") ?? "");
            if (dueTime === "custom") {
              dueTime = String(data.get("dueTimeCustom") ?? "");
            }
            void send({
              decision: "adopt",
              final: {
                title: String(data.get("title") ?? ""),
                dueDate: String(data.get("dueDate") ?? ""),
                dueTime,
                importance: Number(data.get("importance")),
                urgency: Number(data.get("urgency")),
              },
            });
          }}
        >
          <p className="text-xs text-fog">
            内容を確認・修正してタスクにします。重要度・緊急度はあなたが選びます。
          </p>
          <TaskFields
            defaults={{
              title: suggestion.defaults.title,
              note: "",
              dueDate: suggestion.defaults.dueDate,
              dueTime: suggestion.defaults.dueTime,
              importance: 2,
              urgency: 2,
            }}
          />
          {suggestion.dueHint && !suggestion.defaults.dueDate ? (
            <p className="text-xs text-fog">
              原文の期限の表現: {suggestion.dueHint}（日付は選んでください）
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setMode("idle")}
              className={ghostButtonClass}
            >
              やめる
            </button>
            <button
              type="submit"
              disabled={pending}
              className={primaryButtonClass}
            >
              {pending ? "記録中..." : "タスクにする"}
            </button>
          </div>
        </form>
      ) : null}

      {mode === "reject" ? (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <select
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            aria-label="却下の理由（任意）"
            className={`${inputClass} w-auto py-1.5`}
          >
            <option value="">理由（任意）</option>
            {REJECT_REASONS.map((value) => (
              <option key={value} value={value}>
                {REJECT_REASON_LABELS[value]}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              void send({ decision: "reject", reason: reason || null })
            }
            className={secondaryButtonClass}
          >
            却下する
          </button>
          <button
            type="button"
            onClick={() => setMode("idle")}
            className={ghostButtonClass}
          >
            やめる
          </button>
        </div>
      ) : null}

      {onDecide &&
      mode === "idle" &&
      (can("adopt") || can("hold") || can("reject")) ? (
        <div className="-ml-1 flex flex-wrap gap-1">
          {can("adopt") ? (
            <button
              type="button"
              onClick={() => setMode("adopt")}
              className={`${secondaryButtonClass} text-xs`}
            >
              タスクにする
            </button>
          ) : null}
          {can("hold") ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => void send({ decision: "hold" })}
              className={`${ghostButtonClass} text-xs`}
            >
              保留
            </button>
          ) : null}
          {can("reject") ? (
            <button
              type="button"
              onClick={() => setMode("reject")}
              className={`${ghostButtonClass} text-xs`}
            >
              却下
            </button>
          ) : null}
        </div>
      ) : null}

      {error ? <p className={errorTextClass}>{error}</p> : null}
    </li>
  );
}

export function SuggestionList({
  suggestions,
  onDecide,
}: {
  suggestions: SuggestionView[];
  /// 渡さなければ表示のみ（決定の操作を出さない）。
  onDecide?: DecideHandler;
}) {
  if (suggestions.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-col gap-2 pt-1">
      <p className={metaClass}>
        行動候補（AI の提案。あなたが決めるまで確定しません）
      </p>
      <ul className="flex flex-col gap-2">
        {suggestions.map((suggestion) => (
          <SuggestionItem
            key={suggestion.id}
            suggestion={suggestion}
            onDecide={onDecide}
          />
        ))}
      </ul>
    </div>
  );
}
