import { toJstDateString } from "@/lib/time/jst";
import {
  buildQuestionStats,
  masteryOf,
  type DrillMode,
  type Mastery,
} from "./drill";
import type { StudyCategory, StudyExam } from "./types";

// 解答記録から弱点を分析する（純粋関数）。何をどう学ぶかの提案は規則で作り、
// 最終的に何をやるかは利用者が決める（提案ボタンからドリルを始められるだけ）。

/// 合格ライン（600/1000 点）に余裕を持たせた、分野ごとの目標正答率。
export const TARGET_ACCURACY = 0.7;

/// 分野の正答率を「弱い」と判断するのに必要な最低解答数（少なすぎる記録で決めつけない）。
const MIN_ATTEMPTS_FOR_JUDGEMENT = 3;

/// 「直近」の正答率に使う解答数。
const RECENT_WINDOW = 10;

export interface AnalysisAttempt {
  questionId: string;
  category: string;
  topic: string;
  isCorrect: boolean;
  unsure: boolean;
  answeredAt: Date;
}

export interface CategoryReport {
  category: StudyCategory;
  questionCount: number;
  attempted: number;
  attempts: number;
  correct: number;
  /// 通算の正答率（解答なしは null）。
  accuracy: number | null;
  /// 直近 RECENT_WINDOW 回の正答率（解答なしは null）。
  recentAccuracy: number | null;
  /// 問題ごとの習熟度の内訳（問題集の問題数の内訳）。
  mastery: Record<Mastery, number>;
}

export interface TopicReport {
  topic: string;
  categoryId: string;
  attempts: number;
  wrong: number;
  accuracy: number;
}

export interface Recommendation {
  title: string;
  detail: string;
  /// この提案に沿ってドリルを始めるときの条件（無ければボタンを出さない）。
  drill?: { mode: Exclude<DrillMode, "retry">; categories: string[] };
}

export interface DailyCount {
  date: string;
  attempts: number;
  correct: number;
}

export interface StudyReport {
  attempts: number;
  correct: number;
  accuracy: number | null;
  questionCount: number;
  questionsAttempted: number;
  studyDays: number;
  last7DaysAttempts: number;
  categories: CategoryReport[];
  weakTopics: TopicReport[];
  /// 直近で不正解・自信なしだった問題の ID（復習の対象）。
  reviewQuestionIds: string[];
  recommendations: Recommendation[];
  daily: DailyCount[];
}

function ratio(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}

export function percent(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/// ベイズ平滑化した正答率（解答数が少ないときに 0% / 100% と決めつけない）。
function smoothedAccuracy(correct: number, attempts: number): number {
  return (correct + 1) / (attempts + 2);
}

export function analyzeStudy(
  exam: StudyExam,
  attempts: readonly AnalysisAttempt[],
  now: Date = new Date(),
): StudyReport {
  const stats = buildQuestionStats(attempts);
  const bankIds = new Set(exam.questions.map((q) => q.id));

  // ---- 分野別 ----
  const categories: CategoryReport[] = exam.categories.map((category) => {
    const questions = exam.questions.filter((q) => q.category === category.id);
    const categoryAttempts = attempts
      .filter((a) => a.category === category.id)
      .sort((a, b) => a.answeredAt.getTime() - b.answeredAt.getTime());
    const correct = categoryAttempts.filter((a) => a.isCorrect).length;
    const recent = categoryAttempts.slice(-RECENT_WINDOW);
    const mastery: Record<Mastery, number> = {
      mastered: 0,
      shaky: 0,
      wrong: 0,
      new: 0,
    };
    for (const question of questions) {
      mastery[masteryOf(stats.get(question.id))] += 1;
    }
    return {
      category,
      questionCount: questions.length,
      attempted: questions.length - mastery.new,
      attempts: categoryAttempts.length,
      correct,
      accuracy: ratio(correct, categoryAttempts.length),
      recentAccuracy: ratio(
        recent.filter((a) => a.isCorrect).length,
        recent.length,
      ),
      mastery,
    };
  });

  // ---- トピック別（間違えたことのあるトピック） ----
  const topicMap = new Map<string, TopicReport>();
  for (const attempt of attempts) {
    const key = `${attempt.category}:${attempt.topic}`;
    const topic = topicMap.get(key) ?? {
      topic: attempt.topic,
      categoryId: attempt.category,
      attempts: 0,
      wrong: 0,
      accuracy: 0,
    };
    topic.attempts += 1;
    topic.wrong += attempt.isCorrect ? 0 : 1;
    topicMap.set(key, topic);
  }
  const weakTopics = [...topicMap.values()]
    .map((t) => ({ ...t, accuracy: (t.attempts - t.wrong) / t.attempts }))
    .filter((t) => t.wrong > 0)
    .sort((a, b) => b.wrong - a.wrong || a.accuracy - b.accuracy)
    .slice(0, 8);

  // ---- 復習対象（問題集に今もある問題だけ） ----
  const reviewQuestionIds = [...stats.entries()]
    .filter(([id, stat]) => {
      const mastery = masteryOf(stat);
      return bankIds.has(id) && (mastery === "wrong" || mastery === "shaky");
    })
    .sort(
      ([, a], [, b]) => b.lastAnsweredAt.getTime() - a.lastAnsweredAt.getTime(),
    )
    .map(([id]) => id);

  // ---- 日別（直近 14 日、JST） ----
  const today = toJstDateString(now);
  const dayCounts = new Map<string, DailyCount>();
  for (let i = 13; i >= 0; i -= 1) {
    const date = addDays(today, -i);
    dayCounts.set(date, { date, attempts: 0, correct: 0 });
  }
  const studyDates = new Set<string>();
  for (const attempt of attempts) {
    const date = toJstDateString(attempt.answeredAt);
    studyDates.add(date);
    const day = dayCounts.get(date);
    if (day) {
      day.attempts += 1;
      day.correct += attempt.isCorrect ? 1 : 0;
    }
  }
  const daily = [...dayCounts.values()];
  const last7DaysAttempts = daily
    .slice(-7)
    .reduce((sum, day) => sum + day.attempts, 0);

  const correct = attempts.filter((a) => a.isCorrect).length;
  const questionsAttempted = exam.questions.filter((q) =>
    stats.has(q.id),
  ).length;

  const report: StudyReport = {
    attempts: attempts.length,
    correct,
    accuracy: ratio(correct, attempts.length),
    questionCount: exam.questions.length,
    questionsAttempted,
    studyDays: studyDates.size,
    last7DaysAttempts,
    categories,
    weakTopics,
    reviewQuestionIds,
    recommendations: [],
    daily,
  };
  report.recommendations = buildRecommendations(report);
  return report;
}

/// 分析結果から「次に何を学ぶか」の提案を、優先度の高い順に作る。
export function buildRecommendations(report: StudyReport): Recommendation[] {
  if (report.attempts === 0) {
    return [
      {
        title: "まずは全分野から 10 問解いてみる",
        detail:
          "解答の記録がたまると、分野ごとの正答率から苦手な分野と論点をここに表示します。",
        drill: { mode: "random", categories: [] },
      },
    ];
  }

  const recommendations: Recommendation[] = [];

  // 1. 目標に届いていない分野（平滑化した正答率の低い順に最大3つ）。
  const weak = report.categories
    .filter(
      (c) =>
        c.attempts >= MIN_ATTEMPTS_FOR_JUDGEMENT &&
        (c.accuracy ?? 0) < TARGET_ACCURACY,
    )
    .sort(
      (a, b) =>
        smoothedAccuracy(a.correct, a.attempts) -
        smoothedAccuracy(b.correct, b.attempts),
    )
    .slice(0, 3);
  for (const c of weak) {
    const topics = report.weakTopics
      .filter((t) => t.categoryId === c.category.id)
      .slice(0, 3)
      .map((t) => `「${t.topic}」`);
    recommendations.push({
      title: `「${c.category.label}」を重点的に復習する`,
      detail: [
        `正答率 ${percent(c.accuracy)}（${c.correct}/${c.attempts}）で、目標の ${percent(TARGET_ACCURACY)} に届いていません。`,
        topics.length > 0 ? `特に${topics.join("")}で間違えています。` : "",
        c.category.studyHint,
      ].join(""),
      drill: { mode: "weak", categories: [c.category.id] },
    });
  }

  // 2. 間違えた・自信なしの問題の解き直し。
  const wrongCount = report.categories.reduce((s, c) => s + c.mastery.wrong, 0);
  const shakyCount = report.categories.reduce((s, c) => s + c.mastery.shaky, 0);
  if (wrongCount + shakyCount > 0) {
    recommendations.push({
      title: `要復習・あやふやな ${wrongCount + shakyCount} 問を解き直す`,
      detail:
        shakyCount > 0
          ? `直近で不正解だった問題が ${wrongCount} 問、正解したものの自信がなかった問題が ${shakyCount} 問あります。正解の理由だけでなく、他の選択肢がなぜ誤りかまで説明できるようにしましょう。`
          : `直近で不正解だった問題が ${wrongCount} 問あります。解説を読んだ後、時間をおいてもう一度解くと定着しやすくなります。`,
      drill: { mode: "review", categories: [] },
    });
  }

  // 3. 未挑戦の分野。
  const untouched = report.categories.filter((c) => c.attempts === 0);
  if (untouched.length > 0) {
    recommendations.push({
      title: `未挑戦の分野に手を付ける（${untouched.length} 分野）`,
      detail: `${untouched.map((c) => `「${c.category.label}」`).join("")}はまだ解いていません。試験は全分野から出題されるため、まずひと通り解いて現状を把握しましょう。`,
      drill: {
        mode: "unanswered",
        categories: untouched.map((c) => c.category.id),
      },
    });
  } else if (report.questionsAttempted < report.questionCount) {
    // 4. 全分野に手は付けたが、まだ解いていない問題がある。
    recommendations.push({
      title: "まだ解いていない問題で範囲を広げる",
      detail: `全 ${report.questionCount} 問中 ${report.questionsAttempted} 問に挑戦済みです。未挑戦優先モードで残りの論点も確認しましょう。`,
      drill: { mode: "unanswered", categories: [] },
    });
  }

  // 5. 直近の勢いが落ちている。
  if (report.last7DaysAttempts === 0) {
    recommendations.push({
      title: "1日 10 問のペースを取り戻す",
      detail:
        "この1週間は解答の記録がありません。短時間でも毎日解くほうが、まとめて解くより記憶に残ります。",
      drill: { mode: "weak", categories: [] },
    });
  }

  // 6. 全分野が目標に届いている。
  const allOnTarget = report.categories.every(
    (c) =>
      c.attempts >= MIN_ATTEMPTS_FOR_JUDGEMENT &&
      (c.accuracy ?? 0) >= TARGET_ACCURACY,
  );
  if (allOnTarget) {
    recommendations.push({
      title: "全分野で目標正答率を超えています",
      detail:
        "この調子で、科目B（事例）のように状況から「最初にすべきこと」と「根本的な再発防止策」を選び分ける練習を続けましょう。IPA が公開している過去問題・サンプル問題で、本番と同じ分量・時間配分も確認しておくと安心です。",
      drill: { mode: "weak", categories: [] },
    });
  }

  return recommendations;
}
