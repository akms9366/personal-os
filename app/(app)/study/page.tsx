import Link from "next/link";
import { SpaceScaffold } from "@/components/layout/SpaceScaffold";
import {
  cardClass,
  eyebrowClass,
  noticeClass,
  sectionTitleClass,
} from "@/components/ui/styles";
import { getSpace } from "@/lib/navigation/spaces";
import {
  findUnfinishedSession,
  listAttemptsForAnalysis,
  parseStringList,
} from "@/lib/db/study";
import { analyzeStudy, percent } from "@/lib/study/analysis";
import { QUESTION_COUNTS, SELECTABLE_MODES } from "@/lib/study/drill";
import { DEFAULT_EXAM_ID, getExam } from "@/lib/study/exams";
import { StartDrillButton } from "./StartDrillButton";
import { StartDrillForm } from "./StartDrillForm";
import { StatTiles } from "./StatTiles";
import { StudyTabs } from "./StudyTabs";

const space = getSpace("study")!;

// 解答記録を毎回読むため静的化しない。
export const dynamic = "force-dynamic";

export default async function StudyPage() {
  const exam = getExam(DEFAULT_EXAM_ID)!;
  const [attempts, unfinished] = await Promise.all([
    listAttemptsForAnalysis(exam.id),
    findUnfinishedSession(exam.id),
  ]);
  const report = analyzeStudy(exam, attempts);
  const next = report.recommendations[0];

  return (
    <SpaceScaffold space={space}>
      <StudyTabs />
      <div className="flex flex-col gap-12">
        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <p className={eyebrowClass}>{exam.shortName}</p>
            <h2 className={sectionTitleClass}>{exam.name}</h2>
            <p className="text-sm leading-relaxed text-fog">{exam.summary}</p>
          </div>
          <StatTiles
            tiles={[
              { label: "解答数", value: String(report.attempts), sub: "問" },
              { label: "正答率", value: percent(report.accuracy) },
              {
                label: "挑戦済み",
                value: String(report.questionsAttempted),
                sub: `/ ${report.questionCount}`,
              },
              {
                label: "直近7日",
                value: String(report.last7DaysAttempts),
                sub: "問",
              },
            ]}
          />
        </section>

        {unfinished ? (
          <div
            className={`${noticeClass} flex flex-wrap items-center justify-between gap-3`}
          >
            <span>
              途中のドリルがあります（
              {unfinished._count.attempts}/
              {parseStringList(unfinished.questionIds).length} 問）。
            </span>
            <Link
              href={`/study/drill/${unfinished.id}`}
              className="text-sm font-medium text-ink underline underline-offset-4"
            >
              続きから解く
            </Link>
          </div>
        ) : null}

        <section className={cardClass}>
          <h2 className={`mb-6 ${sectionTitleClass}`}>ドリルを始める</h2>
          <StartDrillForm
            exam={exam.id}
            categories={exam.categories.map((category) => ({
              id: category.id,
              label: category.label,
              questionCount: exam.questions.filter(
                (q) => q.category === category.id,
              ).length,
            }))}
            modes={SELECTABLE_MODES.map((m) => ({ ...m }))}
            counts={QUESTION_COUNTS}
          />
        </section>

        {next ? (
          <section className="flex flex-col gap-4">
            <div className="flex items-end justify-between gap-4">
              <h2 className={sectionTitleClass}>次に学ぶこと</h2>
              <Link
                href="/study/analysis"
                className="text-sm text-fog underline-offset-4 hover:text-ink hover:underline"
              >
                分析を見る
              </Link>
            </div>
            <div className="flex flex-col gap-3 rounded-2xl px-1">
              <p className="text-base font-medium text-ink">{next.title}</p>
              <p className="text-sm leading-relaxed text-steel">
                {next.detail}
              </p>
              {next.drill ? (
                <StartDrillButton
                  exam={exam.id}
                  mode={next.drill.mode}
                  categories={next.drill.categories}
                />
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </SpaceScaffold>
  );
}
