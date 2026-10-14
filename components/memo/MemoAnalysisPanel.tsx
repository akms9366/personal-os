import {
  CATEGORY_LABELS,
  CONFIDENCE_LABELS,
  describeWhen,
  type Interpretation,
} from "@/lib/domain/interpretation";
import {
  aiBadgeClass,
  ghostButtonClass,
  metaClass,
} from "@/components/ui/styles";
import type { MemoAnalysisView } from "./memoView";

// タイムラインの投稿に紐づく AI 解析の表示（Issue #20）。hooks を持たない表示専用。
//   - AI が分類・抽出しただけの「候補」は、Sand の AI バッジと破線の枠で示し、
//     利用者が確定した情報（本文・タグ＝実線のピル）と見た目を分ける（05 §3.1）。
//   - 常時は分類ラベルと短い要約だけ。抽出した項目は「詳細」を開いたときに出す。
//   - 解析に失敗しても原文（パネルの外）はそのまま表示され続ける。

const candidatePillClass =
  "inline-flex items-center rounded-full border border-dashed border-dove px-2 py-0.5 text-[11px] text-steel";

function AnalyzeButton({
  label,
  onAnalyze,
}: {
  label: string;
  onAnalyze?: () => void;
}) {
  if (!onAnalyze) {
    return null;
  }
  return (
    <button
      type="button"
      onClick={onAnalyze}
      className={`${ghostButtonClass} -ml-1 text-xs`}
    >
      {label}
    </button>
  );
}

function Fact({ label, value }: { label: string; value: string | null }) {
  if (!value) {
    return null;
  }
  return (
    <span>
      <span className="text-pewter">{label}</span> {value}
    </span>
  );
}

function InterpretationDetails({
  interpretation,
}: {
  interpretation: Interpretation;
}) {
  return (
    <div className="flex flex-col gap-3 pt-2 text-xs leading-relaxed text-steel">
      {interpretation.tasks.map((task, index) => (
        <div key={`task-${index}`} className="flex flex-col gap-0.5">
          <span className="text-ink">
            <span className={metaClass}>タスク候補</span> {task.title}
          </span>
          <span className="flex flex-wrap gap-x-3">
            <Fact label="期限" value={describeWhen(task.due)} />
            <Fact label="関係者" value={task.people.join("・") || null} />
            <Fact label="次の行動" value={task.nextAction} />
            <span className="text-pewter">
              {CONFIDENCE_LABELS[task.confidence]}
            </span>
          </span>
        </div>
      ))}
      {interpretation.events.map((event, index) => (
        <div key={`event-${index}`} className="flex flex-col gap-0.5">
          <span className="text-ink">
            <span className={metaClass}>予定候補</span> {event.title}
          </span>
          <span className="flex flex-wrap gap-x-3">
            <Fact label="開始" value={describeWhen(event.start)} />
            <Fact label="終了" value={describeWhen(event.end)} />
            <Fact label="場所" value={event.location} />
            <Fact label="関係者" value={event.people.join("・") || null} />
            <span className="text-pewter">
              {CONFIDENCE_LABELS[event.confidence]}
            </span>
          </span>
        </div>
      ))}
      {interpretation.knowledge ? (
        <div className="flex flex-col gap-0.5">
          <span className="text-ink">
            <span className={metaClass}>知識</span>{" "}
            {interpretation.knowledge.title}
          </span>
          {interpretation.knowledge.summary ? (
            <span>{interpretation.knowledge.summary}</span>
          ) : null}
        </div>
      ) : null}
      {interpretation.topics.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={metaClass}>タグ候補</span>
          {interpretation.topics.map((topic) => (
            <span key={topic} className={candidatePillClass}>
              #{topic}
            </span>
          ))}
        </div>
      ) : null}
      {interpretation.uncertain ? (
        <span className="text-fog">
          分類に確信が持てないため、無理に候補にしていません。
        </span>
      ) : null}
    </div>
  );
}

export function MemoAnalysisPanel({
  view,
  analyzing,
  onAnalyze,
}: {
  view: MemoAnalysisView;
  /// この画面から解析を実行中（サーバの状態を再取得するまでの間）。
  analyzing: boolean;
  /// 解析・再解析を始める。AI が使えない設定なら渡さない（ボタンを出さない）。
  onAnalyze?: () => void;
}) {
  if (analyzing || view.state === "running") {
    return (
      <p
        className="flex items-center gap-2 text-xs text-fog"
        aria-live="polite"
      >
        <span className={aiBadgeClass}>AI</span>
        <span className="size-1.5 animate-pulse rounded-full bg-sunbeam" />
        解析中…
      </p>
    );
  }

  if (view.state === "pending") {
    return (
      <p className="flex items-center gap-2 text-xs text-fog">
        <span className={aiBadgeClass}>AI</span>
        解析待ち
        <AnalyzeButton label="今すぐ解析" onAnalyze={onAnalyze} />
      </p>
    );
  }

  if (view.state === "none") {
    return onAnalyze ? (
      <div className="flex items-center gap-2">
        <span className={metaClass}>未解析</span>
        <AnalyzeButton label="AI で解析" onAnalyze={onAnalyze} />
      </div>
    ) : null;
  }

  if (view.state === "failed") {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs" role="status">
        <span className={aiBadgeClass}>AI</span>
        <span className="text-danger">解析に失敗しました</span>
        <span className="text-fog">{view.error}</span>
        <AnalyzeButton label="再解析" onAnalyze={onAnalyze} />
      </div>
    );
  }

  const { interpretation } = view;
  if (!interpretation) {
    return (
      <p className="flex items-center gap-2 text-xs text-fog">
        <span className={aiBadgeClass}>AI</span>
        解析結果を読み込めませんでした。
      </p>
    );
  }

  const hasCandidates =
    interpretation.tasks.length > 0 || interpretation.events.length > 0;

  return (
    <div
      className="flex flex-col gap-1.5 rounded-2xl border border-dashed border-dove px-3.5 py-3"
      data-ai-interpretation
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={aiBadgeClass}>AI 解釈</span>
        {interpretation.categories.map((category) => (
          <span key={category} className={candidatePillClass}>
            {CATEGORY_LABELS[category]}
          </span>
        ))}
        {hasCandidates ? <span className={metaClass}>未確定の候補</span> : null}
      </div>
      {interpretation.summary ? (
        <p className="text-sm leading-relaxed text-steel">
          {interpretation.summary}
        </p>
      ) : null}
      <details className="group">
        <summary className="cursor-pointer list-none font-mono text-[11px] text-fog hover:text-ink">
          <span className="inline-block transition group-open:rotate-90">
            ›
          </span>{" "}
          詳細と根拠
        </summary>
        <InterpretationDetails interpretation={interpretation} />
        <p className={`pt-3 ${metaClass}`}>
          この投稿の原文から AI が生成（{view.generatedLabel}
          {view.model ? ` · ${view.model}` : ""}）。原文は変更していません。
        </p>
      </details>
    </div>
  );
}
