import { SpaceScaffold } from "@/components/layout/SpaceScaffold";
import { getSpace } from "@/lib/navigation/spaces";
import { listTasks } from "@/lib/db/tasks";
import { getTodayEvents } from "@/lib/calendar/sync";
import type { TaskStatus } from "@/lib/domain/task";
import { CurrentState } from "./CurrentState";
import { TaskCreateForm } from "./TaskCreateForm";
import { TaskList } from "./TaskList";
import { TodayEvents } from "./TodayEvents";

// Home 空間（05 §4「今日行動するための画面」）。
// Issue #11 で「今日」領域のうちタスク（一覧・状態遷移）を実装。
// Issue #14 で今日の予定（read-only）を追加。
// Issue #15 で現在地領域（要約）を追加。振り返りは #17（Epic5）で追加する。
const space = getSpace("home")!;

export default async function HomePage() {
  const [tasks, todayEvents] = await Promise.all([listTasks(), getTodayEvents()]);

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
        />

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            今日の予定
          </h2>
          <TodayEvents
            connected={todayEvents.connected}
            events={todayEvents.events}
            error={todayEvents.error}
          />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            今日のタスク
          </h2>
          <TaskCreateForm />
          <TaskList
            tasks={tasks.map((task) => ({
              id: task.id,
              title: task.title,
              status: task.status,
            }))}
          />
        </section>

        <div className="rounded-lg border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          振り返りは今後この領域に構成します（後続 Issue #17）。
        </div>
      </div>
    </SpaceScaffold>
  );
}
