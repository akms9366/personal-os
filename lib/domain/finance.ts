// Finance ドメイン — 収支記録の値域（SSOT）。

export const FINANCE_TYPES = ["expense", "income"] as const;
export type FinanceType = (typeof FINANCE_TYPES)[number];

export const FINANCE_TYPE_LABELS: Record<FinanceType, string> = {
  expense: "支出",
  income: "収入",
};

export const EXPENSE_CATEGORIES = [
  "食費",
  "外食",
  "日用品",
  "交通",
  "住居",
  "水道光熱",
  "通信",
  "医療",
  "衣服・美容",
  "趣味・娯楽",
  "交際",
  "教育",
  "保険",
  "税・社会保険",
  "その他",
] as const;

export const INCOME_CATEGORIES = [
  "給与",
  "賞与",
  "副収入",
  "臨時収入",
  "その他",
] as const;

export function isFinanceType(value: string): value is FinanceType {
  return (FINANCE_TYPES as readonly string[]).includes(value);
}

export function categoriesFor(type: FinanceType): readonly string[] {
  return type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

export function isCategoryFor(type: FinanceType, category: string): boolean {
  return categoriesFor(type).includes(category);
}

export interface FinanceDraft {
  date: string;
  type: FinanceType;
  amount: number;
  category: string;
  description: string;
  paymentMethod: string;
  memo: string;
}

export interface SummarizableRecord {
  type: string;
  amount: number;
  category: string;
}

export interface FinanceSummary {
  income: number;
  expense: number;
  balance: number;
  /// 支出のカテゴリ別合計（金額の大きい順）。
  expenseByCategory: { category: string; amount: number }[];
}

export function summarize(records: SummarizableRecord[]): FinanceSummary {
  let income = 0;
  let expense = 0;
  const byCategory = new Map<string, number>();
  for (const record of records) {
    if (record.type === "income") {
      income += record.amount;
    } else {
      expense += record.amount;
      byCategory.set(
        record.category,
        (byCategory.get(record.category) ?? 0) + record.amount,
      );
    }
  }
  return {
    income,
    expense,
    balance: income - expense,
    expenseByCategory: Array.from(byCategory, ([category, amount]) => ({
      category,
      amount,
    })).sort((a, b) => b.amount - a.amount),
  };
}

export function formatYen(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}
