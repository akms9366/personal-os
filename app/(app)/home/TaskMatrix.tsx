import { TASK_LEVEL_LABELS, type TaskLevel } from "@/lib/domain/task";

export interface MatrixTask {
  id: string;
  title: string;
  importance: number | null;
  urgency: number | null;
}

const LEVELS_DESC: TaskLevel[] = [3, 2, 1];

/// 重要度 × 緊急度（各3段階）のマトリクス。縦=重要度（上ほど高い）、横=緊急度（左ほど高い）。
/// 未完了タスクのみを対象にし、重要度・緊急度が未設定のタスクは件数のみ表示する。
export function TaskMatrix({ tasks }: { tasks: MatrixTask[] }) {
  const unset = tasks.filter(
    (task) => task.importance == null || task.urgency == null,
  ).length;

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-[auto_repeat(3,minmax(0,1fr))] gap-1 text-xs">
        <div />
        {LEVELS_DESC.map((urgency) => (
          <div
            key={urgency}
            className="pb-1 text-center text-zinc-500 dark:text-zinc-400"
          >
            緊急{urgency}
            <span className="ml-0.5">{TASK_LEVEL_LABELS[urgency]}</span>
          </div>
        ))}
        {LEVELS_DESC.map((importance) => (
          <MatrixRow key={importance} importance={importance} tasks={tasks} />
        ))}
      </div>
      {unset > 0 ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          重要度・緊急度が未設定のタスク: {unset}
          件（タスクを開いて設定できます）
        </p>
      ) : null}
    </div>
  );
}

function MatrixRow({
  importance,
  tasks,
}: {
  importance: TaskLevel;
  tasks: MatrixTask[];
}) {
  return (
    <>
      <div className="flex items-center pr-1 text-zinc-500 [writing-mode:horizontal-tb] dark:text-zinc-400">
        重要{importance}
      </div>
      {LEVELS_DESC.map((urgency) => {
        const cell = tasks.filter(
          (task) => task.importance === importance && task.urgency === urgency,
        );
        // 重要度と緊急度の和が大きいセルほど濃く（注意を向けやすく）する。
        const weight = importance + urgency;
        const tone =
          weight >= 6
            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
            : weight >= 5
              ? "bg-zinc-300 text-zinc-900 dark:bg-zinc-600 dark:text-zinc-50"
              : weight >= 4
                ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                : "border border-zinc-200 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300";
        return (
          <div
            key={urgency}
            className={`flex min-h-14 flex-col gap-0.5 rounded-md p-1.5 ${tone}`}
            title={cell.map((task) => task.title).join("\n")}
          >
            <span className="text-sm font-semibold">{cell.length}</span>
            {cell.slice(0, 2).map((task) => (
              <span key={task.id} className="truncate text-[11px] opacity-90">
                {task.title}
              </span>
            ))}
            {cell.length > 2 ? (
              <span className="text-[11px] opacity-70">
                ほか{cell.length - 2}件
              </span>
            ) : null}
          </div>
        );
      })}
    </>
  );
}
