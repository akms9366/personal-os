import Link from "next/link";
import { notFound } from "next/navigation";
import { SpaceScaffold } from "@/components/layout/SpaceScaffold";
import { cardClass, sectionTitleClass } from "@/components/ui/styles";
import { getSpace } from "@/lib/navigation/spaces";
import { getHospitalWithVisits } from "@/lib/db/hospital";
import { formatDateLabel, todayJst } from "@/lib/time/jst";
import { KnowledgeTabs } from "../../KnowledgeTabs";
import { HospitalHeader } from "./HospitalHeader";
import { VisitForm } from "./VisitForm";
import { VisitList } from "./VisitList";

const space = getSpace("knowledge")!;

export const dynamic = "force-dynamic";

export default async function HospitalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const hospital = await getHospitalWithVisits(id);
  if (!hospital) {
    notFound();
  }

  return (
    <SpaceScaffold space={space}>
      <KnowledgeTabs />
      <div className="flex flex-col gap-6">
        <Link
          href="/knowledge/hospital"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          ‹ 通院先一覧
        </Link>

        <HospitalHeader
          visitCount={hospital.visits.length}
          hospital={{
            id: hospital.id,
            name: hospital.name,
            department: hospital.department ?? "",
            note: hospital.note ?? "",
          }}
        />

        <section className={cardClass}>
          <h3 className={`mb-3 ${sectionTitleClass}`}>診察記録を追加</h3>
          <VisitForm
            hospitalId={hospital.id}
            visit={{
              visitDate: todayJst(),
              condition: "",
              doctorNotes: "",
              prescription: "",
              nextVisit: "",
            }}
          />
        </section>

        <section className="flex flex-col gap-3">
          <h3 className={sectionTitleClass}>
            診察記録（{hospital.visits.length}件）
          </h3>
          <VisitList
            hospitalId={hospital.id}
            visits={hospital.visits.map((visit) => ({
              id: visit.id,
              visitDate: visit.visitDate,
              visitDateLabel: formatDateLabel(visit.visitDate),
              condition: visit.condition ?? "",
              doctorNotes: visit.doctorNotes ?? "",
              prescription: visit.prescription ?? "",
              nextVisit: visit.nextVisit ?? "",
              nextVisitLabel: visit.nextVisit
                ? formatDateLabel(visit.nextVisit)
                : null,
            }))}
          />
        </section>
      </div>
    </SpaceScaffold>
  );
}
