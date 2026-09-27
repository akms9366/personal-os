import type { ReactNode } from "react";
import { SpaceScaffold } from "@/components/layout/SpaceScaffold";
import { getSpace } from "@/lib/navigation/spaces";
import { getSettings } from "@/lib/settings/store";
import { AiSettingsForm } from "./AiSettingsForm";
import { CalendarConnectionForm } from "./CalendarConnectionForm";

// Settings 空間（05 §8）。Issue #6 で骨格を実装。
// MVP（14 PR-06）では4枠のうち「AI & Automation」のみ実機能。他は後続 Issue のスタブ。
const space = getSpace("settings")!;

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </h2>
      {children}
    </section>
  );
}

function ComingSoon({ note }: { note: string }) {
  return (
    <p className="text-sm text-zinc-500 dark:text-zinc-400">{note}</p>
  );
}

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <SpaceScaffold space={space}>
      <div className="flex flex-col gap-4">
        <SettingsSection title="Intent & Preferences">
          <ComingSoon note="目的・優先度・表示設定は今後実装します（後続 Issue）。" />
        </SettingsSection>

        <SettingsSection title="Connections">
          <CalendarConnectionForm
            connected={settings.calendarConnected}
            lastSyncAt={settings.calendarLastSyncAt}
            lastSyncError={settings.calendarLastSyncError}
          />
        </SettingsSection>

        <SettingsSection title="AI & Automation">
          <AiSettingsForm
            aiModel={settings.aiModel}
            aiApiKeyMasked={settings.aiApiKeyMasked}
          />
        </SettingsSection>

        <SettingsSection title="Data & Privacy">
          <ComingSoon note="データのエクスポート・削除は今後実装します。" />
        </SettingsSection>
      </div>
    </SpaceScaffold>
  );
}
