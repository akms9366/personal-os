import type { StudyQuestion } from "./types";

// ドリルの出題ロジック（純粋関数）。どの問題を・どの順で・選択肢をどう並べて出すかを決める。

export const DRILL_MODES = [
  "random",
  "unanswered",
  "weak",
  "review",
  "retry",
] as const;
export type DrillMode = (typeof DRILL_MODES)[number];

export function isDrillMode(value: string): value is DrillMode {
  return (DRILL_MODES as readonly string[]).includes(value);
}

/// 開始画面で選べるモード（"retry" は結果画面の「間違えた問題を解き直す」専用）。
export const SELECTABLE_MODES: readonly {
  id: Exclude<DrillMode, "retry">;
  label: string;
  description: string;
}[] = [
  {
    id: "weak",
    label: "苦手優先",
    description: "間違えた・自信がなかった問題、正答率の低い問題から出す",
  },
  {
    id: "unanswered",
    label: "未挑戦優先",
    description: "まだ解いていない問題から出し、範囲を広げる",
  },
  {
    id: "review",
    label: "復習のみ",
    description: "直近で不正解・自信なしだった問題だけを出す",
  },
  {
    id: "random",
    label: "ランダム",
    description: "選んだ分野からランダムに出す",
  },
];

export const DRILL_MODE_LABELS: Record<DrillMode, string> = {
  random: "ランダム",
  unanswered: "未挑戦優先",
  weak: "苦手優先",
  review: "復習のみ",
  retry: "解き直し",
};

export const QUESTION_COUNTS = [5, 10, 20] as const;

// ---- 問題ごとの成績 ----

export interface AttemptRecord {
  questionId: string;
  isCorrect: boolean;
  unsure: boolean;
  answeredAt: Date;
}

export interface QuestionStat {
  attempts: number;
  correct: number;
  lastCorrect: boolean;
  lastUnsure: boolean;
  lastAnsweredAt: Date;
}

/// 解答記録を問題ごとに集計する（「直近」は answeredAt が最も新しい解答）。
export function buildQuestionStats(
  attempts: readonly AttemptRecord[],
): Map<string, QuestionStat> {
  const stats = new Map<string, QuestionStat>();
  for (const attempt of attempts) {
    const stat = stats.get(attempt.questionId);
    if (!stat) {
      stats.set(attempt.questionId, {
        attempts: 1,
        correct: attempt.isCorrect ? 1 : 0,
        lastCorrect: attempt.isCorrect,
        lastUnsure: attempt.unsure,
        lastAnsweredAt: attempt.answeredAt,
      });
      continue;
    }
    stat.attempts += 1;
    stat.correct += attempt.isCorrect ? 1 : 0;
    if (attempt.answeredAt >= stat.lastAnsweredAt) {
      stat.lastCorrect = attempt.isCorrect;
      stat.lastUnsure = attempt.unsure;
      stat.lastAnsweredAt = attempt.answeredAt;
    }
  }
  return stats;
}

/// 問題の習熟度。直近の解答で決める（過去に間違えても、直近で自信を持って正解なら定着）。
///   - mastered: 直近が正解（自信あり）
///   - shaky:    直近が正解だが「自信なし」
///   - wrong:    直近が不正解
///   - new:      未挑戦
export type Mastery = "mastered" | "shaky" | "wrong" | "new";

export const MASTERY_LABELS: Record<Mastery, string> = {
  mastered: "定着",
  shaky: "あやふや",
  wrong: "要復習",
  new: "未挑戦",
};

export function masteryOf(stat: QuestionStat | undefined): Mastery {
  if (!stat) {
    return "new";
  }
  if (!stat.lastCorrect) {
    return "wrong";
  }
  return stat.lastUnsure ? "shaky" : "mastered";
}

// ---- 出題 ----

export type Random = () => number;

function shuffle<T>(items: readonly T[], random: Random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/// 苦手度（大きいほど先に出す）。直近の結果を重く、通算の正答率で微調整する。
function weaknessScore(stat: QuestionStat | undefined): number {
  const base = { wrong: 3, shaky: 2, new: 1.5, mastered: 0 }[masteryOf(stat)];
  if (!stat) {
    return base;
  }
  return base + (1 - stat.correct / stat.attempts);
}

/// 出題する問題 ID を順に返す。候補（questions）は分野で絞り込み済みのものを渡す。
/// 該当する問題が無ければ空配列（"review" で復習対象が無い場合など）。
export function pickQuestions({
  questions,
  stats,
  mode,
  count,
  random = Math.random,
}: {
  questions: readonly StudyQuestion[];
  stats: Map<string, QuestionStat>;
  mode: Exclude<DrillMode, "retry">;
  count: number;
  random?: Random;
}): string[] {
  // 同点の並びが毎回同じにならないよう、先にシャッフルしてから安定ソートする。
  const pool = shuffle(questions, random);
  let ordered: StudyQuestion[];

  switch (mode) {
    case "random":
      ordered = pool;
      break;
    case "unanswered":
      // 未挑戦 → 最後に解いたのが古い順。
      ordered = pool.sort((a, b) => {
        const sa = stats.get(a.id);
        const sb = stats.get(b.id);
        if (!sa || !sb) {
          return (sa ? 1 : 0) - (sb ? 1 : 0);
        }
        return sa.lastAnsweredAt.getTime() - sb.lastAnsweredAt.getTime();
      });
      break;
    case "weak":
      ordered = pool.sort(
        (a, b) =>
          weaknessScore(stats.get(b.id)) - weaknessScore(stats.get(a.id)),
      );
      break;
    case "review":
      ordered = pool
        .filter((q) => {
          const mastery = masteryOf(stats.get(q.id));
          return mastery === "wrong" || mastery === "shaky";
        })
        .sort(
          (a, b) =>
            weaknessScore(stats.get(b.id)) - weaknessScore(stats.get(a.id)),
        );
      break;
  }

  return ordered.slice(0, Math.max(0, count)).map((q) => q.id);
}

// ---- 選択肢の並べ替え ----

/// 文字列から 32bit のシード値を作る（FNV-1a）。
function hashSeed(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/// シード付きの擬似乱数（mulberry32）。
export function seededRandom(seed: string): Random {
  let state = hashSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface ArrangedQuestion {
  choices: string[];
  /// 並べ替え後の正答の番号。
  answer: number;
}

/// 正答の位置を覚えてしまわないよう、ドリルごとに選択肢を並べ替える。
/// 同じドリル・同じ問題なら常に同じ並び（再読込みや解答の照合で同じ結果になる）。
export function arrangeChoices(
  question: StudyQuestion,
  sessionId: string,
): ArrangedQuestion {
  if (question.keepOrder) {
    return { choices: [...question.choices], answer: question.answer };
  }
  const order = shuffle(
    [0, 1, 2, 3],
    seededRandom(`${sessionId}:${question.id}`),
  );
  return {
    choices: order.map((index) => question.choices[index]),
    answer: order.indexOf(question.answer),
  };
}
