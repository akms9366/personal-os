import type { ReactNode } from "react";
import { SpaceScaffold } from "@/components/layout/SpaceScaffold";
import { getSpace } from "@/lib/navigation/spaces";
import { getSettings } from "@/lib/settings/store";
import {
  cardClass,
  metaClass,
  sectionTitleClass,
} from "@/components/ui/styles";
import { AiSettingsForm } from "./AiSettingsForm";
import { CalendarConnectionForm } from "./CalendarConnectionForm";

// Settings 空間（05 §8）。Issue #6 で骨格を実装。
// MVP（14 PR-06）では4枠のうち「AI & Automation」のみ実機能。他は後続 Issue のスタブ。
const space = getSpace("settings")!;

// カレンダーの最終同期など、設定画面の表示は DB の最新値に依存する。
export const dynamic = "force-dynamic";

function SettingsSection({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={cardClass}>
      <p className={`mb-2 ${metaClass}`}>{String(index).padStart(2, "0")}</p>
      <h2 className={`mb-5 ${sectionTitleClass}`}>{title}</h2>
      {children}
    </section>
  );
}

function ComingSoon({ note }: { note: string }) {
  return <p className="text-sm text-fog">{note}</p>;
}

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <SpaceScaffold space={space}>
      <div className="flex flex-col gap-4">
        <SettingsSection index={1} title="Intent & Preferences">
          <ComingSoon note="目的・優先度・表示設定は今後実装します（後続 Issue）。" />
        </SettingsSection>

        <SettingsSection index={2} title="Connections">
          <CalendarConnectionForm
            connected={settings.calendarConnected}
            lastSyncAt={settings.calendarLastSyncAt}
            lastSyncError={settings.calendarLastSyncError}
          />
        </SettingsSection>

        <SettingsSection index={3} title="AI & Automation">
          <AiSettingsForm
            aiModel={settings.aiModel}
            aiApiKeyMasked={settings.aiApiKeyMasked}
          />
        </SettingsSection>

        <SettingsSection index={4} title="Data & Privacy">
          <ComingSoon note="データのエクスポート・削除は今後実装します。" />
        </SettingsSection>
      </div>
    </SpaceScaffold>
  );
}
