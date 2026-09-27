import { prisma } from "@/lib/db/client";
import { validateIcsUrl } from "@/lib/calendar/ics";

const SETTINGS_ID = "singleton";

export interface SettingsView {
  aiModel: string;
  /// 生の API キーではなく、設定済みか・末尾4桁のみを返す（画面に平文を出さないため）。
  aiApiKeyMasked: string | null;
  /// Google Calendar（ICS）接続状態。秘密URLそのものは画面へ一切渡さない。
  calendarConnected: boolean;
  calendarLastSyncAt: string | null;
  calendarLastSyncError: string | null;
}

function maskApiKey(key: string | null): string | null {
  if (!key) {
    return null;
  }
  const tail = key.slice(-4);
  return `••••••••${tail}`;
}

/// 現在の設定を取得する（未作成なら既定値のシングルトン行を返す。DB へは書き込まない）。
export async function getSettings(): Promise<SettingsView> {
  const row = await prisma.settings.findUnique({ where: { id: SETTINGS_ID } });
  return {
    aiModel: row?.aiModel ?? "claude-sonnet-5",
    aiApiKeyMasked: maskApiKey(row?.aiApiKey ?? null),
    calendarConnected: Boolean(row?.calendarIcsUrl),
    calendarLastSyncAt: row?.calendarLastSyncAt?.toISOString() ?? null,
    calendarLastSyncError: row?.calendarLastSyncError ?? null,
  };
}

/// Issue #14（今日の予定の表示）が実際の取得に使う、秘密URLそのもの。
/// 画面には一切渡さない（サーバ内部専用）。
export async function getCalendarIcsUrl(): Promise<string | null> {
  const row = await prisma.settings.findUnique({ where: { id: SETTINGS_ID } });
  return row?.calendarIcsUrl ?? null;
}

/// AI & Automation 枠の設定を更新する。
/// apiKey が空文字/undefined の場合は既存キーを保持する（うっかり空欄保存で消さない）。
export async function updateAiSettings(params: {
  apiKey?: string;
  model: string;
}): Promise<void> {
  const existing = await prisma.settings.findUnique({ where: { id: SETTINGS_ID } });
  const nextApiKey =
    params.apiKey && params.apiKey.trim().length > 0
      ? params.apiKey.trim()
      : (existing?.aiApiKey ?? null);

  await prisma.settings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, aiApiKey: nextApiKey, aiModel: params.model },
    update: { aiApiKey: nextApiKey, aiModel: params.model },
  });
}

export interface ConnectCalendarResult {
  ok: boolean;
  error?: string;
}

/// Google Calendar（ICS）接続を試みる（Issue #13）。検証に成功した場合のみ保存する
/// （壊れたURLを「接続済み」として保存しない。誠実な失敗表示、`11 §9`）。
export async function connectCalendar(icsUrl: string): Promise<ConnectCalendarResult> {
  const result = await validateIcsUrl(icsUrl);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  await prisma.settings.upsert({
    where: { id: SETTINGS_ID },
    create: {
      id: SETTINGS_ID,
      calendarIcsUrl: icsUrl,
      calendarLastSyncAt: new Date(),
      calendarLastSyncError: null,
    },
    update: {
      calendarIcsUrl: icsUrl,
      calendarLastSyncAt: new Date(),
      calendarLastSyncError: null,
    },
  });
  return { ok: true };
}

/// 接続を切断する（Issue #13 完了条件）。秘密URL・同期状態を消去する。
export async function disconnectCalendar(): Promise<void> {
  await prisma.settings.update({
    where: { id: SETTINGS_ID },
    data: {
      calendarIcsUrl: null,
      calendarLastSyncAt: null,
      calendarLastSyncError: null,
    },
  });
}

/// 今日の予定の取得に成功した記録（Issue #14）。
export async function recordCalendarSyncSuccess(): Promise<void> {
  await prisma.settings.update({
    where: { id: SETTINGS_ID },
    data: { calendarLastSyncAt: new Date(), calendarLastSyncError: null },
  });
}

/// 今日の予定の取得に失敗した記録（Issue #14、`11 §9` 誠実な失敗）。
export async function recordCalendarSyncError(message: string): Promise<void> {
  await prisma.settings.update({
    where: { id: SETTINGS_ID },
    data: { calendarLastSyncError: message },
  });
}
