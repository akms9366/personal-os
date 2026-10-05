import Link from "next/link";
import { SpaceScaffold } from "@/components/layout/SpaceScaffold";
import { getSpace } from "@/lib/navigation/spaces";
import { listTasks } from "@/lib/db/tasks";
import { getLatestReflection } from "@/lib/db/entries";
import { listMemos, listTagsWithCount } from "@/lib/db/memos";
import { getTodayEvents } from "@/lib/calendar/sync";
import { getTimeOfDay } from "@/lib/home/timeOfDay";
import { organizeTasks, type TaskStatus } from "@/lib/domain/task";
import { formatHeadlineDateJst, todayJst } from "@/lib/time/jst";
import { MemoComposer } from "@/components/memo/MemoComposer";
import { MemoTimeline } from "@/components/memo/MemoTimeline";
import { toMemoPostView } from "@/components/memo/memoView";
import { CsvLink } from "@/components/ui/CsvLink";
import { eyebrowClass, sectionTitleClass } from "@/components/ui/styles";
import { CurrentState } from "./CurrentState";
import { ReflectionForm } from "./ReflectionForm";
import { TaskCreateForm } from "./TaskCreateForm";
import { TaskList } from "./TaskList";
import { TaskMatrix } from "./TaskMatrix";
import { TodayEvents } from "./TodayEvents";
import { toTaskView } from "./taskView";

// Home 空間（05 §4「今日行動するための画面」）。
// Issue #11 で「今日」領域のうちタスク（一覧・状態遷移）を実装。
// Issue #14 で今日の予定（read-only）を追加。
// Issue #15 で現在地領域（要約）を追加。
// Issue #17 で振り返り領域を追加（三領域が揃い Epic5 の主要部分が完成）。
// 旧 Quick Capture はメモ機能に統合し、Home に投稿欄と直近のメモを置く。
// 配置は globals.css の .home-grid（モバイル1列／PC は左にメモ・タスク、右に現在地ほか）。
const space = getSpace("home")!;

/// Home に出す直近のメモの件数（全件・タグ絞り込みはメモページ）。
const RECENT_MEMO_COUNT = 3;

// 時間帯（Issue #17）は毎リクエストの実時刻で判定する必要があるため、静的最適化を無効化する
// （さもないと prerender 時点の時刻に固定され、夜になっても振り返りの既定展開状態が変わらない）。
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [tasks, todayEvents, latestReflection, recentMemos, tags] =
    await Promise.all([
      listTasks(),
      getTodayEvents(),
      getLatestReflection(todayStart),
      listMemos(undefined, RECENT_MEMO_COUNT),
      listTagsWithCount(),
    ]);
  // 使われている数の多いタグから並べる（同数は名前順）。
  const tagNames = [...tags]
    .sort(
      (a, b) =>
        b._count.memos - a._count.memos || a.name.localeCompare(b.name, "ja"),
    )
    .map((tag) => tag.name);

  const taskCounts = tasks.reduce(
    (counts, task) => {
      const status = task.status as TaskStatus;
      counts[status] = (counts[status] ?? 0) + 1;
      return counts;
    },
    { todo: 0, doing: 0, hold: 0, done: 0 } as Record<TaskStatus, number>,
  );

  const sortedEvents = [...todayEvents.events].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );

  const timeOfDay = getTimeOfDay(now);

  const organized = organizeTasks(tasks);
  const toView = (task: (typeof tasks)[number]) => toTaskView(task, now);

  const headline = formatHeadlineDateJst(now);

  const heldTaskTitles = tasks
    .filter((task) => task.status === "hold")
    .map((task) => task.title);

  return (
    <SpaceScaffold
      space={space}
      width="wide"
      title={
        <>
          {headline.date}
          <span className="ml-3 text-2xl tracking-[-0.025em] text-fog md:ml-4 md:text-3xl">
            {headline.weekday}
          </span>
        </>
      }
    >
      <div className="home-grid">
        <section className="flex flex-col gap-4 [grid-area:memo]">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className={sectionTitleClass}>メモ</h2>
            <Link
              href="/knowledge/memos"
              className={`${eyebrowClass} transition hover:text-ink`}
            >
              すべて見る →
            </Link>
          </div>
          <div className="rounded-2xl bg-cream p-4 sm:p-5">
            <MemoComposer tagSuggestions={tagNames} />
          </div>
          {recentMemos.length > 0 ? (
            <MemoTimeline
              tagSuggestions={tagNames}
              emptyText=""
              memos={recentMemos.map((memo) => toMemoPostView(memo, now))}
            />
          ) : null}
        </section>

        <div className="[grid-area:state]">
          <CurrentState
            taskCounts={taskCounts}
            calendar={{
              connected: todayEvents.connected,
              error: todayEvents.error,
              todayEventCount: todayEvents.events.length,
              nextEvent: sortedEvents[0]
                ? {
                    start: sortedEvents[0].start,
                    summary: sortedEvents[0].summary,
                  }
                : undefined,
            }}
            handoff={{
              reflection: latestReflection
                ? {
                    date: latestReflection.createdAt,
                    body: latestReflection.body,
                  }
                : undefined,
              heldTaskTitles,
            }}
          />
        </div>

        <section className="flex flex-col gap-4 [grid-area:events]">
          <h2 className={sectionTitleClass}>今日の予定</h2>
          <TodayEvents
            connected={todayEvents.connected}
            events={todayEvents.events}
            error={todayEvents.error}
          />
        </section>

        <section className="flex flex-col gap-8 [grid-area:tasks]">
          <div className="flex items-center justify-between gap-3">
            <h2 className={sectionTitleClass}>タスク</h2>
            <CsvLink kind="tasks" />
          </div>

          <TaskCreateForm today={todayJst(now)} />

          <div className="flex flex-col gap-3">
            <h3 className={eyebrowClass}>期限順</h3>
            <TaskList
              tasks={organized.timeline.map(toView)}
              emptyText="期限のあるタスクはありません。上から追加できます。"
            />
          </div>

          <div className="flex flex-col gap-3">
            <h3 className={eyebrowClass}>緊急度1（重要度順）</h3>
            <TaskList
              tasks={organized.lowUrgency.map(toView)}
              emptyText="緊急度1のタスクはありません。"
            />
          </div>

          <Link
            href="/home/done"
            className={`self-start ${eyebrowClass} transition hover:text-ink`}
          >
            完了したタスク（{organized.done.length}件） →
          </Link>
        </section>

        <section className="flex flex-col gap-4 [grid-area:matrix]">
          <h2 className={sectionTitleClass}>重要度 × 緊急度</h2>
          <TaskMatrix
            tasks={[...organized.timeline, ...organized.lowUrgency].map(
              (task) => ({
                id: task.id,
                title: task.title,
                importance: task.importance,
                urgency: task.urgency,
              }),
            )}
          />
        </section>

        <section className="flex flex-col gap-4 [grid-area:reflection]">
          <h2 className={sectionTitleClass}>振り返り</h2>
          <ReflectionForm defaultExpanded={timeOfDay === "night"} />
        </section>
      </div>
    </SpaceScaffold>
  );
}
