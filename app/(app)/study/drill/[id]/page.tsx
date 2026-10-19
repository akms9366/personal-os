import Link from "next/link";
import { notFound } from "next/navigation";
import { SpaceScaffold } from "@/components/layout/SpaceScaffold";
import {
  eyebrowClass,
  listCardClass,
  listRowClass,
  primaryButtonClass,
  secondaryButtonClass,
  sectionTitleClass,
} from "@/components/ui/styles";
import { getSpace } from "@/lib/navigation/spaces";
import { getStudySession, parseStringList } from "@/lib/db/study";
import { percent } from "@/lib/study/analysis";
import {
  arrangeChoices,
  DRILL_MODE_LABELS,
  isDrillMode,
} from "@/lib/study/drill";
import { categoryLabel, getExam, getQuestion } from "@/lib/study/exams";
import { CHOICE_LABELS } from "@/lib/study/types";
import { formatDateTimeJst } from "../../format";
import { retryDrillAction } from "../../actions";
import { DrillRunner } from "./DrillRunner";

const space = getSpace("study")!;

export const dynamic = "force-dynamic";

export default async function DrillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getStudySession(id);
  const exam = session ? getExam(session.exam) : undefined;
  if (!session || !exam) {
    notFound();
  }

  const answeredIds = new Set(session.attempts.map((a) => a.questionId));
  // 問題集から消えた問題は飛ばす（記録済みの解答は結果に残る）。
  const questionIds = parseStringList(session.questionIds).filter(
    (qid) => answeredIds.has(qid) || getQuestion(exam, qid),
  );
  const nextId = questionIds.find((qid) => !answeredIds.has(qid));
  const modeLabel = isDrillMode(session.mode)
    ? DRILL_MODE_LABELS[session.mode]
    : session.mode;

  if (nextId) {
    const question = getQuestion(exam, nextId)!;
    const arranged = arrangeChoices(question, session.id);
    return (
      <SpaceScaffold
        space={space}
        title="ドリル"
        description={`${exam.name} · ${modeLabel}`}
      >
        <DrillRunner
          key={nextId}
          question={{
            sessionId: session.id,
            questionId: question.id,
            position: answeredIds.size + 1,
            total: questionIds.length,
            categoryLabel: categoryLabel(exam, question.category),
            topic: question.topic,
            stem: question.stem,
            choices: arranged.choices,
          }}
        />
      </SpaceScaffold>
    );
  }

  // ---- 結果 ----
  const attempts = session.attempts;
  const correct = attempts.filter((a) => a.isCorrect).length;
  const retryCount = attempts.filter((a) => !a.isCorrect || a.unsure).length;
  const retry = retryDrillAction.bind(null, session.id);

  return (
    <SpaceScaffold
      space={space}
      title="結果"
      description={`${exam.name} · ${modeLabel} · ${formatDateTimeJst(session.startedAt)}`}
    >
      <div className="flex flex-col gap-12">
        <section className="flex flex-col gap-6">
          <p className="flex items-baseline gap-3">
            <span className="text-6xl leading-none font-normal tracking-[-0.025em] text-ink tabular-nums">
              {correct}
              <span className="text-2xl text-fog"> / {attempts.length}</span>
            </span>
            <span className="font-mono text-sm text-fog">
              正答率{" "}
              {percent(attempts.length ? correct / attempts.length : null)}
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            {retryCount > 0 ? (
              <form action={retry}>
                <button type="submit" className={primaryButtonClass}>
                  間違えた・自信なしの {retryCount} 問を解き直す
                </button>
              </form>
            ) : null}
            <Link href="/study" className={secondaryButtonClass}>
              新しいドリル
            </Link>
            <Link href="/study/analysis" className={secondaryButtonClass}>
              分析を見る
            </Link>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className={sectionTitleClass}>解答の振り返り</h2>
          <ol className={listCardClass}>
            {attempts.map((attempt, index) => {
              const choices = parseStringList(attempt.choices);
              return (
                <li key={attempt.id} className={listRowClass}>
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-start gap-3">
                      <span
                        aria-label={attempt.isCorrect ? "正解" : "不正解"}
                        className={`mt-0.5 w-4 shrink-0 text-center text-sm font-medium ${attempt.isCorrect ? "text-success" : "text-danger"}`}
                      >
                        {attempt.isCorrect ? "○" : "×"}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className={eyebrowClass}>
                          {index + 1}. {categoryLabel(exam, attempt.category)} ·{" "}
                          {attempt.topic}
                          {attempt.unsure ? " · 自信なし" : ""}
                        </span>
                        <span className="line-clamp-2 text-sm text-ink group-open:line-clamp-none">
                          {attempt.stem}
                        </span>
                      </span>
                    </summary>
                    <div className="mt-3 ml-7 flex flex-col gap-3">
                      <ol className="flex flex-col gap-1 text-sm">
                        {choices.map((choice, i) => (
                          <li
                            key={i}
                            className={
                              i === attempt.correctIndex
                                ? "font-medium text-success"
                                : i === attempt.selectedIndex
                                  ? "text-danger"
                                  : "text-steel"
                            }
                          >
                            {CHOICE_LABELS[i]}　{choice}
                            {i === attempt.correctIndex ? "（正答）" : ""}
                            {i === attempt.selectedIndex && !attempt.isCorrect
                              ? "（あなたの解答）"
                              : ""}
                          </li>
                        ))}
                      </ol>
                      <p className="rounded-xl bg-paper px-3.5 py-3 text-sm leading-relaxed text-ink">
                        {attempt.explanation}
                      </p>
                    </div>
                  </details>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </SpaceScaffold>
  );
}
