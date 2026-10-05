import type { TaskStatus } from "@/lib/domain/task";
import { metaClass, sectionTitleClass } from "@/components/ui/styles";

export interface HandoffView {
  reflection?: { date: Date; body: string };
  heldTaskTitles: string[];
}

export interface CurrentStateProps {
  taskCounts: Record<TaskStatus, number>;
  calendar: {
    connected: boolean;
    error?: string;
    todayEventCount: number;
    nextEvent?: { start: Date; summary: string };
  };
  handoff?: HandoffView;
}

function formatTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const REFLECTION_PREVIEW_MAX_LENGTH = 150;

function previewReflection(body: string): string {
  const firstLine = body.split("\n")[0].trim();
  const source = firstLine.length > 0 ? firstLine : body.trim();
  if (source.length <= REFLECTION_PREVIEW_MAX_LENGTH) {
    return source;
  }
  return `${source.slice(0, REFLECTION_PREVIEW_MAX_LENGTH - 1)}…`;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1">
      <dd className="text-3xl leading-none font-normal tracking-[-0.025em] text-ink tabular-nums">
        {value}
      </dd>
      <dt className={`order-first ${metaClass}`}>{label}</dt>
    </div>
  );
}

// 現在地（Current State）領域（Issue #15、Glossary「今の状況・未解決事項・注意すべき変化」の要約）。
// 全履歴の羅列ではなく要約に留める。根拠のない緊急度（「遅れています」等）は出さない。
// 件数は中立的な数字として示し、強調色や警告表現は使わない（05 §9.4）。
export function CurrentState({
  taskCounts,
  calendar,
  handoff,
}: CurrentStateProps) {
  let calendarSummary: string;
  if (!calendar.connected) {
    calendarSummary = "カレンダー未接続。";
  } else if (calendar.error) {
    calendarSummary = `カレンダー同期エラー（${calendar.error}）。`;
  } else if (calendar.todayEventCount === 0) {
    calendarSummary = "今日の予定はありません。";
  } else if (calendar.nextEvent) {
    calendarSummary = `今日の予定 ${calendar.todayEventCount}件（次: ${formatTime(
      calendar.nextEvent.start,
    )} ${calendar.nextEvent.summary}）`;
  } else {
    calendarSummary = `今日の予定 ${calendar.todayEventCount}件。`;
  }

  return (
    <section className="flex flex-col gap-6 rounded-2xl bg-cream p-6">
      <h2 className={sectionTitleClass}>現在地</h2>

      <dl className="grid grid-cols-3 gap-4">
        <Stat label="未着手" value={taskCounts.todo} />
        <Stat label="進行中" value={taskCounts.doing} />
        <Stat label="保留" value={taskCounts.hold} />
      </dl>

      <p
        className={`text-sm leading-relaxed ${
          calendar.connected && calendar.error ? "text-danger" : "text-steel"
        }`}
      >
        {calendarSummary}
      </p>

      {handoff && (handoff.reflection || handoff.heldTaskTitles.length > 0) ? (
        <div className="flex flex-col gap-2 border-t border-dove/60 pt-5">
          <h3 className={metaClass}>引継ぎ</h3>
          <ul className="flex flex-col gap-2 text-sm leading-relaxed text-steel">
            {handoff.reflection ? (
              <li>
                <span className="font-mono text-[11px] text-pewter">
                  {formatDate(handoff.reflection.date)}
                </span>{" "}
                前回の振り返り: {previewReflection(handoff.reflection.body)}
              </li>
            ) : null}
            {handoff.heldTaskTitles.length > 0 ? (
              <li>保留中: {handoff.heldTaskTitles.join("・")}</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
