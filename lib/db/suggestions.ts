import { Prisma } from "@prisma/client";
import { prisma } from "./client";
import {
  createDecisionEntry,
  createSuggestionEntry,
  StaleDecisionError,
} from "./entries";
import { createTask } from "./tasks";
import type { Interpretation } from "../domain/interpretation";
import {
  buildDecision,
  canDecide,
  createsTask,
  DECISION_SOURCE,
  decisionEntryId,
  DecisionValidationError,
  parseStoredDecision,
  parseStoredSuggestion,
  serializeDecision,
  serializeSuggestion,
  suggestionEntryId,
  suggestionsFromInterpretation,
  SUGGESTION_SOURCE,
  type Decision,
  type DecisionInput,
  type DecisionState,
} from "../domain/suggestion";
import { parseJstDateTime } from "../time/jst";

// 行動候補（S4）の生成と、利用者の決定（S5）の記録（Issue #21）。
// 書き込みはすべて Entry のドメインガード（lib/db/entries.ts）を通す。

/// AI 解釈（S2）のタスク候補から、行動候補（S4）を作る。追加の AI 呼び出しはしない。
/// 同じ解釈から重複して作らない（id は解釈と候補の位置から決まる）。作った件数を返す。
export async function createSuggestionsForInterpretation(
  db: Prisma.TransactionClient,
  interpretationEntryId: string,
  interpretation: Interpretation,
): Promise<number> {
  let created = 0;
  for (const payload of suggestionsFromInterpretation(interpretation)) {
    const entry = await createSuggestionEntry(db, {
      id: suggestionEntryId(interpretationEntryId, payload.index),
      interpretationEntryId,
      body: serializeSuggestion(payload),
      source: SUGGESTION_SOURCE,
    });
    if (entry) {
      created += 1;
    }
  }
  return created;
}

export type DecideResult =
  | { ok: true; decision: Decision; taskId: string | null }
  | { ok: false; error: string };

const suggestionInclude = {
  // 解釈（S2）→ 原情報（S1）。Task の note に原文を残すために使う。
  sourceEntry: { include: { sourceEntry: true } },
  derivedEntries: {
    where: { state: "S5" },
    include: {
      revisedBy: { select: { id: true } },
      originatedTasks: { select: { id: true } },
    },
  },
} satisfies Prisma.EntryInclude;

/// 提案（S4）への利用者の決定（採用・修正して採用・却下・保留）を記録する。
///   - 決定は S5 Entry（origin=human）として残る。決め直しは新しい版で、前の決定は消さない。
///   - 採用（修正を含む）のときだけ、同じトランザクションで Task を作る。Task.originEntryId は
///     その決定（S5）を指す。来歴は Task → 決定 → 提案 → 解釈 → 原情報と辿れる。
///   - 却下・保留も、採用と等価に記録する。
export async function decideSuggestion(
  suggestionId: string,
  input: DecisionInput,
): Promise<DecideResult> {
  try {
    return await prisma.$transaction(async (tx) => {
      const suggestion = await tx.entry.findUnique({
        where: { id: suggestionId },
        include: suggestionInclude,
      });
      if (!suggestion || suggestion.state !== "S4") {
        return { ok: false as const, error: "提案が見つかりません。" };
      }
      const candidate = parseStoredSuggestion(suggestion.body);
      if (!candidate) {
        return { ok: false as const, error: "提案の内容を読み込めません。" };
      }

      // 現在の決定 = まだ別の決定に置き換えられていない最新の S5。
      const current =
        suggestion.derivedEntries.find((d) => d.revisedBy.length === 0) ?? null;
      const currentDecision = current
        ? await readDecision(tx, current.id)
        : null;
      const currentState: DecisionState = currentDecision ?? "undecided";
      const taskExists = (current?.originatedTasks.length ?? 0) > 0;

      const payload = buildDecision(input, candidate);
      if (!canDecide(currentState, payload.decision, taskExists)) {
        return {
          ok: false as const,
          error:
            currentState === "adopt" || currentState === "modify"
              ? "この提案はタスクとして採用済みです。タスクの編集は Home で行えます。"
              : "既にその決定になっています。",
        };
      }

      const decisionId = decisionEntryId(suggestion.id, current?.id ?? null);
      const decision = await createDecisionEntry(tx, {
        id: decisionId,
        suggestionId: suggestion.id,
        previousDecisionId: current?.id ?? null,
        body: serializeDecision(payload),
        source: DECISION_SOURCE,
      });

      let taskId: string | null = null;
      if (createsTask(payload.decision) && payload.final) {
        const { final } = payload;
        const dueAt = final.dueDate
          ? parseJstDateTime(final.dueDate, final.dueTime)
          : null;
        const original = suggestion.sourceEntry?.sourceEntry;
        const task = await createTask(
          {
            title: final.title,
            note: original?.body,
            dueAt,
            importance: final.importance,
            urgency: final.urgency,
            originEntryId: decision.id,
          },
          tx,
        );
        taskId = task.id;
      }
      return { ok: true as const, decision: payload.decision, taskId };
    });
  } catch (error) {
    if (
      error instanceof DecisionValidationError ||
      error instanceof StaleDecisionError
    ) {
      return { ok: false, error: error.message };
    }
    // 同じ状態からの同時操作は主キー（決定の id）の衝突になる。後から来た操作は何もしない。
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, error: new StaleDecisionError().message };
    }
    throw error;
  }
}

async function readDecision(
  db: Prisma.TransactionClient,
  decisionEntryId: string,
): Promise<Decision | null> {
  const row = await db.entry.findUnique({ where: { id: decisionEntryId } });
  if (!row) {
    return null;
  }
  return parseStoredDecision(row.body)?.decision ?? null;
}
