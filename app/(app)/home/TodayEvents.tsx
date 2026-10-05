import type { CalendarEventOccurrence } from "@/lib/calendar/ics";
import {
  errorNoticeClass,
  listCardClass,
  listRowClass,
} from "@/components/ui/styles";

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
      <p className="text-sm text-fog">
        カレンダーは未接続です（Settings の Connections で接続できます）。
      </p>
    );
  }

  if (error) {
    return (
      <p className={errorNoticeClass}>
        同期に失敗しました（{error}）。今日の予定は取得できていません。
      </p>
    );
  }

  if (events.length === 0) {
    return <p className="text-sm text-fog">今日の予定はありません。</p>;
  }

  return (
    <ul className={listCardClass}>
      {events.map((event) => (
        <li
          key={event.occurrenceKey}
          className={`flex items-baseline gap-4 ${listRowClass}`}
        >
          <span className="w-24 shrink-0 font-mono text-xs text-fog tabular-nums">
            {event.allDay
              ? "終日"
              : `${formatTime(event.start)}–${formatTime(event.end)}`}
          </span>
          <span className="min-w-0 text-sm text-ink">{event.summary}</span>
        </li>
      ))}
    </ul>
  );
}
