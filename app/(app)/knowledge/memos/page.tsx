import Link from "next/link";
import { SpaceScaffold } from "@/components/layout/SpaceScaffold";
import { CsvLink } from "@/components/ui/CsvLink";
import { cardClass, sectionTitleClass } from "@/components/ui/styles";
import { getSpace } from "@/lib/navigation/spaces";
import { listMemos, listTagsWithCount } from "@/lib/db/memos";
import { formatDateLabel, toJstDateString } from "@/lib/time/jst";
import { KnowledgeTabs } from "../KnowledgeTabs";
import { MemoForm } from "./MemoForm";
import { MemoList } from "./MemoList";
import { TagManager } from "./TagManager";

const space = getSpace("knowledge")!;

export const dynamic = "force-dynamic";

export default async function MemosPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;
  const [memos, tags] = await Promise.all([
    listMemos(tag),
    listTagsWithCount(),
  ]);
  const tagNames = tags.map((t) => t.name);

  return (
    <SpaceScaffold space={space}>
      <KnowledgeTabs />
      <div className="flex flex-col gap-6">
        <section className={cardClass}>
          <h2 className={`mb-3 ${sectionTitleClass}`}>気になるメモを追加</h2>
          <MemoForm tagSuggestions={tagNames} />
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className={sectionTitleClass}>
              メモ{" "}
              {tag ? (
                <span className="font-normal text-zinc-500">#{tag}</span>
              ) : null}
            </h2>
            <CsvLink kind="memos" />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <TagFilterLink label="すべて" active={!tag} />
            {tags.map((t) => (
              <TagFilterLink
                key={t.id}
                label={`#${t.name}`}
                tag={t.name}
                active={tag === t.name}
              />
            ))}
          </div>

          <MemoList
            tagSuggestions={tagNames}
            memos={memos.map((memo) => ({
              id: memo.id,
              title: memo.title,
              body: memo.body ?? "",
              url: memo.url ?? "",
              tags: memo.tags.map((t) => t.name),
              updatedLabel: formatDateLabel(toJstDateString(memo.updatedAt)),
            }))}
          />
        </section>

        <details className={cardClass}>
          <summary className={`cursor-pointer ${sectionTitleClass}`}>
            タグを編集
          </summary>
          <div className="pt-3">
            <TagManager
              tags={tags.map((t) => ({
                id: t.id,
                name: t.name,
                count: t._count.memos,
              }))}
            />
          </div>
        </details>
      </div>
    </SpaceScaffold>
  );
}

function TagFilterLink({
  label,
  tag,
  active,
}: {
  label: string;
  tag?: string;
  active: boolean;
}) {
  return (
    <Link
      href={
        tag
          ? `/knowledge/memos?tag=${encodeURIComponent(tag)}`
          : "/knowledge/memos"
      }
      className={`rounded-full px-2.5 py-0.5 text-xs ${
        active
          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "border border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
      }`}
    >
      {label}
    </Link>
  );
}
