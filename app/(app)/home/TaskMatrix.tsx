import { TASK_LEVEL_LABELS, type TaskLevel } from "@/lib/domain/task";
import { metaClass } from "@/components/ui/styles";

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
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[auto_repeat(3,minmax(0,1fr))] gap-1.5 text-xs">
        <div />
        {LEVELS_DESC.map((urgency) => (
          <div key={urgency} className={`pb-1 text-center ${metaClass}`}>
            緊急{urgency}
            <span className="ml-0.5">{TASK_LEVEL_LABELS[urgency]}</span>
          </div>
        ))}
        {LEVELS_DESC.map((importance) => (
          <MatrixRow key={importance} importance={importance} tasks={tasks} />
        ))}
      </div>
      {unset > 0 ? (
        <p className="text-xs text-fog">
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
      <div className={`flex items-center pr-1 ${metaClass}`}>
        重要{importance}
      </div>
      {LEVELS_DESC.map((urgency) => {
        const cell = tasks.filter(
          (task) => task.importance === importance && task.urgency === urgency,
        );
        // 重要度と緊急度の和が大きいセルほど濃く（注意を向けやすく）する。色相は使わず明度だけで表す。
        const weight = importance + urgency;
        const tone =
          weight >= 6
            ? "bg-ink text-paper"
            : weight >= 5
              ? "bg-steel text-paper"
              : weight >= 4
                ? "bg-sand text-ink"
                : "bg-cream text-steel";
        return (
          <div
            key={urgency}
            className={`flex min-h-16 flex-col gap-0.5 rounded-lg p-2 ${tone}`}
            title={cell.map((task) => task.title).join("\n")}
          >
            <span className="text-lg leading-tight font-normal tabular-nums">
              {cell.length}
            </span>
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
