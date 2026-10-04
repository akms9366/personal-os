"use client";

import { useState } from "react";
import {
  DUE_TIME_PRESETS,
  TASK_LEVELS,
  TASK_LEVEL_LABELS,
} from "@/lib/domain/task";
import { inputClass, labelClass } from "@/components/ui/styles";

export interface TaskFieldValues {
  title: string;
  note: string;
  /// "YYYY-MM-DD"（JST）。空文字=期限なし。
  dueDate: string;
  /// "HH:MM"（JST）。
  dueTime: string;
  importance: number;
  urgency: number;
}

function LevelPicker({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: number;
}) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
        {label}
      </legend>
      <div className="flex overflow-hidden rounded-md border border-zinc-300 dark:border-zinc-700">
        {TASK_LEVELS.map((level) => (
          <label key={level} className="flex-1 cursor-pointer">
            <input
              type="radio"
              name={name}
              value={level}
              defaultChecked={defaultValue === level}
              className="peer sr-only"
            />
            <span className="block px-2 py-1.5 text-center text-sm text-zinc-600 peer-checked:bg-zinc-900 peer-checked:text-white peer-focus-visible:ring-2 dark:text-zinc-400 dark:peer-checked:bg-zinc-100 dark:peer-checked:text-zinc-900">
              {level}
              <span className="ml-0.5 text-xs">{TASK_LEVEL_LABELS[level]}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/// タスクの作成・編集フォーム共通の入力欄。
/// 期限時刻は 23:59 / 18:00 / 12:00 から選び、それ以外は「その他」で任意の時刻を入力できる。
export function TaskFields({
  defaults,
  showNote = false,
}: {
  defaults: TaskFieldValues;
  showNote?: boolean;
}) {
  const isPreset = (DUE_TIME_PRESETS as readonly string[]).includes(
    defaults.dueTime,
  );
  const [timeChoice, setTimeChoice] = useState(
    isPreset ? defaults.dueTime : "custom",
  );

  return (
    <div className="flex flex-col gap-3">
      <input
        name="title"
        type="text"
        required
        defaultValue={defaults.title}
        placeholder="タスクを追加..."
        aria-label="タイトル"
        className={inputClass}
      />

      <div className="grid grid-cols-2 gap-3">
        <label className={labelClass}>
          期限日
          <input
            name="dueDate"
            type="date"
            defaultValue={defaults.dueDate}
            className={inputClass}
          />
        </label>
        <div className="flex flex-col gap-1">
          <label className={labelClass}>
            時刻
            <select
              name="dueTime"
              value={timeChoice}
              onChange={(event) => setTimeChoice(event.target.value)}
              className={inputClass}
            >
              {DUE_TIME_PRESETS.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
              <option value="custom">その他</option>
            </select>
          </label>
          {timeChoice === "custom" ? (
            <input
              name="dueTimeCustom"
              type="time"
              required
              defaultValue={isPreset ? "" : defaults.dueTime}
              aria-label="時刻（その他）"
              className={inputClass}
            />
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <LevelPicker
          name="importance"
          label="重要度"
          defaultValue={defaults.importance}
        />
        <LevelPicker
          name="urgency"
          label="緊急度"
          defaultValue={defaults.urgency}
        />
      </div>

      {showNote ? (
        <label className={labelClass}>
          メモ
          <textarea
            name="note"
            rows={2}
            defaultValue={defaults.note}
            className={inputClass}
          />
        </label>
      ) : null}
    </div>
  );
}
