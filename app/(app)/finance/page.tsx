import Link from "next/link";
import { SpaceScaffold } from "@/components/layout/SpaceScaffold";
import { CsvLink } from "@/components/ui/CsvLink";
import { cardClass, sectionTitleClass } from "@/components/ui/styles";
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
      <div className="flex flex-col gap-6">
        <section className={cardClass}>
          <h2 className={`mb-3 ${sectionTitleClass}`}>AI で記録</h2>
          {settings.aiApiKeyMasked ? null : (
            <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
              AI を使うには{" "}
              <Link href="/settings" className="underline">
                Settings
              </Link>{" "}
              で API キーを設定してください（手入力は今すぐ使えます）。
            </p>
          )}
          <FinanceCapture today={todayJst()} />
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Link
                href={`/finance?month=${shiftMonth(month, -1)}`}
                className="px-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                aria-label="前の月"
              >
                ‹
              </Link>
              <h2 className={sectionTitleClass}>
                {year}年{monthNumber}月
              </h2>
              <Link
                href={`/finance?month=${shiftMonth(month, 1)}`}
                className="px-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                aria-label="次の月"
              >
                ›
              </Link>
            </div>
            <CsvLink kind="finance" label="全期間をCSV出力" />
          </div>

          <dl className="grid grid-cols-3 gap-2">
            <Stat label="収入" value={formatYen(summary.income)} />
            <Stat label="支出" value={formatYen(summary.expense)} />
            <Stat
              label="収支"
              value={`${summary.balance < 0 ? "−" : ""}${formatYen(Math.abs(summary.balance))}`}
            />
          </dl>

          {summary.expenseByCategory.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                支出の内訳
              </h3>
              <ul className="flex flex-col gap-1.5">
                {summary.expenseByCategory.map((item) => (
                  <li
                    key={item.category}
                    className="grid grid-cols-[6rem_1fr_auto] items-center gap-2 text-sm"
                  >
                    <span className="truncate text-zinc-700 dark:text-zinc-300">
                      {item.category}
                    </span>
                    <span className="h-2 rounded-r-full bg-zinc-100 dark:bg-zinc-900">
                      <span
                        className="block h-2 rounded-r-full bg-zinc-700 dark:bg-zinc-300"
                        style={{
                          width: `${Math.max(2, (item.amount / maxCategory) * 100)}%`,
                        }}
                      />
                    </span>
                    <span className="text-right text-zinc-900 tabular-nums dark:text-zinc-100">
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
    <div className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
      <dt className="text-xs text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="text-base font-semibold text-zinc-900 tabular-nums sm:text-lg dark:text-zinc-50">
        {value}
      </dd>
    </div>
  );
}
