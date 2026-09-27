import { SpaceScaffold } from "@/components/layout/SpaceScaffold";
import { getSpace } from "@/lib/navigation/spaces";
import { listCurrentEntries } from "@/lib/db/entries";
import { InboxItem } from "./InboxItem";

// Knowledge 空間（05 §6）。Issue #8 で「Inbox（受信箱）一覧」を実装する。
// 05 §6 の主な入口 BrainDump（断片的な入力をすばやく受け入れる）に対応する MVP の実体。
const space = getSpace("knowledge")!;

export default async function KnowledgePage() {
  const entries = await listCurrentEntries();

  return (
    <SpaceScaffold space={space}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Quick Capture で残した記録の一覧（新しい順）。分類は求めません。
        </p>

        {entries.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            まだ記録がありません。Quick Capture（ショートカット: c）で最初の1件を残せます。
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
      </div>
    </SpaceScaffold>
  );
}
