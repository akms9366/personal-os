"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteWeightAction } from "./actions";
import { dangerButtonClass, emptyClass } from "@/components/ui/styles";

export interface WeightRow {
  id: string;
  label: string;
  weightKg: number;
  diff: number | null;
  bodyFatPct: number | null;
  note: string | null;
}

function Row({ row }: { row: WeightRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm(`${row.label} の記録を削除しますか？`)) {
      return;
    }
    startTransition(async () => {
      await deleteWeightAction(row.id);
      router.refresh();
    });
  }

  return (
    <tr className="border-t border-zinc-200 dark:border-zinc-800">
      <td className="py-2 pr-3 whitespace-nowrap text-zinc-600 dark:text-zinc-400">
        {row.label}
      </td>
      <td className="py-2 pr-3 text-right font-medium whitespace-nowrap tabular-nums">
        {row.weightKg.toFixed(1)} kg
      </td>
      <td className="py-2 pr-3 text-right whitespace-nowrap text-zinc-500 tabular-nums">
        {row.diff === null
          ? ""
          : `${row.diff > 0 ? "+" : row.diff < 0 ? "−" : "±"}${Math.abs(row.diff).toFixed(1)}`}
      </td>
      <td className="py-2 pr-3 text-right whitespace-nowrap text-zinc-500 tabular-nums">
        {row.bodyFatPct === null ? "" : `${row.bodyFatPct.toFixed(1)}%`}
      </td>
      <td className="py-2 pr-3 text-zinc-500">{row.note}</td>
      <td className="py-2 text-right">
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          className={dangerButtonClass}
        >
          削除
        </button>
      </td>
    </tr>
  );
}

export function WeightList({ rows }: { rows: WeightRow[] }) {
  if (rows.length === 0) {
    return <p className={emptyClass}>体重の記録はまだありません。</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-zinc-900 dark:text-zinc-100">
        <thead>
          <tr className="text-left text-xs text-zinc-500 dark:text-zinc-400">
            <th className="pb-1 font-medium">日付</th>
            <th className="pb-1 text-right font-medium">体重</th>
            <th className="pb-1 text-right font-medium">前回比</th>
            <th className="pb-1 text-right font-medium">体脂肪</th>
            <th className="pb-1 font-medium">メモ</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <Row key={row.id} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
