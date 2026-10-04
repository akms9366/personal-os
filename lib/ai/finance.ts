import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type Anthropic from "@anthropic-ai/sdk";
import { getAiClient } from "./client";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  isCategoryFor,
  type FinanceDraft,
  type FinanceType,
} from "@/lib/domain/finance";
import { isDateString } from "@/lib/time/jst";

// 自然文・レシート画像から収支の「下書き」を作る。
// AI は提案（下書き）を返すだけで保存しない。保存は利用者が確認・修正してから行う（AI は決定しない）。

const ExtractionSchema = z.object({
  records: z.array(
    z.object({
      date: z.string().describe("発生日 YYYY-MM-DD"),
      // 構造化出力では enum が強制されないため文字列で受け、下で正規化する
      // （一覧外の値で応答全体のパースが失敗しないようにする）。
      type: z.string().describe('"expense"（支出）または "income"（収入）'),
      amount: z.number().int().describe("金額（円、正の整数、税込）"),
      category: z.string().describe("カテゴリ（指定の一覧から選ぶ）"),
      description: z.string().describe("内容（店名や品目など短く）"),
      paymentMethod: z
        .string()
        .describe(
          "支払方法（現金・クレジットカード・電子マネー等）。不明なら空文字",
        ),
      memo: z.string().describe("補足。なければ空文字"),
    }),
  ),
  note: z
    .string()
    .describe("読み取れなかった点や確認してほしい点。なければ空文字"),
});

const SYSTEM_PROMPT = `あなたは家計簿の記録を手伝うアシスタントです。
利用者の自然文やレシート画像から、収入・支出の記録を抽出して下書きを作ります。

ルール:
- 1件の取引を1レコードにする。レシートは原則として合計金額で1レコードにする（利用者が品目ごとを望む場合を除く）。
- 金額は円の正の整数（税込）。収入/支出は type で区別し、金額にマイナスは使わない。
- 日付が書かれていなければ「今日」の日付を使う。「昨日」「先週金曜」などは今日を基準に計算する。
- 支出カテゴリ: ${EXPENSE_CATEGORIES.join("、")}
- 収入カテゴリ: ${INCOME_CATEGORIES.join("、")}
- 金額などが読み取れない・推測が必要な場合は推測した値を入れ、note にその旨を書く。
- 取引が見つからなければ records を空にし、note に理由を書く。`;

export interface ExtractInput {
  text: string;
  image?: {
    mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
    base64: string;
  };
  today: string;
}

export interface ExtractResult {
  drafts: FinanceDraft[];
  note: string;
}

export async function extractFinanceDrafts(
  input: ExtractInput,
): Promise<ExtractResult> {
  const { client, model } = await getAiClient();

  const content: Anthropic.ContentBlockParam[] = [];
  if (input.image) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: input.image.mediaType,
        data: input.image.base64,
      },
    });
  }
  content.push({
    type: "text",
    text: `今日の日付: ${input.today}\n\n${input.text.trim() || "（画像から記録を抽出してください）"}`,
  });

  const response = await client.messages.parse({
    model,
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
    output_config: { format: zodOutputFormat(ExtractionSchema) },
  });

  if (response.stop_reason === "refusal") {
    return {
      drafts: [],
      note: "AI がこの入力の処理を断りました。内容を変えて再度お試しください。",
    };
  }
  const parsed = response.parsed_output;
  if (!parsed) {
    return {
      drafts: [],
      note: "AI の応答を読み取れませんでした。もう一度お試しください。",
    };
  }

  const drafts: FinanceDraft[] = parsed.records
    .filter((record) => record.amount > 0)
    .map((record) => {
      const type: FinanceType = record.type === "income" ? "income" : "expense";
      return {
        date: isDateString(record.date) ? record.date : input.today,
        type,
        amount: record.amount,
        // 一覧外・種別と合わないカテゴリは「その他」に寄せる（利用者が確認画面で直せる）。
        category: isCategoryFor(type, record.category)
          ? record.category
          : "その他",
        description: record.description,
        paymentMethod: record.paymentMethod,
        memo: record.memo,
      };
    });

  return { drafts, note: parsed.note };
}
