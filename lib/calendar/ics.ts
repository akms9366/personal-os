import { expandRecurringEvent, sync, type VEvent } from "node-ical";

// Google Calendar 接続（Issue #13）— ICS 秘密URL方式。
// 設計参照: personal-os-design docs/14_Implementation_Backlog.md §8 PR-13
//           （OAuth 難航時の代替。「シンプル優先」で最初から採用、`04 §7` 最小権限）。
//
// ICS は読み取り専用の配信形式のため、書込みスコープが原理的に存在しない
// （OAuth のスコープ制御に相当する安全性を、方式そのものが担保する）。

export interface IcsValidationResult {
  ok: boolean;
  error?: string;
}

/// 指定 URL が実際に ICS（VCALENDAR）を返すか検証する（接続確認・#14 の取得処理と共有）。
/// 内容の詳細パースは行わない（イベント表示は Issue #14 の責務）。
export async function fetchIcsText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { Accept: "text/calendar" },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.text();
}

export async function validateIcsUrl(url: string): Promise<IcsValidationResult> {
  try {
    const text = await fetchIcsText(url);
    if (!text.includes("BEGIN:VCALENDAR")) {
      return {
        ok: false,
        error: "ICS形式ではないようです（BEGIN:VCALENDAR が見つかりません）。",
      };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? `接続に失敗しました（${error.message}）。`
          : "接続に失敗しました。",
    };
  }
}

export interface CalendarEventOccurrence {
  /// Entry 永続化の重複防止キー（UID＋発生開始時刻）。同じ occurrence を二重に保存しないため。
  occurrenceKey: string;
  summary: string;
  start: Date;
  end: Date;
  allDay: boolean;
}

/// ICS 本文から「今日」に該当するイベント発生（繰り返しイベントの展開込み）を抽出する（Issue #14）。
/// `expandRecurringEvent` が RRULE・RECURRENCE-ID・EXDATE・終日判定を担うため自前実装しない。
export function parseTodayEvents(
  icsText: string,
  now: Date = new Date(),
): CalendarEventOccurrence[] {
  const parsed = sync.parseICS(icsText);
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const occurrences: CalendarEventOccurrence[] = [];

  for (const component of Object.values(parsed)) {
    if (!component || component.type !== "VEVENT") {
      continue;
    }
    const event = component as VEvent;
    const instances = expandRecurringEvent(event, {
      from: dayStart,
      to: dayEnd,
      expandOngoing: true,
    });

    for (const instance of instances) {
      occurrences.push({
        occurrenceKey: `${event.uid}:${instance.start.toISOString()}`,
        summary:
          typeof instance.summary === "string"
            ? instance.summary
            : String(instance.summary ?? "(タイトルなし)"),
        start: instance.start,
        end: instance.end,
        allDay: instance.isFullDay,
      });
    }
  }

  occurrences.sort((a, b) => a.start.getTime() - b.start.getTime());
  return occurrences;
}
