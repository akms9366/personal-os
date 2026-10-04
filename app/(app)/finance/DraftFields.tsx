"use client";

import {
  categoriesFor,
  FINANCE_TYPE_LABELS,
  FINANCE_TYPES,
  type FinanceDraft,
} from "@/lib/domain/finance";
import { inputClass } from "@/components/ui/styles";

/// 収支1件ぶんの入力欄（AI 下書きの確認・手入力・編集で共通）。
export function DraftFields({
  draft,
  onChange,
}: {
  draft: FinanceDraft;
  onChange: (next: FinanceDraft) => void;
}) {
  const set = <K extends keyof FinanceDraft>(key: K, value: FinanceDraft[K]) =>
    onChange({ ...draft, [key]: value });

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <input
        type="date"
        value={draft.date}
        onChange={(e) => set("date", e.target.value)}
        aria-label="日付"
        className={inputClass}
      />
      <select
        value={draft.type}
        onChange={(e) => {
          const type = e.target.value as FinanceDraft["type"];
          const categories = categoriesFor(type);
          onChange({
            ...draft,
            type,
            category: categories.includes(draft.category)
              ? draft.category
              : categories[0],
          });
        }}
        aria-label="種別"
        className={inputClass}
      >
        {FINANCE_TYPES.map((type) => (
          <option key={type} value={type}>
            {FINANCE_TYPE_LABELS[type]}
          </option>
        ))}
      </select>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        step={1}
        value={draft.amount || ""}
        onChange={(e) => set("amount", Math.round(Number(e.target.value)))}
        placeholder="金額（円）"
        aria-label="金額"
        className={inputClass}
      />
      <select
        value={draft.category}
        onChange={(e) => set("category", e.target.value)}
        aria-label="カテゴリ"
        className={inputClass}
      >
        {categoriesFor(draft.type).map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
      <input
        value={draft.description}
        onChange={(e) => set("description", e.target.value)}
        placeholder="内容（店名・品目）"
        aria-label="内容"
        className={`${inputClass} col-span-2`}
      />
      <input
        value={draft.paymentMethod}
        onChange={(e) => set("paymentMethod", e.target.value)}
        placeholder="支払方法（任意）"
        aria-label="支払方法"
        className={inputClass}
      />
      <input
        value={draft.memo}
        onChange={(e) => set("memo", e.target.value)}
        placeholder="メモ（任意）"
        aria-label="メモ"
        className={inputClass}
      />
    </div>
  );
}

export function emptyDraft(today: string): FinanceDraft {
  return {
    date: today,
    type: "expense",
    amount: 0,
    category: "食費",
    description: "",
    paymentMethod: "",
    memo: "",
  };
}
