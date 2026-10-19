import Link from "next/link";
import { SpaceScaffold } from "@/components/layout/SpaceScaffold";
import { CsvLink } from "@/components/ui/CsvLink";
import {
  emptyClass,
  eyebrowClass,
  listCardClass,
  listRowClass,
  sectionTitleClass,
} from "@/components/ui/styles";
import { getSpace } from "@/lib/navigation/spaces";
import {
  listRecentAttempts,
  listStudySessions,
  parseStringList,
} from "@/lib/db/study";
import { percent } from "@/lib/study/analysis";
import { DRILL_MODE_LABELS, isDrillMode } from "@/lib/study/drill";
import { categoryLabel, DEFAULT_EXAM_ID, getExam } from "@/lib/study/exams";
import { CHOICE_LABELS } from "@/lib/study/types";
import { formatDateTimeJst } from "../format";
import { StudyTabs } from "../StudyTabs";
import { DeleteSessionButton } from "./DeleteSessionButton";

const space = getSpace("study")!;

export const dynamic = "force-dynamic";

const RECENT_ATTEMPTS = 50;

export default async function StudyHistoryPage() {
  const exam = getExam(DEFAULT_EXAM_ID)!;
  const [sessions, attempts] = await Promise.all([
    listStudySessions(exam.id),
    listRecentAttempts(exam.id, { take: RECENT_ATTEMPTS }),
  ]);

  return (
    <SpaceScaffold space={space}>
      <StudyTabs />
      <div className="flex flex-col gap-12">
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className={sectionTitleClass}>ドリル</h2>
            <CsvLink kind="study" label="解答記録CSV" />
          </div>
          {sessions.length === 0 ? (
            <p className={emptyClass}>まだドリルの記録がありません。</p>
          ) : (
            <ul className={listCardClass}>
              {sessions.map((session) => {
                const total = parseStringList(session.questionIds).length;
                const answered = session.attempts.length;
                const correct = session.attempts.filter(
                  (a) => a.isCorrect,
                ).length;
                const categories = parseStringList(session.categories);
                const when = formatDateTimeJst(session.startedAt);
                return (
                  <li
                    key={session.id}
                    className={`${listRowClass} flex items-center gap-3`}
                  >
                    <Link
                      href={`/study/drill/${session.id}`}
                      className="flex min-w-0 flex-1 flex-col gap-1"
                    >
                      <span className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-ink tabular-nums">
                          {correct} / {answered}
                        </span>
                        <span className="font-mono text-xs text-fog">
                          {percent(answered ? correct / answered : null)}
                        </span>
                        {session.finishedAt ? null : (
                          <span className="text-xs text-danger">
                            途中（{answered}/{total}）· 続きから
                          </span>
                        )}
                      </span>
                      <span className={`truncate ${eyebrowClass}`}>
                        {when} ·{" "}
                        {isDrillMode(session.mode)
                          ? DRILL_MODE_LABELS[session.mode]
                          : session.mode}{" "}
                        ·{" "}
                        {categories.length > 0
                          ? categories
                              .map((c) => categoryLabel(exam, c))
                              .join("、")
                          : "全分野"}
                      </span>
                    </Link>
                    <DeleteSessionButton id={session.id} label={when} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className={sectionTitleClass}>最近の解答</h2>
            <p className={eyebrowClass}>直近 {RECENT_ATTEMPTS} 件</p>
          </div>
          {attempts.length === 0 ? (
            <p className={emptyClass}>まだ解答の記録がありません。</p>
          ) : (
            <ul className={listCardClass}>
              {attempts.map((attempt) => {
                const choices = parseStringList(attempt.choices);
                return (
                  <li key={attempt.id} className={`${listRowClass} flex gap-3`}>
                    <span
                      aria-label={attempt.isCorrect ? "正解" : "不正解"}
                      className={`mt-0.5 w-4 shrink-0 text-center text-sm font-medium ${attempt.isCorrect ? "text-success" : "text-danger"}`}
                    >
                      {attempt.isCorrect ? "○" : "×"}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <p className="line-clamp-2 text-sm text-ink">
                        {attempt.stem}
                      </p>
                      <p className="text-xs text-steel">
                        解答 {CHOICE_LABELS[attempt.selectedIndex]}{" "}
                        {choices[attempt.selectedIndex]}
                        {attempt.isCorrect ? null : (
                          <>
                            {" "}
                            / 正答 {CHOICE_LABELS[attempt.correctIndex]}{" "}
                            {choices[attempt.correctIndex]}
                          </>
                        )}
                      </p>
                      <p className={eyebrowClass}>
                        {formatDateTimeJst(attempt.answeredAt)} ·{" "}
                        {categoryLabel(exam, attempt.category)} ·{" "}
                        {attempt.topic}
                        {attempt.unsure ? " · 自信なし" : ""}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </SpaceScaffold>
  );
}
