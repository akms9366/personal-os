import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getAiClient } from "./client";
import {
  CATEGORY_LABELS,
  INTERPRETATION_CATEGORIES,
  InterpretationValidationError,
  RawInterpretationSchema,
} from "@/lib/domain/interpretation";
import { APP_TIME_ZONE, formatHeadlineDateJst, todayJst } from "@/lib/time/jst";

// タイムラインの原文を Claude に読ませ、分類・抽出の「解釈」を得る（Issue #20）。
// ここは AI を呼んで生の応答を返すだけ。検証・正規化（lib/domain/interpretation.ts）と
// 保存（lib/analysis）は呼び出し側で行う。AI は保存も決定もしない。

/// 1回の解析にかける上限。タイムラインの操作を長く待たせない。
const TIMEOUT_MS = 30_000;
/// 一時的な障害（429/5xx/接続断）に対する SDK の自動リトライ回数。コストを抑えるため1回まで。
const MAX_RETRIES = 1;

const SYSTEM_PROMPT = `あなたは個人用の記録アプリで、利用者がタイムラインに書いた短い文章を整理するアシスタントです。
文章を読み、内容の分類と、必要な情報の抽出だけを行います。文章を書き換えたり、内容を補ったりはしません。

分類（categories。意味のある場合のみ複数）:
${INTERPRETATION_CATEGORIES.map((c) => `- ${c}: ${CATEGORY_LABELS[c]}`).join("\n")}

ルール:
- 原文に書かれていないことを事実として補わない。推測で人名・場所・日時を作らない。
- 実行すべき行動がはっきり読み取れる場合だけ tasks に入れる。予定・日程がはっきりしている場合だけ events に入れる。
- 迷う場合は無理にタスクや予定にせず note として扱い、uncertain を true にする。
- 日時: タイムゾーンは ${APP_TIME_ZONE}。「明日」「金曜」のように今日から一意に決まる日付だけ date（YYYY-MM-DD）に入れる。
  「来週まで」「近いうちに」「月末ごろ」など幅のある表現は date を null にし、表現を text に残す。
- 時刻は原文に明示されている場合だけ time（HH:MM, 24時間制）に入れる。書かれていない時刻を設定しない。
- confidence は high / medium / low のいずれか。期限・日時・内容の解釈にどれだけ確信があるか。
- knowledge は、後から参照したい知識・学び・情報の場合だけ（タイトルと1〜2文の要約）。それ以外は null。
- summary は原文の要点を日本語で短く（60字程度まで）。
- topics はタグにできる短い語の候補（0〜3個、# は付けない）。
- 該当がなければ空配列・null にする。`;

/// 原文を解析し、AI の生の応答（未検証）を返す。
/// 失敗は例外（AiNotConfiguredError / Anthropic の API エラー / InterpretationValidationError）。
export async function requestInterpretation(
  text: string,
  now: Date = new Date(),
): Promise<{ raw: unknown; model: string }> {
  const { client, model } = await getAiClient({
    timeout: TIMEOUT_MS,
    maxRetries: MAX_RETRIES,
  });
  const { weekday } = formatHeadlineDateJst(now);

  const response = await client.messages.parse({
    model,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `今日の日付: ${todayJst(now)}（${weekday}）\n\n--- 記録 ---\n${text}`,
      },
    ],
    output_config: { format: zodOutputFormat(RawInterpretationSchema) },
  });

  if (response.stop_reason === "refusal") {
    throw new InterpretationValidationError(
      "AI がこの記録の解析を断りました。",
    );
  }
  if (!response.parsed_output) {
    throw new InterpretationValidationError(
      "AI の応答を読み取れませんでした。",
    );
  }
  return { raw: response.parsed_output, model };
}
