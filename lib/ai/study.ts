import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getAiClient } from "./client";
import {
  percent,
  TARGET_ACCURACY,
  type StudyReport,
} from "@/lib/study/analysis";
import type { StudyExam } from "@/lib/study/types";
import { CHOICE_LABELS } from "@/lib/study/types";

// 解答記録の分析結果から、AI に学習アドバイス（提案）を作らせる。
// AI に渡すのは集計値と直近の誤答だけ。何を学ぶかの決定は利用者が行う（AI は提案のみ）。

export const StudyAdviceSchema = z.object({
  summary: z.string().describe("現状の総評（2〜3文）"),
  focusAreas: z
    .array(
      z.object({
        title: z.string().describe("重点的に学ぶ論点（短く）"),
        why: z.string().describe("なぜ優先すべきか（記録の数値に基づく）"),
        howToStudy: z.string().describe("具体的な学び方（1〜2文）"),
      }),
    )
    .describe("優先度の高い順に最大3つ"),
  misconceptions: z
    .array(z.string())
    .describe(
      "誤答から推測される思い違い・混同しやすい用語（最大3つ）。なければ空",
    ),
  nextSteps: z.array(z.string()).describe("次の1週間でやること（最大3つ）"),
});

export type StudyAdviceBody = z.infer<typeof StudyAdviceSchema>;

export function parseStudyAdviceBody(json: string): StudyAdviceBody | null {
  try {
    const result = StudyAdviceSchema.safeParse(JSON.parse(json));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export interface WrongAttemptSample {
  category: string;
  topic: string;
  stem: string;
  choices: string[];
  correctIndex: number;
  selectedIndex: number;
  isCorrect: boolean;
  unsure: boolean;
}

function buildPrompt(
  exam: StudyExam,
  report: StudyReport,
  wrong: readonly WrongAttemptSample[],
): string {
  const label = (id: string) =>
    exam.categories.find((c) => c.id === id)?.label ?? id;
  const lines: string[] = [
    `試験: ${exam.name}（${exam.summary}）`,
    `目標正答率: ${percent(TARGET_ACCURACY)}`,
    `通算: ${report.attempts} 解答 / 正答率 ${percent(report.accuracy)} / 挑戦済み ${report.questionsAttempted}/${report.questionCount} 問 / 学習日数 ${report.studyDays} 日 / 直近7日 ${report.last7DaysAttempts} 解答`,
    "",
    "分野別（解答数・通算正答率・直近10回の正答率・問題の内訳）:",
    ...report.categories.map(
      (c) =>
        `- ${c.category.label}: ${c.attempts} 解答, 通算 ${percent(c.accuracy)}, 直近 ${percent(c.recentAccuracy)}, 定着 ${c.mastery.mastered} / あやふや ${c.mastery.shaky} / 要復習 ${c.mastery.wrong} / 未挑戦 ${c.mastery.new}`,
    ),
    "",
    "間違えた回数の多い論点:",
    ...(report.weakTopics.length > 0
      ? report.weakTopics.map(
          (t) =>
            `- ${label(t.categoryId)} / ${t.topic}: ${t.wrong} 回誤答（${t.attempts} 解答中）`,
        )
      : ["- なし"]),
    "",
    "直近の誤答・自信なしの解答:",
  ];
  if (wrong.length === 0) {
    lines.push("- なし");
  }
  for (const w of wrong) {
    lines.push(
      `- [${label(w.category)} / ${w.topic}] ${w.stem}`,
      `  選んだ答え: ${CHOICE_LABELS[w.selectedIndex]} ${w.choices[w.selectedIndex] ?? ""}${w.isCorrect ? "（正解・自信なし）" : ""}`,
      `  正答: ${CHOICE_LABELS[w.correctIndex]} ${w.choices[w.correctIndex] ?? ""}`,
    );
  }
  return lines.join("\n");
}

const SYSTEM_PROMPT = `あなたは情報処理技術者試験の学習コーチです。
受験者のドリルの解答記録（集計値と直近の誤答）を読み、次に何をどう学ぶべきかを日本語で提案します。

ルール:
- 記録の数値に基づいて述べる。記録にない弱点を推測で断定しない。解答数が少ない分野は「まだ判断材料が少ない」と明記する。
- 誤答の選択肢から、混同している用語や思い違い（例: 公開鍵と秘密鍵の使い分け、リスク移転と保有の区別）を具体的に指摘する。
- 学び方は具体的に（例:「〜の違いを表にまとめる」「〜を図に描く」）。精神論や一般論だけの助言はしない。
- 試験の制度や日程など、記録にない事実を新しく持ち出さない。
- 丁寧だが簡潔に。`;

export async function generateStudyAdvice(
  exam: StudyExam,
  report: StudyReport,
  wrong: readonly WrongAttemptSample[],
): Promise<{ body: StudyAdviceBody | null; model: string; note?: string }> {
  const { client, model } = await getAiClient({
    timeout: 60_000,
    maxRetries: 1,
  });
  const response = await client.messages.parse({
    model,
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildPrompt(exam, report, wrong) }],
    output_config: { format: zodOutputFormat(StudyAdviceSchema) },
  });

  if (response.stop_reason === "refusal") {
    return { body: null, model, note: "AI がアドバイスの生成を断りました。" };
  }
  if (!response.parsed_output) {
    return {
      body: null,
      model,
      note: "AI の応答を読み取れませんでした。もう一度お試しください。",
    };
  }
  return { body: response.parsed_output, model };
}
