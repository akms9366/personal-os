import { prisma } from "./client";
import {
  isCategoryFor,
  isFinanceType,
  type FinanceDraft,
} from "@/lib/domain/finance";
import { isDateString } from "@/lib/time/jst";

// 収支記録（FinanceRecord）。保存は利用者の確認後のみ（AI は下書きを作るだけ）。

export class FinanceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FinanceValidationError";
  }
}

export function validateDraft(draft: FinanceDraft): void {
  if (!isDateString(draft.date)) {
    throw new FinanceValidationError(`日付が正しくありません: ${draft.date}`);
  }
  if (!isFinanceType(draft.type)) {
    throw new FinanceValidationError(`種別が正しくありません: ${draft.type}`);
  }
  if (!Number.isInteger(draft.amount) || draft.amount <= 0) {
    throw new FinanceValidationError(`金額が正しくありません: ${draft.amount}`);
  }
  if (!isCategoryFor(draft.type, draft.category)) {
    throw new FinanceValidationError(
      `カテゴリが正しくありません: ${draft.category}`,
    );
  }
  if (draft.description.trim().length === 0) {
    throw new FinanceValidationError("内容を入力してください。");
  }
}

export async function createFinanceRecords(
  drafts: FinanceDraft[],
  source: "ai" | "manual",
  sourceText: string | null,
) {
  drafts.forEach(validateDraft);
  await prisma.$transaction(
    drafts.map((draft) =>
      prisma.financeRecord.create({
        data: {
          date: draft.date,
          type: draft.type,
          amount: draft.amount,
          category: draft.category,
          description: draft.description.trim(),
          paymentMethod: draft.paymentMethod.trim() || null,
          memo: draft.memo.trim() || null,
          source,
          sourceText,
        },
      }),
    ),
  );
}

export async function updateFinanceRecord(id: string, draft: FinanceDraft) {
  validateDraft(draft);
  return prisma.financeRecord.update({
    where: { id },
    data: {
      date: draft.date,
      type: draft.type,
      amount: draft.amount,
      category: draft.category,
      description: draft.description.trim(),
      paymentMethod: draft.paymentMethod.trim() || null,
      memo: draft.memo.trim() || null,
    },
  });
}

/// month: "YYYY-MM"。
export async function listFinanceRecordsByMonth(month: string) {
  return prisma.financeRecord.findMany({
    where: { date: { gte: `${month}-01`, lte: `${month}-31` } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
}

export async function listAllFinanceRecords() {
  return prisma.financeRecord.findMany({
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
}

export async function deleteFinanceRecord(id: string) {
  await prisma.financeRecord.delete({ where: { id } });
}
