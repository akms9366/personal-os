import { prisma } from "@/lib/db/client";
import { createEntry } from "@/lib/db/entries";
import {
  getCalendarIcsUrl,
  recordCalendarSyncError,
  recordCalendarSyncSuccess,
} from "@/lib/settings/store";
import {
  fetchIcsText,
  parseTodayEvents,
  type CalendarEventOccurrence,
} from "./ics";

export interface TodayEventsResult {
  /// カレンダーが接続されていない場合は false（未接続はエラーではない）。
  connected: boolean;
  events: CalendarEventOccurrence[];
  /// 同期失敗時のみ設定。「成功したように見せない」ため events は常に空で返す（`11 §9`）。
  error?: string;
}

/// 今日の予定を取得する（Issue #14）。取得できたイベントは
/// Entry(origin=external, kind=event) として保持する（重複防止つき、来歴 P3）。
/// 取得・解析に失敗した場合は空の予定として扱わず、必ず error を返す。
export async function getTodayEvents(): Promise<TodayEventsResult> {
  const icsUrl = await getCalendarIcsUrl();
  if (!icsUrl) {
    return { connected: false, events: [] };
  }

  let text: string;
  try {
    text = await fetchIcsText(icsUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "取得に失敗しました";
    await recordCalendarSyncError(message);
    return { connected: true, events: [], error: message };
  }

  let occurrences: CalendarEventOccurrence[];
  try {
    occurrences = parseTodayEvents(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : "解析に失敗しました";
    await recordCalendarSyncError(message);
    return { connected: true, events: [], error: message };
  }

  await Promise.all(occurrences.map(persistEventEntry));
  await recordCalendarSyncSuccess();

  return { connected: true, events: occurrences };
}

/// 発生済みの occurrence を Entry として保持する。同じ occurrence（UID＋開始時刻）は
/// 再取得のたびに重複作成しない（source を安定キーとして冪等にする）。
async function persistEventEntry(occurrence: CalendarEventOccurrence): Promise<void> {
  const source = `google-calendar:${occurrence.occurrenceKey}`;
  const existing = await prisma.entry.findFirst({ where: { source } });
  if (existing) {
    return;
  }

  await createEntry({
    kind: "event",
    body: occurrence.summary,
    source,
    origin: "external",
  });
}
