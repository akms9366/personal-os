"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  deleteFinanceRecordAction,
  updateFinanceRecordAction,
} from "./actions";
import { DraftFields } from "./DraftFields";
import { formatYen, type FinanceDraft } from "@/lib/domain/finance";
import {
  dangerButtonClass,
  emptyClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui/styles";

export interface RecordView extends FinanceDraft {
  id: string;
  dateLabel: string;
  source: string;
}

function RecordRow({ record }: { record: RecordView }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<FinanceDraft>(record);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSave() {
    setError("");
    startTransition(async () => {
      const result = await updateFinanceRecordAction(record.id, draft);
      if (result.error) {
        setError(result.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  function handleDelete() {
    if (
      !window.confirm(
        `「${record.description}」${formatYen(record.amount)} を削除しますか？`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      await deleteFinanceRecordAction(record.id);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <li className="flex flex-col gap-2 border-t border-zinc-200 py-3 dark:border-zinc-800">
        <DraftFields draft={draft} onChange={setDraft} />
        <div className="flex items-center justify-end gap-2">
          {error ? (
            <p className="mr-auto text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className={dangerButtonClass}
          >
            削除
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(record);
              setEditing(false);
            }}
            className={secondaryButtonClass}
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className={primaryButtonClass}
          >
            保存
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="border-t border-zinc-200 dark:border-zinc-800">
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex w-full items-center gap-3 py-2 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900"
      >
        <span className="w-16 shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
          {record.dateLabel}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-zinc-900 dark:text-zinc-50">
            {record.description}
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {record.category}
            {record.paymentMethod ? ` ・ ${record.paymentMethod}` : ""}
            {record.source === "ai" ? " ・ AI" : ""}
          </span>
        </span>
        <span
          className={`shrink-0 text-sm font-medium tabular-nums ${
            record.type === "income"
              ? "text-green-700 dark:text-green-400"
              : "text-zinc-900 dark:text-zinc-50"
          }`}
        >
          {record.type === "income" ? "+" : "−"}
          {formatYen(record.amount)}
        </span>
      </button>
    </li>
  );
}

export function RecordList({ records }: { records: RecordView[] }) {
  if (records.length === 0) {
    return <p className={emptyClass}>この月の記録はありません。</p>;
  }
  return (
    <ul>
      {records.map((record) => (
        <RecordRow key={record.id} record={record} />
      ))}
    </ul>
  );
}
