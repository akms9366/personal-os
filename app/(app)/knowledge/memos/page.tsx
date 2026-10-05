import Link from "next/link";
import { SpaceScaffold } from "@/components/layout/SpaceScaffold";
import { CsvLink } from "@/components/ui/CsvLink";
import { eyebrowClass, metaClass } from "@/components/ui/styles";
import { getSpace } from "@/lib/navigation/spaces";
import { countMemos, listMemos, listTagsWithCount } from "@/lib/db/memos";
import { composeMemoText } from "@/lib/domain/memo";
import { formatDateTimeLabel, formatRelativeJst } from "@/lib/time/jst";
import { KnowledgeTabs } from "../KnowledgeTabs";
import { MemoComposer } from "./MemoComposer";
import { MemoTimeline } from "./MemoTimeline";
import { TagManager } from "./TagManager";

// メモ（タイムライン形式）。投稿欄＋新しい順のタイムライン、#タグ で絞り込む。
const space = getSpace("knowledge")!;

export const dynamic = "force-dynamic";

/// 作成から1分以上あとに更新されたものを「編集済み」とする（保存時の誤差を除く）。
const EDITED_THRESHOLD_MS = 60 * 1000;

export default async function MemosPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;
  const [memos, tags, total] = await Promise.all([
    listMemos(tag),
    listTagsWithCount(),
    countMemos(),
  ]);
  const now = new Date();
  // 使われている数の多いタグから並べる（同数は名前順）。
  const sortedTags = [...tags].sort(
    (a, b) =>
      b._count.memos - a._count.memos || a.name.localeCompare(b.name, "ja"),
  );
  const tagNames = sortedTags.map((t) => t.name);

  const tagList = (
    <ul className="flex gap-1 md:flex-col">
      <TagFilterLink label="すべて" count={total} active={!tag} />
      {sortedTags.map((t) => (
        <TagFilterLink
          key={t.id}
          label={`#${t.name}`}
          tag={t.name}
          count={t._count.memos}
          active={tag === t.name}
        />
      ))}
    </ul>
  );

  return (
    <SpaceScaffold space={space}>
      <KnowledgeTabs />

      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_11rem] md:gap-10">
        <div className="flex min-w-0 flex-col gap-6">
          {/* モバイル: タグは横スクロールのピル */}
          <nav
            aria-label="タグで絞り込む"
            className="-mx-4 overflow-x-auto px-4 md:hidden"
          >
            {tagList}
          </nav>

          <div className="rounded-2xl bg-cream p-4 sm:p-5">
            <MemoComposer tagSuggestions={tagNames} />
          </div>

          <section className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3 border-b border-dove/60 pb-3">
              <h2 className="text-xl font-normal tracking-[-0.025em] text-ink">
                {tag ? `#${tag}` : "タイムライン"}
              </h2>
              <span className={metaClass}>
                {memos.length}件
                {tag ? (
                  <Link
                    href="/knowledge/memos"
                    className="ml-3 text-fog underline-offset-2 hover:text-ink hover:underline"
                  >
                    絞り込みを解除
                  </Link>
                ) : null}
              </span>
            </div>
            <MemoTimeline
              tagSuggestions={tagNames}
              emptyText={
                tag
                  ? `#${tag} のメモはありません。`
                  : "まだメモがありません。上の欄から最初の1件を投稿できます。"
              }
              memos={memos.map((memo) => ({
                id: memo.id,
                text: composeMemoText(memo),
                tags: memo.tags.map((t) => t.name),
                timeLabel: formatRelativeJst(memo.createdAt, now),
                timeTitle: formatDateTimeLabel(memo.createdAt),
                edited:
                  memo.updatedAt.getTime() - memo.createdAt.getTime() >
                  EDITED_THRESHOLD_MS,
              }))}
            />
          </section>
        </div>

        {/* PC: 右サイドにタグ一覧（件数つき） */}
        <aside className="flex flex-col gap-8 md:sticky md:top-24 md:self-start">
          <div className="hidden flex-col gap-3 md:flex">
            <h2 className={eyebrowClass}>タグ</h2>
            {tagList}
          </div>
          <details className="group">
            <summary
              className={`cursor-pointer list-none ${eyebrowClass} hover:text-ink`}
            >
              <span className="inline-block transition group-open:rotate-90">
                ›
              </span>{" "}
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
          <div>
            <CsvLink kind="memos" />
          </div>
        </aside>
      </div>
    </SpaceScaffold>
  );
}

function TagFilterLink({
  label,
  tag,
  count,
  active,
}: {
  label: string;
  tag?: string;
  count: number;
  active: boolean;
}) {
  return (
    <li className="shrink-0">
      <Link
        href={
          tag
            ? `/knowledge/memos?tag=${encodeURIComponent(tag)}`
            : "/knowledge/memos"
        }
        aria-current={active ? "page" : undefined}
        className={`flex items-center justify-between gap-3 rounded-full px-3 py-1.5 text-[13px] font-medium whitespace-nowrap transition ${
          active
            ? "bg-ink text-paper"
            : "text-steel hover:bg-cream hover:text-ink"
        }`}
      >
        <span className="truncate">{label}</span>
        <span
          className={`font-mono text-[11px] ${active ? "text-paper/70" : "text-pewter"}`}
        >
          {count}
        </span>
      </Link>
    </li>
  );
}
