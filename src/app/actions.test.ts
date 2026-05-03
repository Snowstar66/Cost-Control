import { describe, expect, it } from "vitest";
import { expenseAmountForMonth } from "../domain/calculations";
import { buildTimelineMonths } from "../domain/date";
import type { AppState } from "../domain/types";
import { importTransactions, upsertExpense } from "./actions";

const state: AppState = {
  version: 1,
  activeContextId: "ctx-1",
  contexts: [
    {
      id: "ctx-1",
      name: "Test",
      currency: "SEK",
      monthsBack: 1,
      monthsForward: 1,
      plan: "free",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    }
  ],
  people: [],
  suppliers: [{ id: "sup-1", contextId: "ctx-1", name: "OK Q8" }],
  categories: [{ id: "cat-1", contextId: "ctx-1", name: "Transport", color: "#f7c86b", icon: "car" }],
  expenses: [
    {
      id: "exp-1",
      contextId: "ctx-1",
      supplierId: "sup-1",
      categoryId: "cat-1",
      name: "Biltvatt",
      necessityLevel: "luxury",
      startDate: "2026-02-01",
      status: "active",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    }
  ],
  costPeriods: [
    {
      id: "cost-1",
      expenseId: "exp-1",
      amount: 299,
      recurrence: "monthly",
      startDate: "2026-02-01",
      chargeDay: 25
    }
  ],
  attachments: [],
  reminders: [],
  transactions: [],
  merchantRules: [],
  onboardingComplete: true,
  hidePastMonths: false,
  purchasesEnabled: true,
  filters: {
    categoryIds: [],
    payerIds: [],
    necessityLevels: [],
    search: "",
    simulationExcludedExpenseIds: []
  }
};

describe("upsertExpense", () => {
  it("updates existing expense and period start date", () => {
    const next = upsertExpense(state, {
      id: "exp-1",
      name: "Biltvatt",
      supplierId: "sup-1",
      categoryId: "cat-1",
      amount: 299,
      recurrence: "monthly",
      chargeDay: 25,
      necessityLevel: "luxury",
      startDate: "2026-03-01"
    });
    const expense = next.expenses.find((item) => item.id === "exp-1");
    const period = next.costPeriods.find((item) => item.expenseId === "exp-1");
    const months = buildTimelineMonths(0, 1, new Date(2026, 1, 15));

    expect(expense?.startDate).toBe("2026-03-01");
    expect(period?.startDate).toBe("2026-03-01");
    expect(expenseAmountForMonth(expense!, next.costPeriods, months[0]).amount).toBe(0);
    expect(expenseAmountForMonth(expense!, next.costPeriods, months[1]).amount).toBe(299);
  });
  it("marks transactions linked to recurring expenses as recurring payments", () => {
    const next = importTransactions(state, [
      {
        date: "2026-02-25",
        bookedDate: "2026-02-25",
        merchantRaw: "OK Q8",
        amount: 299,
        currency: "SEK",
        supplierId: "sup-1",
        recurringExpenseId: "exp-1"
      }
    ]);

    expect(next.transactions[0]).toMatchObject({
      merchantRaw: "OK Q8",
      amount: 299,
      recurringExpenseId: "exp-1",
      type: "recurring-payment"
    });
  });
});

describe("importTransactions", () => {
  it("imports one-off purchases and skips duplicates", () => {
    const next = importTransactions(state, [
      { date: "2026-02-01", bookedDate: "2026-02-02", merchantRaw: "ICA", amount: 125, currency: "SEK" },
      { date: "2026-02-01", bookedDate: "2026-02-02", merchantRaw: "ICA", amount: 125, currency: "SEK" }
    ]);

    expect(next.transactions).toHaveLength(1);
    expect(next.transactions[0]).toMatchObject({ merchantRaw: "ICA", amount: 125, type: "one-off", source: "import" });
  });

  it("expanderar tidsfönstret när importerade köp ligger i äldre kontoutdrag", () => {
    const next = importTransactions(state, [
      { date: "2025-12-28", bookedDate: "2025-12-29", statementMonth: "2025-12", merchantRaw: "APOTEK", amount: 187, currency: "SEK" }
    ]);
    const context = next.contexts.find((item) => item.id === "ctx-1");

    expect(context?.monthsBack).toBeGreaterThanOrEqual(5);
  });
});
