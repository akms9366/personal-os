import { SpaceScaffold } from "@/components/layout/SpaceScaffold";
import { getSpace } from "@/lib/navigation/spaces";
import { listCurrentEntries } from "@/lib/db/entries";
import { InboxItem } from "./InboxItem";
import { JournalForm } from "./JournalForm";
import { KnowledgeTabs } from "./KnowledgeTabs";
import {
  emptyClass,
  eyebrowClass,
  sectionTitleClass,
} from "@/components/ui/styles";

// Knowledge 空間（05 §6）。Issue #8 で「Inbox（受信箱）一覧」を実装する。
// 05 §6 の主な入口 BrainDump（断片的な入力をすばやく受け入れる）に対応する MVP の実体。
const space = getSpace("knowledge")!;

// Inbox は毎回の DB の内容を表示する。付けないとビルド時に静的ページとして固まり、
// Quick Capture で保存した記録が（本番で）表示されない。
export const dynamic = "force-dynamic";

export default async function KnowledgePage() {
  const entries = await listCurrentEntries();

  return (
    <SpaceScaffold space={space}>
      <KnowledgeTabs />
      <div className="flex flex-col gap-12">
        <JournalForm />

        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h2 className={sectionTitleClass}>Inbox</h2>
            <p className={eyebrowClass}>
              Quick Capture・Journal
              で残した記録の一覧（新しい順）。分類は求めません。
            </p>
          </div>

          {entries.length === 0 ? (
            <p className={emptyClass}>
              まだ記録がありません。Quick Capture（ショートカット:
              c）で最初の1件を残せます。
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {entries.map((entry) => (
                <InboxItem
                  key={entry.id}
                  entry={{
                    id: entry.id,
                    kind: entry.kind,
                    body: entry.body,
                    createdAt: entry.createdAt.toISOString(),
                  }}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </SpaceScaffold>
  );
}
