"use client";

import { useActionState, useState } from "react";
import { startDrillAction, type StartDrillState } from "./actions";
import {
  errorTextClass,
  eyebrowClass,
  primaryButtonClass,
  tabPillClass,
} from "@/components/ui/styles";

const initialState: StartDrillState = {};

export interface CategoryOption {
  id: string;
  label: string;
  questionCount: number;
}

export interface ModeOption {
  id: string;
  label: string;
  description: string;
}

/// ドリルの開始条件（分野・出題モード・問題数）を選ぶフォーム。
export function StartDrillForm({
  exam,
  categories,
  modes,
  counts,
}: {
  exam: string;
  categories: CategoryOption[];
  modes: ModeOption[];
  counts: readonly number[];
}) {
  const [state, formAction, pending] = useActionState(
    startDrillAction,
    initialState,
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [mode, setMode] = useState(modes[0]?.id ?? "random");
  const [count, setCount] = useState(counts[1] ?? counts[0]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  }

  const modeDescription = modes.find((m) => m.id === mode)?.description;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="exam" value={exam} />
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="count" value={count} />
      {selected.map((id) => (
        <input key={id} type="hidden" name="category" value={id} />
      ))}

      <fieldset className="flex flex-col gap-2.5">
        <legend className={`mb-2.5 ${eyebrowClass}`}>分野</legend>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSelected([])}
            aria-pressed={selected.length === 0}
            className={chipClass(selected.length === 0)}
          >
            全分野
          </button>
          {categories.map((category) => {
            const active = selected.includes(category.id);
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => toggle(category.id)}
                aria-pressed={active}
                className={chipClass(active)}
              >
                {category.label}
                <span
                  className={`ml-1.5 font-mono text-[10px] ${active ? "text-paper/70" : "text-pewter"}`}
                >
                  {category.questionCount}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className={`mb-2.5 ${eyebrowClass}`}>出題モード</legend>
        <div className="flex flex-wrap gap-1">
          {modes.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              aria-pressed={mode === m.id}
              className={tabPillClass(mode === m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
        {modeDescription ? (
          <p className="text-xs text-fog">{modeDescription}</p>
        ) : null}
      </fieldset>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <fieldset className="flex flex-col gap-2">
          <legend className={`mb-2.5 ${eyebrowClass}`}>問題数</legend>
          <div className="flex gap-1">
            {counts.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCount(c)}
                aria-pressed={count === c}
                className={tabPillClass(count === c)}
              >
                {c} 問
              </button>
            ))}
          </div>
        </fieldset>
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? "準備中…" : "ドリルを始める"}
        </button>
      </div>

      {state.error ? (
        <p role="alert" className={errorTextClass}>
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

function chipClass(active: boolean): string {
  return `inline-flex items-center rounded-full px-3 py-1.5 text-[13px] font-medium transition ${
    active
      ? "bg-ink text-paper"
      : "bg-paper text-steel ring-1 ring-dove hover:text-ink hover:ring-pewter"
  }`;
}
