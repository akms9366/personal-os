import Link from "next/link";
import { SpaceScaffold } from "@/components/layout/SpaceScaffold";
import { CsvLink } from "@/components/ui/CsvLink";
import {
  cardClass,
  eyebrowClass,
  ghostButtonClass,
  metaClass,
  noticeClass,
  sectionTitleClass,
} from "@/components/ui/styles";
import { getSpace } from "@/lib/navigation/spaces";
import { listFinanceRecordsByMonth } from "@/lib/db/finance";
import { formatYen, isFinanceType, summarize } from "@/lib/domain/finance";
import { currentMonthJst, formatDateLabel, todayJst } from "@/lib/time/jst";
import { getSettings } from "@/lib/settings/store";
import { FinanceCapture } from "./FinanceCapture";
import { RecordList } from "./RecordList";

// Finance 空間（05 §7）。AI で収支の下書きを作り、利用者が確認して保存する。
const space = getSpace("finance")!;

export const dynamic = "force-dynamic";

function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, m - 1 + delta, 1));
  return date.toISOString().slice(0, 7);
}

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const month =
    params.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month)
      ? params.month
      : currentMonthJst();
  const [records, settings] = await Promise.all([
    listFinanceRecordsByMonth(month),
    getSettings(),
  ]);
  const summary = summarize(records);
  const maxCategory = summary.expenseByCategory[0]?.amount ?? 0;
  const [year, monthNumber] = month.split("-").map(Number);

  return (
    <SpaceScaffold space={space}>
      <div className="flex flex-col gap-14">
        <section className={cardClass}>
          <h2 className={`mb-5 ${sectionTitleClass}`}>AI で記録</h2>
          {settings.aiApiKeyMasked ? null : (
            <p className={`mb-4 ${noticeClass}`}>
              AI を使うには{" "}
              <Link href="/settings" className="underline">
                Settings
              </Link>{" "}
              で API キーを設定してください（手入力は今すぐ使えます）。
            </p>
          )}
          <FinanceCapture today={todayJst()} />
        </section>

        <section className="flex flex-col gap-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Link
                href={`/finance?month=${shiftMonth(month, -1)}`}
                className={`${ghostButtonClass} size-8 px-0`}
                aria-label="前の月"
              >
                ‹
              </Link>
              <h2 className={`${sectionTitleClass} px-1 tabular-nums`}>
                {year}年{monthNumber}月
              </h2>
              <Link
                href={`/finance?month=${shiftMonth(month, 1)}`}
                className={`${ghostButtonClass} size-8 px-0`}
                aria-label="次の月"
              >
                ›
              </Link>
            </div>
            <CsvLink kind="finance" label="全期間をCSV出力" />
          </div>

          <dl className="grid grid-cols-3 gap-4 rounded-2xl bg-cream p-5 sm:p-6">
            <Stat label="収入" value={formatYen(summary.income)} />
            <Stat label="支出" value={formatYen(summary.expense)} />
            <Stat
              label="収支"
              value={`${summary.balance < 0 ? "−" : ""}${formatYen(Math.abs(summary.balance))}`}
            />
          </dl>

          {summary.expenseByCategory.length > 0 ? (
            <div className="flex flex-col gap-3">
              <h3 className={eyebrowClass}>支出の内訳</h3>
              <ul className="flex flex-col gap-2">
                {summary.expenseByCategory.map((item) => (
                  <li
                    key={item.category}
                    className="grid grid-cols-[6rem_1fr_auto] items-center gap-3 text-sm"
                  >
                    <span className="truncate text-steel">{item.category}</span>
                    <span className="h-1.5 rounded-full bg-cream">
                      <span
                        className="block h-1.5 rounded-full bg-ink"
                        style={{
                          width: `${Math.max(2, (item.amount / maxCategory) * 100)}%`,
                        }}
                      />
                    </span>
                    <span className="text-right text-ink tabular-nums">
                      {formatYen(item.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <RecordList
            records={records.map((record) => ({
              id: record.id,
              date: record.date,
              dateLabel: formatDateLabel(record.date),
              type: isFinanceType(record.type) ? record.type : "expense",
              amount: record.amount,
              category: record.category,
              description: record.description,
              paymentMethod: record.paymentMethod ?? "",
              memo: record.memo ?? "",
              source: record.source,
            }))}
          />
        </section>
      </div>
    </SpaceScaffold>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <dt className={metaClass}>{label}</dt>
      <dd className="truncate text-lg leading-none font-normal tracking-[-0.025em] text-ink tabular-nums sm:text-3xl">
        {value}
      </dd>
    </div>
  );
}
