"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { describeAiError } from "@/lib/ai/client";
import { generateStudyAdvice } from "@/lib/ai/study";
import {
  createStudySession,
  deleteStudySession,
  getStudySession,
  listAttemptsForAnalysis,
  listRecentAttempts,
  parseStringList,
  recordStudyAttempt,
  saveStudyAdvice,
} from "@/lib/db/study";
import { analyzeStudy } from "@/lib/study/analysis";
import {
  arrangeChoices,
  buildQuestionStats,
  isDrillMode,
  pickQuestions,
  QUESTION_COUNTS,
} from "@/lib/study/drill";
import { DEFAULT_EXAM_ID, getExam, getQuestion } from "@/lib/study/exams";

export interface StartDrillState {
  error?: string;
}

/// ドリルを開始する（出題する問題と順序をここで決めて保存し、ドリル画面へ移る）。
export async function startDrillAction(
  _prevState: StartDrillState,
  formData: FormData,
): Promise<StartDrillState> {
  const exam = getExam(String(formData.get("exam") ?? DEFAULT_EXAM_ID));
  if (!exam) {
    return { error: "試験が見つかりません。" };
  }
  const mode = String(formData.get("mode") ?? "");
  if (!isDrillMode(mode) || mode === "retry") {
    return { error: "出題モードを選んでください。" };
  }
  const count = Number(formData.get("count"));
  if (!(QUESTION_COUNTS as readonly number[]).includes(count)) {
    return { error: "問題数を選んでください。" };
  }
  const categoryIds = new Set(exam.categories.map((c) => c.id));
  const categories = formData
    .getAll("category")
    .map(String)
    .filter((id) => categoryIds.has(id));

  const candidates =
    categories.length > 0
      ? exam.questions.filter((q) => categories.includes(q.category))
      : exam.questions;
  const stats = buildQuestionStats(await listAttemptsForAnalysis(exam.id));
  const questionIds = pickQuestions({
    questions: candidates,
    stats,
    mode,
    count,
  });
  if (questionIds.length === 0) {
    return {
      error:
        mode === "review"
          ? "復習の対象（直近で不正解・自信なしの問題）はありません。"
          : "条件に合う問題がありません。",
    };
  }

  const session = await createStudySession({
    exam: exam.id,
    mode,
    categories,
    questionIds,
  });
  revalidatePath("/study");
  redirect(`/study/drill/${session.id}`);
}

/// 結果画面から、そのドリルで間違えた・自信がなかった問題だけを解き直す。
export async function retryDrillAction(sessionId: string): Promise<void> {
  const session = await getStudySession(sessionId);
  if (!session) {
    return;
  }
  const questionIds = session.attempts
    .filter((a) => !a.isCorrect || a.unsure)
    .map((a) => a.questionId);
  if (questionIds.length === 0) {
    return;
  }
  const retry = await createStudySession({
    exam: session.exam,
    mode: "retry",
    categories: parseStringList(session.categories),
    questionIds,
  });
  revalidatePath("/study");
  redirect(`/study/drill/${retry.id}`);
}

export interface AnswerResult {
  isCorrect?: boolean;
  correctIndex?: number;
  explanation?: string;
  error?: string;
}

/// 1問に解答する。正誤はサーバで判定し、出題時点の問題文・選択肢・正答の写しと一緒に記録する。
export async function answerQuestionAction(
  sessionId: string,
  questionId: string,
  selectedIndex: number,
  unsure: boolean,
): Promise<AnswerResult> {
  const session = await getStudySession(sessionId);
  if (!session) {
    return { error: "ドリルが見つかりません。" };
  }
  if (!parseStringList(session.questionIds).includes(questionId)) {
    return { error: "このドリルの問題ではありません。" };
  }
  const exam = getExam(session.exam);
  const question = exam ? getQuestion(exam, questionId) : undefined;
  if (!exam || !question) {
    return { error: "問題が見つかりません。" };
  }
  if (
    !Number.isInteger(selectedIndex) ||
    selectedIndex < 0 ||
    selectedIndex > 3
  ) {
    return { error: "選択肢を選んでください。" };
  }

  const arranged = arrangeChoices(question, sessionId);
  const attempt = await recordStudyAttempt({
    sessionId,
    exam: exam.id,
    questionId,
    category: question.category,
    topic: question.topic,
    stem: question.stem,
    choices: arranged.choices,
    correctIndex: arranged.answer,
    explanation: question.explanation,
    selectedIndex,
    unsure: Boolean(unsure),
  });
  // revalidatePath は呼ばない: 呼ぶと現在のドリル画面が即座に再取得され、解説を見る前に
  // 次の問題へ切り替わってしまう。Study の画面はすべて force-dynamic なので再検証は不要で、
  // 次の問題への切替えは DrillRunner の「次の問題へ」（router.refresh）で行う。
  return {
    isCorrect: attempt.isCorrect,
    correctIndex: attempt.correctIndex,
    explanation: attempt.explanation,
  };
}

export async function deleteSessionAction(sessionId: string): Promise<void> {
  await deleteStudySession(sessionId);
  revalidatePath("/study");
}

export interface AdviceState {
  error?: string;
}

/// AI に学習アドバイスを作らせて保存する（提案。何を学ぶかは利用者が決める）。
export async function generateAdviceAction(
  _prevState: AdviceState,
  formData: FormData,
): Promise<AdviceState> {
  const exam = getExam(String(formData.get("exam") ?? DEFAULT_EXAM_ID));
  if (!exam) {
    return { error: "試験が見つかりません。" };
  }
  const attempts = await listAttemptsForAnalysis(exam.id);
  if (attempts.length < 5) {
    return { error: "アドバイスには 5 問以上の解答記録が必要です。" };
  }
  const report = analyzeStudy(exam, attempts);
  const wrong = await listRecentAttempts(exam.id, {
    take: 15,
    wrongOnly: true,
  });

  try {
    const result = await generateStudyAdvice(
      exam,
      report,
      wrong.map((a) => ({
        category: a.category,
        topic: a.topic,
        stem: a.stem,
        choices: parseStringList(a.choices),
        correctIndex: a.correctIndex,
        selectedIndex: a.selectedIndex,
        isCorrect: a.isCorrect,
        unsure: a.unsure,
      })),
    );
    if (!result.body) {
      return { error: result.note };
    }
    await saveStudyAdvice({
      exam: exam.id,
      body: JSON.stringify(result.body),
      model: result.model,
      attemptCount: attempts.length,
    });
  } catch (error) {
    return { error: describeAiError(error) };
  }
  revalidatePath("/study/analysis");
  return {};
}
