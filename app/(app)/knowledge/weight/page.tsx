import { SpaceScaffold } from "@/components/layout/SpaceScaffold";
import { CsvLink } from "@/components/ui/CsvLink";
import {
  cardClass,
  eyebrowClass,
  sectionTitleClass,
} from "@/components/ui/styles";
import { getSpace } from "@/lib/navigation/spaces";
import { listWeights } from "@/lib/db/weight";
import { formatDateLabel, todayJst } from "@/lib/time/jst";
import { KnowledgeTabs } from "../KnowledgeTabs";
import { WeightChart } from "./WeightChart";
import { WeightForm } from "./WeightForm";
import { WeightList } from "./WeightList";

const space = getSpace("knowledge")!;

export const dynamic = "force-dynamic";

const CHART_DAYS = 90;

export default async function WeightPage() {
  const records = await listWeights(); // 新しい順
  const latest = records[0];

  const since = new Date(`${todayJst()}T00:00:00Z`);
  since.setUTCDate(since.getUTCDate() - CHART_DAYS);
  const sinceDate = since.toISOString().slice(0, 10);
  const chartPoints = records
    .filter((record) => record.date >= sinceDate)
    .reverse()
    .map((record) => ({
      date: record.date,
      label: formatDateLabel(record.date),
      weightKg: record.weightKg,
    }));

  return (
    <SpaceScaffold space={space}>
      <KnowledgeTabs />
      <div className="flex flex-col gap-12">
        <section className={cardClass}>
          <h2 className={`mb-5 ${sectionTitleClass}`}>体重を記録</h2>
          <WeightForm today={todayJst()} />
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h2 className={sectionTitleClass}>体重の推移</h2>
              <p className={eyebrowClass}>直近{CHART_DAYS}日 · kg</p>
            </div>
            {latest ? (
              <p className="flex flex-col items-end gap-1">
                <span className={eyebrowClass}>最新</span>
                <span className="text-4xl leading-none font-normal tracking-[-0.025em] text-ink tabular-nums">
                  {latest.weightKg.toFixed(1)}
                  <span className="ml-1 text-sm tracking-normal text-fog">
                    kg
                  </span>
                </span>
              </p>
            ) : null}
          </div>
          <WeightChart points={chartPoints} />
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className={sectionTitleClass}>記録</h2>
            <CsvLink kind="weight" />
          </div>
          <WeightList
            rows={records.map((record, index) => {
              const previous = records[index + 1];
              return {
                id: record.id,
                label: formatDateLabel(record.date),
                weightKg: record.weightKg,
                diff: previous
                  ? Math.round((record.weightKg - previous.weightKg) * 10) / 10
                  : null,
                bodyFatPct: record.bodyFatPct,
                note: record.note,
              };
            })}
          />
        </section>
      </div>
    </SpaceScaffold>
  );
}
