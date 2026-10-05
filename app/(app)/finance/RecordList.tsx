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
  aiBadgeClass,
  dangerButtonClass,
  emptyClass,
  errorTextClass,
  listCardClass,
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
      <li className="flex flex-col gap-3 px-4 py-4 sm:px-5">
        <DraftFields draft={draft} onChange={setDraft} />
        <div className="flex items-center justify-end gap-2">
          {error ? (
            <p className={`mr-auto ${errorTextClass}`}>{error}</p>
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
    <li>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="group flex w-full items-center gap-4 px-4 py-3.5 text-left sm:px-5"
      >
        <span className="w-14 shrink-0 font-mono text-[11px] text-fog">
          {record.dateLabel}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-ink group-hover:underline">
            {record.description}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-fog">
            {record.category}
            {record.paymentMethod ? ` · ${record.paymentMethod}` : ""}
            {record.source === "ai" ? (
              <span className={aiBadgeClass}>AI</span>
            ) : null}
          </span>
        </span>
        <span
          className={`shrink-0 text-sm font-medium tabular-nums ${
            record.type === "income" ? "text-success" : "text-ink"
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
    <ul className={listCardClass}>
      {records.map((record) => (
        <RecordRow key={record.id} record={record} />
      ))}
    </ul>
  );
}
