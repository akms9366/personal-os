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
    <tr className="border-t border-dove/60">
      <td className="py-2.5 pr-3 pl-4 font-mono text-xs whitespace-nowrap text-fog sm:pl-5">
        {row.label}
      </td>
      <td className="py-2.5 pr-3 text-right font-medium whitespace-nowrap tabular-nums">
        {row.weightKg.toFixed(1)} kg
      </td>
      <td className="py-2.5 pr-3 text-right whitespace-nowrap text-fog tabular-nums">
        {row.diff === null
          ? ""
          : `${row.diff > 0 ? "+" : row.diff < 0 ? "−" : "±"}${Math.abs(row.diff).toFixed(1)}`}
      </td>
      <td className="py-2.5 pr-3 text-right whitespace-nowrap text-fog tabular-nums">
        {row.bodyFatPct === null ? "" : `${row.bodyFatPct.toFixed(1)}%`}
      </td>
      <td className="py-2.5 pr-3 text-fog">{row.note}</td>
      <td className="py-1.5 pr-2 text-right">
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
    <div className="overflow-x-auto rounded-2xl bg-cream">
      <table className="w-full text-sm text-ink">
        <thead>
          <tr className="text-left font-mono text-[11px] text-pewter">
            <th className="pt-3 pb-2 pl-4 font-normal sm:pl-5">日付</th>
            <th className="pt-3 pb-2 text-right font-normal">体重</th>
            <th className="pt-3 pb-2 text-right font-normal">前回比</th>
            <th className="pt-3 pb-2 text-right font-normal">体脂肪</th>
            <th className="pt-3 pb-2 font-normal">メモ</th>
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
