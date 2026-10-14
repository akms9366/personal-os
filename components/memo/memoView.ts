import { composeMemoText } from "@/lib/domain/memo";
import {
  isAnalysisStale,
  parseStoredInterpretation,
  type Interpretation,
} from "@/lib/domain/interpretation";
import {
  DECISION_LABELS,
  dueHint,
  parseStoredDecision,
  parseStoredSuggestion,
  REJECT_REASON_LABELS,
  type Decision,
} from "@/lib/domain/suggestion";
import { formatDateTimeLabel, formatRelativeJst } from "@/lib/time/jst";

/// 作成から1分以上あとに更新されたものを「編集済み」とする（保存時の誤差を除く）。
const EDITED_THRESHOLD_MS = 60 * 1000;

/// 行動候補（S4）への利用者の決定の状態（Issue #21）。
export type SuggestionDecisionView =
  | { state: "undecided" }
  | {
      state: "hold" | "reject";
      label: string;
      reasonLabel: string | null;
      note: string;
      decidedLabel: string;
    }
  | {
      state: "adopt" | "modify";
      label: string;
      decidedLabel: string;
      /// 採用で作られたタスク。削除されていれば null。
      task: { id: string; title: string; status: string } | null;
    };

/// 行動候補（S4）。AI が解釈から作った「候補」で、利用者が決めるまで正式なタスクではない。
export interface SuggestionView {
  id: string;
  title: string;
  /// 採用フォームの初期値（候補の日付が確定していれば入る。無ければ空）。
  defaults: { title: string; dueDate: string; dueTime: string };
  /// 日付が確定していない期限の原文の表現（「来週まで」など）。
  dueHint: string | null;
  people: string[];
  nextAction: string | null;
  confidence: "high" | "medium" | "low";
  decision: SuggestionDecisionView;
}

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
      /// タスク候補から作られた行動候補（S4）とその決定状態。
      suggestions: SuggestionView[];
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

interface SuggestionRecord {
  id: string;
  body: string;
  derivedEntries?: {
    body: string;
    createdAt: Date;
    revisedBy: { id: string }[];
    originatedTasks: { id: string; title: string; status: string }[];
  }[];
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
    derivedEntries: {
      body: string;
      createdAt: Date;
      derivedEntries?: SuggestionRecord[];
    }[];
  } | null;
}

/// 行動候補（S4）→ 表示用。現在の決定 = まだ別の決定に置き換えられていない最新の S5。
export function toSuggestionViews(
  records: SuggestionRecord[] | undefined,
): SuggestionView[] {
  const views: SuggestionView[] = [];
  for (const record of records ?? []) {
    const candidate = parseStoredSuggestion(record.body);
    if (!candidate) {
      continue;
    }
    const current = (record.derivedEntries ?? [])
      .filter((decision) => decision.revisedBy.length === 0)
      .at(-1);
    const payload = current ? parseStoredDecision(current.body) : null;

    let decision: SuggestionDecisionView = { state: "undecided" };
    if (current && payload) {
      const label = DECISION_LABELS[payload.decision as Decision];
      const decidedLabel = formatDateTimeLabel(current.createdAt);
      decision =
        payload.decision === "adopt" || payload.decision === "modify"
          ? {
              state: payload.decision,
              label,
              decidedLabel,
              task: current.originatedTasks[0] ?? null,
            }
          : {
              state: payload.decision,
              label,
              decidedLabel,
              reasonLabel: payload.reason
                ? REJECT_REASON_LABELS[payload.reason]
                : null,
              note: payload.note,
            };
    }

    views.push({
      id: record.id,
      title: candidate.title,
      defaults: {
        title: candidate.title,
        dueDate: candidate.due?.date ?? "",
        dueTime: candidate.due?.date
          ? (candidate.due.time ?? "23:59")
          : "23:59",
      },
      dueHint: dueHint(candidate.due),
      people: candidate.people,
      nextAction: candidate.nextAction,
      confidence: candidate.confidence,
      decision,
    });
  }
  return views;
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
      suggestions: toSuggestionViews(interpretation.derivedEntries),
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
