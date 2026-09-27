import type { CalendarEventOccurrence } from "@/lib/calendar/ics";

function formatTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// 今日の予定（Issue #14）。read-only 表示のみ、Client Component ではない。
// `11 §9`「成功したように見せない」: 同期失敗時は空一覧ではなく必ずエラーを明示する。
export function TodayEvents({
  connected,
  events,
  error,
}: {
  connected: boolean;
  events: CalendarEventOccurrence[];
  error?: string;
}) {
  if (!connected) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        カレンダーは未接続です（Settings の Connections で接続できます）。
      </p>
    );
  }

  if (error) {
    return (
      <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
        同期に失敗しました（{error}）。今日の予定は取得できていません。
      </p>
    );
  }

  if (events.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        今日の予定はありません。
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {events.map((event) => (
        <li
          key={event.occurrenceKey}
          className="flex items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
        >
          <span className="w-24 shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
            {event.allDay ? "終日" : `${formatTime(event.start)}–${formatTime(event.end)}`}
          </span>
          <span className="text-sm text-zinc-900 dark:text-zinc-50">
            {event.summary}
          </span>
        </li>
      ))}
    </ul>
  );
}
