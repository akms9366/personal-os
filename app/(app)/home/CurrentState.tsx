import type { TaskStatus } from "@/lib/domain/task";

export interface CurrentStateProps {
  taskCounts: Record<TaskStatus, number>;
  calendar: {
    connected: boolean;
    error?: string;
    todayEventCount: number;
    nextEvent?: { start: Date; summary: string };
  };
}

function formatTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// 現在地（Current State）領域（Issue #15、Glossary「今の状況・未解決事項・注意すべき変化」の要約）。
// 全履歴の羅列ではなく要約に留める。根拠のない緊急度（「遅れています」等）は出さない。
export function CurrentState({ taskCounts, calendar }: CurrentStateProps) {
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
    </section>
  );
}
