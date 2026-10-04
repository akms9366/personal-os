import Link from "next/link";
import { SpaceScaffold } from "@/components/layout/SpaceScaffold";
import { CsvLink } from "@/components/ui/CsvLink";
import {
  cardClass,
  emptyClass,
  sectionTitleClass,
} from "@/components/ui/styles";
import { getSpace } from "@/lib/navigation/spaces";
import { listHospitals } from "@/lib/db/hospital";
import { formatDateLabel } from "@/lib/time/jst";
import { KnowledgeTabs } from "../KnowledgeTabs";
import { HospitalForm } from "./HospitalForm";

const space = getSpace("knowledge")!;

export const dynamic = "force-dynamic";

export default async function HospitalListPage() {
  const hospitals = await listHospitals();

  return (
    <SpaceScaffold space={space}>
      <KnowledgeTabs />
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className={sectionTitleClass}>通院先</h2>
            <CsvLink kind="hospital" label="診察記録をCSV出力" />
          </div>
          {hospitals.length === 0 ? (
            <p className={emptyClass}>
              通院先はまだありません。下から追加できます。
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {hospitals.map((hospital) => {
                const last = hospital.visits[0];
                return (
                  <li key={hospital.id}>
                    <Link
                      href={`/knowledge/hospital/${hospital.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-4 py-3 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {hospital.name}
                          {hospital.department ? (
                            <span className="ml-2 text-xs font-normal text-zinc-500">
                              {hospital.department}
                            </span>
                          ) : null}
                        </span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {last
                            ? `最終受診 ${formatDateLabel(last.visitDate)}`
                            : "受診記録なし"}
                          {last?.nextVisit
                            ? ` ・ 次回 ${formatDateLabel(last.nextVisit)}`
                            : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-zinc-400">
                        {hospital._count.visits}件 ›
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className={cardClass}>
          <h2 className={`mb-3 ${sectionTitleClass}`}>通院先を追加</h2>
          <HospitalForm />
        </section>
      </div>
    </SpaceScaffold>
  );
}
