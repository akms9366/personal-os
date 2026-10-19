import { SpaceScaffold } from "@/components/layout/SpaceScaffold";
import {
  eyebrowClass,
  listCardClass,
  listRowClass,
  sectionTitleClass,
} from "@/components/ui/styles";
import { isAiConfigured } from "@/lib/ai/client";
import { parseStudyAdviceBody } from "@/lib/ai/study";
import { getSpace } from "@/lib/navigation/spaces";
import { getLatestStudyAdvice, listAttemptsForAnalysis } from "@/lib/db/study";
import { analyzeStudy, percent, TARGET_ACCURACY } from "@/lib/study/analysis";
import { categoryLabel, DEFAULT_EXAM_ID, getExam } from "@/lib/study/exams";
import { formatDateTimeJst } from "../format";
import { StartDrillButton } from "../StartDrillButton";
import { StatTiles } from "../StatTiles";
import { StudyTabs } from "../StudyTabs";
import { AdvicePanel } from "./AdvicePanel";
import { DailyBars } from "./DailyBars";
import { MasteryBars, MasteryLegend } from "./MasteryBars";

const space = getSpace("study")!;

export const dynamic = "force-dynamic";

export default async function StudyAnalysisPage() {
  const exam = getExam(DEFAULT_EXAM_ID)!;
  const [attempts, latestAdvice, aiConfigured] = await Promise.all([
    listAttemptsForAnalysis(exam.id),
    getLatestStudyAdvice(exam.id),
    isAiConfigured(),
  ]);
  const report = analyzeStudy(exam, attempts);
  const adviceBody = latestAdvice
    ? parseStudyAdviceBody(latestAdvice.body)
    : null;

  return (
    <SpaceScaffold space={space}>
      <StudyTabs />
      <div className="flex flex-col gap-14">
        <StatTiles
          tiles={[
            { label: "解答数", value: String(report.attempts), sub: "問" },
            { label: "正答率", value: percent(report.accuracy) },
            {
              label: "挑戦済み",
              value: String(report.questionsAttempted),
              sub: `/ ${report.questionCount}`,
            },
            { label: "学習日数", value: String(report.studyDays), sub: "日" },
          ]}
        />

        <section className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <h2 className={sectionTitleClass}>次に学ぶこと</h2>
            <p className={eyebrowClass}>
              解答記録から自動で提案 · 分野の目標正答率{" "}
              {percent(TARGET_ACCURACY)}
            </p>
          </div>
          <ol className={listCardClass}>
            {report.recommendations.map((rec, i) => (
              <li
                key={i}
                className={`${listRowClass} flex flex-col gap-2 py-4`}
              >
                <p className="text-sm font-medium text-ink">
                  <span className="mr-2 font-mono text-xs text-pewter">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {rec.title}
                </p>
                <p className="text-sm leading-relaxed text-steel">
                  {rec.detail}
                </p>
                {rec.drill ? (
                  <StartDrillButton
                    exam={exam.id}
                    mode={rec.drill.mode}
                    categories={rec.drill.categories}
                  />
                ) : null}
              </li>
            ))}
          </ol>
        </section>

        <section className="flex flex-col gap-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h2 className={sectionTitleClass}>分野別の習熟度</h2>
              <p className={eyebrowClass}>問題ごとの直近の解答で判定</p>
            </div>
            <MasteryLegend />
          </div>
          <MasteryBars exam={exam.id} categories={report.categories} />
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className={sectionTitleClass}>苦手な論点</h2>
            <p className={eyebrowClass}>間違えた回数の多い順</p>
          </div>
          {report.weakTopics.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className={`text-left ${eyebrowClass}`}>
                  <th className="pb-2 font-normal">論点</th>
                  <th className="pb-2 text-right font-normal">誤答</th>
                  <th className="pb-2 text-right font-normal">正答率</th>
                </tr>
              </thead>
              <tbody>
                {report.weakTopics.map((t) => (
                  <tr
                    key={`${t.categoryId}:${t.topic}`}
                    className="border-t border-dove/60"
                  >
                    <td className="py-2.5 pr-3">
                      <span className="text-ink">{t.topic}</span>
                      <span className="ml-2 text-xs text-fog">
                        {categoryLabel(exam, t.categoryId)}
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-danger tabular-nums">
                      {t.wrong}
                    </td>
                    <td className="py-2.5 text-right text-fog tabular-nums">
                      {percent(t.accuracy)}
                      <span className="text-pewter">（{t.attempts}）</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-fog">
              {report.attempts === 0
                ? "まだ解答の記録がありません。"
                : "間違えた論点はまだありません。"}
            </p>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className={sectionTitleClass}>学習のペース</h2>
            <p className={eyebrowClass}>
              直近14日の解答数 · 直近7日 {report.last7DaysAttempts} 問
            </p>
          </div>
          <DailyBars daily={report.daily} />
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className={sectionTitleClass}>AI の学習アドバイス</h2>
            <p className={eyebrowClass}>
              誤答の傾向から、混同している用語や学び方を提案します
            </p>
          </div>
          <AdvicePanel
            exam={exam.id}
            aiConfigured={aiConfigured}
            attemptCount={report.attempts}
            advice={
              latestAdvice && adviceBody
                ? {
                    body: adviceBody,
                    createdAt: formatDateTimeJst(latestAdvice.createdAt),
                    attemptCount: latestAdvice.attemptCount,
                    model: latestAdvice.model,
                  }
                : null
            }
          />
        </section>
      </div>
    </SpaceScaffold>
  );
}
