import { SpaceScaffold } from "@/components/layout/SpaceScaffold";
import { getSpace } from "@/lib/navigation/spaces";
import { listTasks } from "@/lib/db/tasks";
import { TaskCreateForm } from "./TaskCreateForm";
import { TaskList } from "./TaskList";

// Home 空間（05 §4「今日行動するための画面」）。
// Issue #11 で「今日」領域のうちタスク（一覧・状態遷移）を実装する。
// 現在地・振り返りは #15/#17（Epic5）で追加する。
const space = getSpace("home")!;

export default async function HomePage() {
  const tasks = await listTasks();

  return (
    <SpaceScaffold space={space}>
      <div className="flex flex-col gap-6">
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
          現在地・振り返りは今後この領域に構成します（後続 Issue #15・#17）。
        </div>
      </div>
    </SpaceScaffold>
  );
}
