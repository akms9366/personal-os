import { MASTERY_LABELS, type Mastery } from "@/lib/study/drill";
import {
  percent,
  TARGET_ACCURACY,
  type CategoryReport,
} from "@/lib/study/analysis";
import { StartDrillButton } from "../StartDrillButton";

// 分野ごとの習熟度（問題数の内訳）を横積みの棒で示す。
// 色は状態を表す: 定着=Ink / あやふや=Pewter / 要復習=Danger / 未挑戦=Dove。凡例と数値を必ず添える。

const ORDER: Mastery[] = ["mastered", "shaky", "wrong", "new"];

const SWATCH: Record<Mastery, string> = {
  mastered: "bg-ink",
  shaky: "bg-pewter",
  wrong: "bg-danger",
  new: "bg-dove",
};

export function MasteryLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
      {ORDER.map((m) => (
        <li key={m} className="flex items-center gap-1.5 text-xs text-steel">
          <span aria-hidden className={`size-2.5 rounded-full ${SWATCH[m]}`} />
          {MASTERY_LABELS[m]}
        </li>
      ))}
    </ul>
  );
}

export function MasteryBars({
  exam,
  categories,
}: {
  exam: string;
  categories: CategoryReport[];
}) {
  return (
    <ul className="flex flex-col gap-6">
      {categories.map((c) => {
        const belowTarget =
          c.accuracy !== null &&
          c.attempts >= 3 &&
          c.accuracy < TARGET_ACCURACY;
        return (
          <li key={c.category.id} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="text-sm font-medium text-ink">
                {c.category.label}
                {belowTarget ? (
                  <span className="ml-2 text-xs font-normal text-danger">
                    目標未達
                  </span>
                ) : null}
              </p>
              <p className="font-mono text-xs text-fog tabular-nums">
                正答率 {percent(c.accuracy)}
                <span className="text-pewter">
                  {" "}
                  · 直近 {percent(c.recentAccuracy)} · {c.attempts} 解答
                </span>
              </p>
            </div>
            <div
              className="flex h-2.5 gap-0.5 overflow-hidden rounded-full"
              role="img"
              aria-label={ORDER.map(
                (m) => `${MASTERY_LABELS[m]} ${c.mastery[m]}問`,
              ).join("、")}
            >
              {ORDER.filter((m) => c.mastery[m] > 0).map((m) => (
                <span
                  key={m}
                  title={`${MASTERY_LABELS[m]} ${c.mastery[m]} / ${c.questionCount} 問`}
                  className={`h-full first:rounded-l-full last:rounded-r-full ${SWATCH[m]}`}
                  style={{ flexGrow: c.mastery[m], flexBasis: 0 }}
                />
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-[11px] text-pewter tabular-nums">
                {ORDER.map((m) => `${MASTERY_LABELS[m]} ${c.mastery[m]}`).join(
                  " / ",
                )}
              </p>
              {c.mastery.new + c.mastery.wrong + c.mastery.shaky > 0 ? (
                <StartDrillButton
                  exam={exam}
                  mode={c.attempts === 0 ? "unanswered" : "weak"}
                  categories={[c.category.id]}
                  label="この分野を解く"
                />
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
