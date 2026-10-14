// AI 解釈（S2 Interpretation）の語彙・検証・正規化（Issue #20）。純粋関数・DB 非依存。
//
// 設計の核（State_Taxonomy §3 S2 / 06 §7）:
//   - 解釈は原情報（S1）から導いた「読み取り」であり、原情報を上書きしない。
//   - タスク・予定は「候補」であって確定データではない（確定は利用者の決定 S5 を経る。#21 の範囲）。
//   - 原文に無い情報を事実として補わない。期限・日時の確信が持てない場合は日付を空にして原文の表現を残す。
//   - AI の応答は検証してから保存する（ここを通らない値は DB に入れない）。

import { z } from "zod";
import { isDateString, isTimeString } from "../time/jst";

// ---- 分類 ----

export const INTERPRETATION_CATEGORIES = [
  "note",
  "task_candidate",
  "event_candidate",
  "knowledge_candidate",
  "reflection",
] as const;
export type InterpretationCategory = (typeof INTERPRETATION_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<InterpretationCategory, string> = {
  note: "メモ",
  task_candidate: "タスク候補",
  event_candidate: "予定候補",
  knowledge_candidate: "知識",
  reflection: "振り返り・気づき",
};

export const CONFIDENCES = ["high", "medium", "low"] as const;
export type Confidence = (typeof CONFIDENCES)[number];

export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  high: "確度 高",
  medium: "確度 中",
  low: "確度 低",
};

// ---- 解析の実行状態（AiAnalysis.status） ----

export const ANALYSIS_STATUSES = [
  "pending",
  "running",
  "succeeded",
  "failed",
] as const;
export type AnalysisStatus = (typeof ANALYSIS_STATUSES)[number];

export function isAnalysisStatus(value: string): value is AnalysisStatus {
  return (ANALYSIS_STATUSES as readonly string[]).includes(value);
}

/// 「解析中」のまま止まった実行（プロセス停止など）を中断扱いにするまでの時間。
export const ANALYSIS_STALE_MS = 2 * 60 * 1000;

/// 解析を開始してよい状態か。成功済みの版は再解析しない（重複した解釈を作らない）。
export function canStartAnalysis(
  current: { status: string; startedAt: Date | null } | null,
  now: Date,
): boolean {
  if (!current) {
    return true;
  }
  if (current.status === "pending" || current.status === "failed") {
    return true;
  }
  if (current.status === "running") {
    return isAnalysisStale(current, now);
  }
  return false;
}

export function isAnalysisStale(
  current: { status: string; startedAt: Date | null },
  now: Date,
): boolean {
  return (
    current.status === "running" &&
    (current.startedAt === null ||
      now.getTime() - current.startedAt.getTime() > ANALYSIS_STALE_MS)
  );
}

// ---- 保存する解釈の形（検証済み） ----

const ConfidenceSchema = z.enum(CONFIDENCES);

const WhenSchema = z
  .object({
    /// 原文の表現（「来週まで」「明日の朝」など）。原文に無ければ空文字。
    text: z.string(),
    /// 確定できる暦日（JST, YYYY-MM-DD）のみ。曖昧なら null。
    date: z.string().nullable(),
    /// 原文に明示された時刻（HH:MM）のみ。無ければ null。
    time: z.string().nullable(),
  })
  .strict();
export type When = z.infer<typeof WhenSchema>;

const TaskCandidateSchema = z
  .object({
    title: z.string().min(1),
    due: WhenSchema.nullable(),
    people: z.array(z.string()),
    nextAction: z.string().nullable(),
    confidence: ConfidenceSchema,
  })
  .strict();
export type TaskCandidate = z.infer<typeof TaskCandidateSchema>;

const EventCandidateSchema = z
  .object({
    title: z.string().min(1),
    start: WhenSchema.nullable(),
    end: WhenSchema.nullable(),
    location: z.string().nullable(),
    people: z.array(z.string()),
    confidence: ConfidenceSchema,
  })
  .strict();
export type EventCandidate = z.infer<typeof EventCandidateSchema>;

const KnowledgeSchema = z
  .object({
    title: z.string().min(1),
    summary: z.string(),
  })
  .strict();

export const INTERPRETATION_VERSION = 1;

/// Entry（S2）の body に JSON で保存する解釈。読み出し時もこのスキーマで検証する。
export const InterpretationSchema = z
  .object({
    v: z.literal(INTERPRETATION_VERSION),
    categories: z.array(z.enum(INTERPRETATION_CATEGORIES)).min(1),
    summary: z.string(),
    /// 分類に確信が持てない（無理に候補化していない）こと。
    uncertain: z.boolean(),
    tasks: z.array(TaskCandidateSchema),
    events: z.array(EventCandidateSchema),
    knowledge: KnowledgeSchema.nullable(),
    /// タグ（トピック）の候補。利用者が採用するまでメモのタグにはしない（06 Tag: AI は候補 S2）。
    topics: z.array(z.string()),
  })
  .strict();
export type Interpretation = z.infer<typeof InterpretationSchema>;

// ---- AI の生の応答（構造化出力）→ 検証・正規化 ----

/// 構造化出力で受け取る形。enum は構造化出力で強制されないため文字列で受け、normalize で絞る
/// （一覧外の値で応答全体が失敗しないようにする。lib/ai/finance.ts と同じ方針）。
const RawWhenSchema = z.object({
  text: z.string(),
  date: z.string().nullable(),
  time: z.string().nullable(),
});

export const RawInterpretationSchema = z.object({
  categories: z.array(z.string()),
  summary: z.string(),
  uncertain: z.boolean(),
  tasks: z.array(
    z.object({
      title: z.string(),
      due: RawWhenSchema.nullable(),
      people: z.array(z.string()),
      nextAction: z.string().nullable(),
      confidence: z.string(),
    }),
  ),
  events: z.array(
    z.object({
      title: z.string(),
      start: RawWhenSchema.nullable(),
      end: RawWhenSchema.nullable(),
      location: z.string().nullable(),
      people: z.array(z.string()),
      confidence: z.string(),
    }),
  ),
  knowledge: z
    .object({
      title: z.string(),
      summary: z.string(),
    })
    .nullable(),
  topics: z.array(z.string()),
});
export type RawInterpretation = z.infer<typeof RawInterpretationSchema>;

export class InterpretationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InterpretationValidationError";
  }
}

const SUMMARY_MAX = 140;
const TITLE_MAX = 80;
const LIST_MAX = 5;
const TOPIC_MAX_LENGTH = 30;

// 原文に時刻の手がかりが無いのに時刻が返ってきたら捨てる（入力に無い時刻を設定しない）。
const TIME_HINT_RE =
  /[0-9０-９]|[一二三四五六七八九十]+時|正午|朝|昼|夕方|夜|午前|午後|深夜/;

function clip(value: string, max: number): string {
  const trimmed = value.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

function cleanList(values: string[], maxLength = TITLE_MAX): string[] {
  const cleaned = values
    .map((value) => clip(value.replace(/^#+/, ""), maxLength))
    .filter((value) => value.length > 0);
  return Array.from(new Set(cleaned)).slice(0, LIST_MAX);
}

function normalizeConfidence(value: string): Confidence {
  const lower = value.trim().toLowerCase();
  return (CONFIDENCES as readonly string[]).includes(lower)
    ? (lower as Confidence)
    : "low";
}

function normalizeWhen(
  when: z.infer<typeof RawWhenSchema> | null,
  sourceHasTimeHint: boolean,
): When | null {
  if (!when) {
    return null;
  }
  const text = when.text.trim();
  const date =
    when.date && isDateString(when.date.trim()) ? when.date.trim() : null;
  const time =
    sourceHasTimeHint && when.time && isTimeString(when.time.trim())
      ? when.time.trim()
      : null;
  if (!text && !date && !time) {
    return null;
  }
  return { text, date, time };
}

/// AI の応答を検証し、保存できる解釈に正規化する。形式が不正なら InterpretationValidationError。
/// sourceText は原情報（S1）の本文。原文に無い時刻を取り除く判定に使う。
export function normalizeInterpretation(
  raw: unknown,
  sourceText: string,
): Interpretation {
  const parsed = RawInterpretationSchema.safeParse(raw);
  if (!parsed.success) {
    throw new InterpretationValidationError(
      "AI の応答が想定した形式ではありませんでした。",
    );
  }
  const data = parsed.data;
  const hasTimeHint = TIME_HINT_RE.test(sourceText);

  const tasks: TaskCandidate[] = data.tasks
    .map((task) => ({
      title: clip(task.title, TITLE_MAX),
      due: normalizeWhen(task.due, hasTimeHint),
      people: cleanList(task.people),
      nextAction: task.nextAction?.trim()
        ? clip(task.nextAction, TITLE_MAX)
        : null,
      confidence: normalizeConfidence(task.confidence),
    }))
    .filter((task) => task.title.length > 0)
    .slice(0, LIST_MAX);

  const events: EventCandidate[] = data.events
    .map((event) => ({
      title: clip(event.title, TITLE_MAX),
      start: normalizeWhen(event.start, hasTimeHint),
      end: normalizeWhen(event.end, hasTimeHint),
      location: event.location?.trim() ? clip(event.location, TITLE_MAX) : null,
      people: cleanList(event.people),
      confidence: normalizeConfidence(event.confidence),
    }))
    .filter((event) => event.title.length > 0)
    .slice(0, LIST_MAX);

  const knowledge =
    data.knowledge && data.knowledge.title.trim()
      ? {
          title: clip(data.knowledge.title, TITLE_MAX),
          summary: clip(data.knowledge.summary, SUMMARY_MAX),
        }
      : null;

  // 分類は一覧内の値だけを残し、抽出結果と食い違う分類（候補が無いのにタスク候補など）は外す。
  const requested = new Set(
    data.categories
      .map((category) => category.trim().toLowerCase())
      .filter((category): category is InterpretationCategory =>
        (INTERPRETATION_CATEGORIES as readonly string[]).includes(category),
      ),
  );
  if (tasks.length > 0) requested.add("task_candidate");
  else requested.delete("task_candidate");
  if (events.length > 0) requested.add("event_candidate");
  else requested.delete("event_candidate");
  if (knowledge) requested.add("knowledge_candidate");
  else requested.delete("knowledge_candidate");
  if (requested.size === 0) requested.add("note");

  const categories = INTERPRETATION_CATEGORIES.filter((category) =>
    requested.has(category),
  );

  return InterpretationSchema.parse({
    v: INTERPRETATION_VERSION,
    categories,
    summary: clip(data.summary, SUMMARY_MAX),
    uncertain: data.uncertain,
    tasks,
    events,
    knowledge,
    topics: cleanList(data.topics, TOPIC_MAX_LENGTH),
  });
}

// ---- 保存・読み出し ----

export function serializeInterpretation(
  interpretation: Interpretation,
): string {
  return JSON.stringify(InterpretationSchema.parse(interpretation));
}

/// S2 Entry の body から解釈を読み出す。壊れていれば null（表示側で「読み込めない」と示す）。
export function parseStoredInterpretation(body: string): Interpretation | null {
  try {
    const result = InterpretationSchema.safeParse(JSON.parse(body));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

/// 表示用: When を「10/20 18:00」「来週まで（日付未確定）」のような短い文にする。
export function describeWhen(when: When | null): string | null {
  if (!when) {
    return null;
  }
  if (when.date) {
    const [, month, day] = when.date.split("-").map(Number);
    return `${month}/${day}${when.time ? ` ${when.time}` : ""}`;
  }
  if (when.text) {
    return `${when.text}（日付未確定）`;
  }
  return when.time;
}
