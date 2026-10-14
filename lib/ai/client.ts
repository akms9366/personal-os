import Anthropic from "@anthropic-ai/sdk";
import { getAiConfig } from "@/lib/settings/store";

// Claude API ラッパ（14 §3 AI 提供者）。API キーとモデルは Settings（AI & Automation）の値を使う。

export class AiNotConfiguredError extends Error {
  constructor() {
    super("AI の API キーが未設定です。Settings で設定してください。");
    this.name = "AiNotConfiguredError";
  }
}

/// AI が使える設定か（API キーの有無）。画面の出し分け・解析の起動判断に使う。
export async function isAiConfigured(): Promise<boolean> {
  const { apiKey } = await getAiConfig();
  return Boolean(apiKey);
}

/// timeout（ms）と maxRetries を渡すと SDK の既定（10分・2回）より短くできる。
export async function getAiClient(options?: {
  timeout?: number;
  maxRetries?: number;
}): Promise<{
  client: Anthropic;
  model: string;
}> {
  const { apiKey, model } = await getAiConfig();
  if (!apiKey) {
    throw new AiNotConfiguredError();
  }
  return { client: new Anthropic({ apiKey, ...options }), model };
}

/// API エラーを利用者向けの日本語メッセージにする（誠実な失敗表示、`11 §9`）。
export function describeAiError(error: unknown): string {
  if (error instanceof AiNotConfiguredError) {
    return error.message;
  }
  if (error instanceof Anthropic.AuthenticationError) {
    return "API キーが無効です。Settings で確認してください。";
  }
  if (error instanceof Anthropic.NotFoundError) {
    return "モデルが見つかりません。Settings のモデル名を確認してください。";
  }
  if (error instanceof Anthropic.RateLimitError) {
    return "AI の利用上限に達しました。少し待ってから再度お試しください。";
  }
  if (error instanceof Anthropic.BadRequestError) {
    return `AI へのリクエストが受け付けられませんでした: ${error.message}`;
  }
  if (error instanceof Anthropic.APIConnectionTimeoutError) {
    return "AI の応答が時間内に返りませんでした。時間をおいて再解析してください。";
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return "AI に接続できませんでした。ネットワークを確認してください。";
  }
  if (error instanceof Anthropic.APIError) {
    return `AI でエラーが発生しました（${error.status ?? "不明"}）。時間をおいて再度お試しください。`;
  }
  return "AI の処理中にエラーが発生しました。";
}
