import type { TaskStatus } from "@/lib/domain/task";

export interface HandoffView {
  reflection?: { date: Date; body: string };
  heldTaskTitles: string[];
}

export interface CurrentStateProps {
  taskCounts: Record<TaskStatus, number>;
  calendar: {
    connected: boolean;
    error?: string;
    todayEventCount: number;
    nextEvent?: { start: Date; summary: string };
  };
  handoff?: HandoffView;
}

function formatTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const REFLECTION_PREVIEW_MAX_LENGTH = 150;

function previewReflection(body: string): string {
  const firstLine = body.split("\n")[0].trim();
  const source = firstLine.length > 0 ? firstLine : body.trim();
  if (source.length <= REFLECTION_PREVIEW_MAX_LENGTH) {
    return source;
  }
  return `${source.slice(0, REFLECTION_PREVIEW_MAX_LENGTH - 1)}…`;
}

// 現在地（Current State）領域（Issue #15、Glossary「今の状況・未解決事項・注意すべき変化」の要約）。
// 全履歴の羅列ではなく要約に留める。根拠のない緊急度（「遅れています」等）は出さない。
export function CurrentState({ taskCounts, calendar, handoff }: CurrentStateProps) {
  const unresolvedTaskCount =
    taskCounts.todo + taskCounts.doing + taskCounts.hold;

  const taskSummary =
    unresolvedTaskCount === 0
      ? "未解決のタスクはありません。"
      : `未着手 ${taskCounts.todo}件・進行中 ${taskCounts.doing}件・保留 ${taskCounts.hold}件`;

  let calendarSummary: string;
  if (!calendar.connected) {
    calendarSummary = "カレンダー未接続。";
  } else if (calendar.error) {
    calendarSummary = `カレンダー同期エラー（${calendar.error}）。`;
  } else if (calendar.todayEventCount === 0) {
    calendarSummary = "今日の予定はありません。";
  } else if (calendar.nextEvent) {
    calendarSummary = `今日の予定 ${calendar.todayEventCount}件（次: ${formatTime(
      calendar.nextEvent.start,
    )} ${calendar.nextEvent.summary}）`;
  } else {
    calendarSummary = `今日の予定 ${calendar.todayEventCount}件。`;
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <h2 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        現在地
      </h2>
      <ul className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
        <li>{taskSummary}</li>
        <li>{calendarSummary}</li>
      </ul>

      {handoff && (handoff.reflection || handoff.heldTaskTitles.length > 0) ? (
        <div className="mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-800">
          <h3 className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            引継ぎ
          </h3>
          <ul className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
            {handoff.reflection ? (
              <li>
                前回の振り返り（{formatDate(handoff.reflection.date)}）:{" "}
                {previewReflection(handoff.reflection.body)}
              </li>
            ) : null}
            {handoff.heldTaskTitles.length > 0 ? (
              <li>保留中: {handoff.heldTaskTitles.join("・")}</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
