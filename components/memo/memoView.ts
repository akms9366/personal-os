import { composeMemoText } from "@/lib/domain/memo";
import {
  isAnalysisStale,
  parseStoredInterpretation,
  type Interpretation,
} from "@/lib/domain/interpretation";
import { formatDateTimeLabel, formatRelativeJst } from "@/lib/time/jst";

/// 作成から1分以上あとに更新されたものを「編集済み」とする（保存時の誤差を除く）。
const EDITED_THRESHOLD_MS = 60 * 1000;

/// タイムラインに出す AI 解析の状態（Issue #20）。
export type MemoAnalysisView =
  | { state: "none" }
  | { state: "pending" }
  | { state: "running" }
  | { state: "failed"; error: string }
  | {
      state: "succeeded";
      /// 保存された解釈が壊れていて読めない場合は null。
      interpretation: Interpretation | null;
      generatedLabel: string;
      model: string | null;
    };

export interface MemoPostView {
  id: string;
  /// 投稿テキスト（1行目=title、2行目以降=body）。
  text: string;
  tags: string[];
  /// 相対時刻（"3時間" / "10月4日" など）。
  timeLabel: string;
  /// 正確な投稿日時（ホバーで表示）。
  timeTitle: string;
  edited: boolean;
  /// 原情報（S1）の現在版。解析の自動開始の重複を防ぐキーに使う。
  entryId: string | null;
  analysis: MemoAnalysisView;
}

interface AnalysisRecord {
  status: string;
  error: string | null;
  model: string | null;
  startedAt: Date | null;
}

interface MemoRecord {
  id: string;
  title: string;
  body: string | null;
  url: string | null;
  createdAt: Date;
  updatedAt: Date;
  tags: { name: string }[];
  entryId: string | null;
  entry: {
    aiAnalysis: AnalysisRecord | null;
    derivedEntries: { body: string; createdAt: Date }[];
  } | null;
}

/// 原情報の現在版に紐づく AI 解釈・解析記録 → 表示状態。
export function toAnalysisView(
  entry: MemoRecord["entry"],
  now: Date,
): MemoAnalysisView {
  if (!entry) {
    return { state: "none" };
  }
  const interpretation = entry.derivedEntries[0];
  const analysis = entry.aiAnalysis;
  if (interpretation) {
    return {
      state: "succeeded",
      interpretation: parseStoredInterpretation(interpretation.body),
      generatedLabel: formatDateTimeLabel(interpretation.createdAt),
      model: analysis?.model ?? null,
    };
  }
  if (!analysis) {
    return { state: "none" };
  }
  switch (analysis.status) {
    case "pending":
      return { state: "pending" };
    case "running":
      return isAnalysisStale(analysis, now)
        ? { state: "failed", error: "解析が途中で中断されました。" }
        : { state: "running" };
    case "failed":
      return {
        state: "failed",
        error: analysis.error ?? "AI 解析に失敗しました。",
      };
    default:
      // succeeded なのに解釈が見当たらない（不整合）。再解析できるよう失敗として示す。
      return { state: "failed", error: "解析結果が見つかりません。" };
  }
}

/// DB の Memo → タイムライン表示用の値（メモページと Home で共通）。
export function toMemoPostView(memo: MemoRecord, now: Date): MemoPostView {
  return {
    id: memo.id,
    text: composeMemoText(memo),
    tags: memo.tags.map((tag) => tag.name),
    timeLabel: formatRelativeJst(memo.createdAt, now),
    timeTitle: formatDateTimeLabel(memo.createdAt),
    edited:
      memo.updatedAt.getTime() - memo.createdAt.getTime() > EDITED_THRESHOLD_MS,
    entryId: memo.entryId,
    analysis: toAnalysisView(memo.entry, now),
  };
}
