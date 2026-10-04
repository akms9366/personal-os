import { describe, expect, it } from "vitest";
import { isCategoryFor, summarize } from "./finance";

describe("finance", () => {
  it("summarizes income, expense and per-category spending", () => {
    const summary = summarize([
      { type: "income", amount: 300000, category: "給与" },
      { type: "expense", amount: 1200, category: "食費" },
      { type: "expense", amount: 5000, category: "交通" },
      { type: "expense", amount: 800, category: "食費" },
    ]);
    expect(summary.income).toBe(300000);
    expect(summary.expense).toBe(7000);
    expect(summary.balance).toBe(293000);
    expect(summary.expenseByCategory).toEqual([
      { category: "交通", amount: 5000 },
      { category: "食費", amount: 2000 },
    ]);
  });

  it("validates categories per type", () => {
    expect(isCategoryFor("expense", "食費")).toBe(true);
    expect(isCategoryFor("income", "食費")).toBe(false);
  });
});
