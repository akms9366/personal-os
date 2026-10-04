import { SpaceScaffold } from "@/components/layout/SpaceScaffold";
import { getSpace } from "@/lib/navigation/spaces";
import { listTasks } from "@/lib/db/tasks";
import { getLatestReflection } from "@/lib/db/entries";
import { getTodayEvents } from "@/lib/calendar/sync";
import { getTimeOfDay } from "@/lib/home/timeOfDay";
import { organizeTasks, type TaskStatus } from "@/lib/domain/task";
import { formatDateTimeLabel, toJstDateString, toJstTimeString, todayJst } from "@/lib/time/jst";
import { CsvLink } from "@/components/ui/CsvLink";
import { CurrentState } from "./CurrentState";
import { ReflectionForm } from "./ReflectionForm";
import { TaskCreateForm } from "./TaskCreateForm";
import { TaskList, type TaskView } from "./TaskList";
import { TaskMatrix } from "./TaskMatrix";
import { TodayEvents } from "./TodayEvents";

// Home 空間（05 §4「今日行動するための画面」）。
// Issue #11 で「今日」領域のうちタスク（一覧・状態遷移）を実装。
// Issue #14 で今日の予定（read-only）を追加。
// Issue #15 で現在地領域（要約）を追加。
// Issue #17 で振り返り領域を追加（三領域が揃い Epic5 の主要部分が完成）。
const space = getSpace("home")!;

// 時間帯（Issue #17）は毎リクエストの実時刻で判定する必要があるため、静的最適化を無効化する
// （さもないと prerender 時点の時刻に固定され、夜になっても振り返りの既定展開状態が変わらない）。
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [tasks, todayEvents, latestReflection] = await Promise.all([
    listTasks(),
    getTodayEvents(),
    getLatestReflection(todayStart),
  ]);

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
  const toView = (task: (typeof tasks)[number]): TaskView => ({
    id: task.id,
    title: task.title,
    note: task.note,
    status: task.status,
    dueLabel: task.dueAt ? formatDateTimeLabel(task.dueAt) : null,
    dueDate: task.dueAt ? toJstDateString(task.dueAt) : "",
    dueTime: task.dueAt ? toJstTimeString(task.dueAt) : "23:59",
    overdue: task.dueAt ? task.dueAt.getTime() < now.getTime() : false,
    importance: task.importance,
    urgency: task.urgency,
  });

  const heldTaskTitles = tasks
    .filter((task) => task.status === "hold")
    .map((task) => task.title);

  return (
    <SpaceScaffold space={space}>
      <div className="flex flex-col gap-6">
        <CurrentState
          taskCounts={taskCounts}
          calendar={{
            connected: todayEvents.connected,
            error: todayEvents.error,
            todayEventCount: todayEvents.events.length,
            nextEvent: sortedEvents[0]
              ? { start: sortedEvents[0].start, summary: sortedEvents[0].summary }
              : undefined,
          }}
          handoff={{
            reflection: latestReflection
              ? { date: latestReflection.createdAt, body: latestReflection.body }
              : undefined,
            heldTaskTitles,
          }}
        />

        <section className="flex flex-col gap-5">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            今日
          </h2>

          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              予定
            </h3>
            <TodayEvents
              connected={todayEvents.connected}
              events={todayEvents.events}
              error={todayEvents.error}
            />
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                タスク（期限順）
              </h3>
              <CsvLink kind="tasks" />
            </div>
            <TaskCreateForm today={todayJst(now)} />
            <TaskList
              tasks={organized.timeline.map(toView)}
              emptyText="期限のあるタスクはありません。上から追加できます。"
            />
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              緊急度1（重要度順）
            </h3>
            <TaskList
              tasks={organized.lowUrgency.map(toView)}
              emptyText="緊急度1のタスクはありません。"
            />
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              重要度 × 緊急度
            </h3>
            <TaskMatrix
              tasks={[...organized.timeline, ...organized.lowUrgency].map((task) => ({
                id: task.id,
                title: task.title,
                importance: task.importance,
                urgency: task.urgency,
              }))}
            />
          </div>

          {organized.done.length > 0 ? (
            <details className="flex flex-col gap-3">
              <summary className="cursor-pointer text-xs font-medium text-zinc-500 dark:text-zinc-400">
                完了（{organized.done.length}件）
              </summary>
              <div className="pt-3">
                <TaskList tasks={organized.done.map(toView)} emptyText="" />
              </div>
            </details>
          ) : null}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            振り返り
          </h2>
          <ReflectionForm defaultExpanded={timeOfDay === "night"} />
        </section>
      </div>
    </SpaceScaffold>
  );
}
