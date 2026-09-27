import { prisma } from "@/lib/db/client";

const SETTINGS_ID = "singleton";

export interface SettingsView {
  aiModel: string;
  /// 生の API キーではなく、設定済みか・末尾4桁のみを返す（画面に平文を出さないため）。
  aiApiKeyMasked: string | null;
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
  };
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
