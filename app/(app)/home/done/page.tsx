import Link from "next/link";
import { SpaceScaffold } from "@/components/layout/SpaceScaffold";
import { CsvLink } from "@/components/ui/CsvLink";
import { emptyClass, eyebrowClass } from "@/components/ui/styles";
import { getSpace } from "@/lib/navigation/spaces";
import { listTasks } from "@/lib/db/tasks";
import { organizeTasks } from "@/lib/domain/task";
import { formatDateLabel, toJstDateString } from "@/lib/time/jst";
import { TaskList } from "../TaskList";
import { toTaskView } from "../taskView";

// 完了したタスクの一覧（Home 空間の下位ページ）。期限日ごとにまとめ、新しい期限から並べる。
// 状態を戻す・編集・削除は Home の一覧と同じ操作でできる。
// Task は完了日時を持たないため、まとめる単位は期限日（期限なしは末尾）。
const space = getSpace("home")!;

export const dynamic = "force-dynamic";

export default async function DoneTasksPage() {
  const now = new Date();
  const { done } = organizeTasks(await listTasks());

  // organizeTasks の done は期限の新しい順（期限なしは末尾）。その順のまま日付で区切る。
  const groups: { label: string; tasks: typeof done }[] = [];
  for (const task of done) {
    const label = task.dueAt
      ? formatDateLabel(toJstDateString(task.dueAt))
      : "期限なし";
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.tasks.push(task);
    } else {
      groups.push({ label, tasks: [task] });
    }
  }

  return (
    <SpaceScaffold
      space={space}
      title="完了したタスク"
      description="完了にしたタスクの一覧。状態を戻したり編集したりできます。"
    >
      <div className="flex flex-col gap-10">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/home"
            className="font-mono text-xs text-fog transition hover:text-ink"
          >
            ‹ Home
          </Link>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-pewter">
              {done.length}件
            </span>
            <CsvLink kind="tasks" />
          </div>
        </div>

        {groups.length === 0 ? (
          <p className={emptyClass}>完了したタスクはまだありません。</p>
        ) : (
          groups.map((group) => (
            <section key={group.label} className="flex flex-col gap-3">
              <h2 className={eyebrowClass}>
                {group.label === "期限なし"
                  ? group.label
                  : `期限 ${group.label}`}
              </h2>
              <TaskList
                tasks={group.tasks.map((task) => toTaskView(task, now))}
                emptyText=""
              />
            </section>
          ))
        )}
      </div>
    </SpaceScaffold>
  );
}
