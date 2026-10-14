import { prisma } from "@/lib/db/client";
import {
  createInterpretationEntry,
  INTERPRETATION_SOURCE,
} from "@/lib/db/entries";
import { assertInterpretationSource } from "@/lib/domain/guard";
import {
  ANALYSIS_STALE_MS,
  InterpretationValidationError,
  isAnalysisStatus,
  normalizeInterpretation,
  serializeInterpretation,
  type AnalysisStatus,
} from "@/lib/domain/interpretation";
import { describeAiError } from "@/lib/ai/client";
import { requestInterpretation } from "@/lib/ai/interpretation";

// AI 解析（S2 解釈の生成）の実行（Issue #20）。
//
// 失敗境界: 原文（S1）の保存は投稿時に済んでいる。ここで AI が失敗しても原文は一切変わらず、
// 実行記録（AiAnalysis）に失敗として残り、後から再解析できる。
// 重複防止: 原情報の版ごとに AiAnalysis は1行。開始は「pending/failed/中断した running」からの
// 原子的な取得（updateMany）で行い、同時に来た2つ目の要求は何もしない。成功した版は再解析しない。

export interface AnalysisDeps {
  /// 原文を AI に渡して生の応答を得る。テストではモックに差し替える。
  interpret: (
    text: string,
    now: Date,
  ) => Promise<{ raw: unknown; model: string }>;
  now: () => Date;
}

const defaultDeps: AnalysisDeps = {
  interpret: requestInterpretation,
  now: () => new Date(),
};

export interface AnalysisOutcome {
  /// 呼び出し後の状態。"skipped" は他の要求が実行中・成功済みのため何もしなかったこと。
  status: AnalysisStatus | "skipped";
  error?: string;
}

function describeAnalysisError(error: unknown): string {
  if (error instanceof InterpretationValidationError) {
    return error.message;
  }
  return describeAiError(error);
}

/// 原情報（S1）の解析を予約する（行が無ければ pending で作る）。既にあれば何もしない。
export async function requestAnalysis(sourceEntryId: string): Promise<void> {
  await prisma.aiAnalysis.upsert({
    where: { sourceEntryId },
    create: { sourceEntryId },
    update: {},
  });
}

/// 原情報（S1）の版を解析し、結果を S2 Entry として保存する。
export async function runAnalysis(
  sourceEntryId: string,
  deps: AnalysisDeps = defaultDeps,
): Promise<AnalysisOutcome> {
  const source = await prisma.entry.findUnique({
    where: { id: sourceEntryId },
  });
  if (!source) {
    throw new Error(`entry not found: ${sourceEntryId}`);
  }
  assertInterpretationSource(source);

  await requestAnalysis(sourceEntryId);

  const startedAt = deps.now();
  const claimed = await prisma.aiAnalysis.updateMany({
    where: {
      sourceEntryId,
      OR: [
        { status: { in: ["pending", "failed"] } },
        {
          status: "running",
          OR: [
            { startedAt: null },
            {
              startedAt: {
                lt: new Date(startedAt.getTime() - ANALYSIS_STALE_MS),
              },
            },
          ],
        },
      ],
    },
    data: {
      status: "running",
      startedAt,
      finishedAt: null,
      error: null,
      attempts: { increment: 1 },
    },
  });
  if (claimed.count === 0) {
    return { status: "skipped" };
  }

  try {
    const { raw, model } = await deps.interpret(source.body, startedAt);
    // 検証を通らない応答は保存しない（ここで例外 → 失敗として記録）。
    const interpretation = normalizeInterpretation(raw, source.body);

    await prisma.$transaction(async (tx) => {
      // 万一、同じ版の解釈が既にあれば作らない（解釈は版ごとに1件）。
      const existing = await tx.entry.count({
        where: { sourceEntryId, source: INTERPRETATION_SOURCE },
      });
      if (existing === 0) {
        await createInterpretationEntry(tx, {
          sourceEntryId,
          body: serializeInterpretation(interpretation),
        });
      }
      await tx.aiAnalysis.update({
        where: { sourceEntryId },
        data: {
          status: "succeeded",
          model,
          error: null,
          finishedAt: deps.now(),
        },
      });
    });
    return { status: "succeeded" };
  } catch (error) {
    const message = describeAnalysisError(error);
    await prisma.aiAnalysis.update({
      where: { sourceEntryId },
      data: { status: "failed", error: message, finishedAt: deps.now() },
    });
    return { status: "failed", error: message };
  }
}

/// 現在の解析状態（画面の再取得前の確認などに使う）。
export async function getAnalysisStatus(
  sourceEntryId: string,
): Promise<AnalysisStatus | null> {
  const row = await prisma.aiAnalysis.findUnique({ where: { sourceEntryId } });
  return row && isAnalysisStatus(row.status) ? row.status : null;
}
