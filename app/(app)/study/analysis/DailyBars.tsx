import type { DailyCount } from "@/lib/study/analysis";
import { formatDateLabel } from "@/lib/time/jst";

// 直近 14 日の解答数（棒の高さ）。棒にカーソルを合わせると日付・解答数・正答数が出る。
export function DailyBars({ daily }: { daily: DailyCount[] }) {
  const max = Math.max(1, ...daily.map((d) => d.attempts));
  return (
    <figure className="flex flex-col gap-2">
      <div className="flex h-24 items-end gap-0.5">
        {daily.map((day) => (
          <div
            key={day.date}
            className="group relative flex h-full flex-1 items-end"
            title={`${formatDateLabel(day.date)}: ${day.attempts} 問（正答 ${day.correct}）`}
          >
            <div
              className={`w-full rounded-t ${day.attempts > 0 ? "bg-ink group-hover:bg-slate" : "bg-dove/60"}`}
              style={{
                height:
                  day.attempts > 0 ? `${(day.attempts / max) * 100}%` : "2px",
              }}
            />
          </div>
        ))}
      </div>
      <figcaption className="flex justify-between font-mono text-[11px] text-pewter">
        <span>{formatDateLabel(daily[0].date)}</span>
        <span>最大 {max} 問/日</span>
        <span>{formatDateLabel(daily[daily.length - 1].date)}</span>
      </figcaption>
    </figure>
  );
}
