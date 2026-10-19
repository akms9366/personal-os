import type { StudyCategory, StudyExam, StudyQuestion } from "./types";
import { SG_CATEGORIES } from "./sg/categories";
import { SG_QUESTIONS } from "./sg/questions";

// ドリルの対象試験の一覧（StudySession.exam / StudyAttempt.exam の値域）。
// 試験を増やすときは、ここに問題集を登録するだけでよい。

export const EXAMS: readonly StudyExam[] = [
  {
    id: "sg",
    name: "情報セキュリティマネジメント試験",
    shortName: "SG",
    summary:
      "科目A（四肢択一 48 問）と科目B（事例 12 問）の CBT 方式。総合評価 1,000 点満点中 600 点以上で合格。",
    categories: SG_CATEGORIES,
    questions: SG_QUESTIONS,
  },
];

export const DEFAULT_EXAM_ID = "sg";

export function getExam(id: string): StudyExam | undefined {
  return EXAMS.find((exam) => exam.id === id);
}

export function getQuestion(
  exam: StudyExam,
  questionId: string,
): StudyQuestion | undefined {
  return exam.questions.find((question) => question.id === questionId);
}

export function getCategory(
  exam: StudyExam,
  categoryId: string,
): StudyCategory | undefined {
  return exam.categories.find((category) => category.id === categoryId);
}

/// 分野 ID → 表示名（問題集から消えた分野は ID のまま出す）。
export function categoryLabel(exam: StudyExam, categoryId: string): string {
  return getCategory(exam, categoryId)?.label ?? categoryId;
}
