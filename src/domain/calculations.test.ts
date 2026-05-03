import { describe, expect, it } from "vitest";
import { buildTimelineMonths, toMonthKey } from "./date";
import { cashflowTotals, earliestFreeMonth, expenseAmountForMonth, monthlyTotals, simulatedMonthlyTotals } from "./calculations";
import type { Expense, ExpenseCostPeriod } from "./types";

const baseExpense: Expense = {
  id: "expense-1",
  contextId: "context-1",
  name: "Årsutgift",
  necessityLevel: "necessary",
  startDate: "2026-01-01",
  status: "active",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

describe("cost calculations", () => {
  it("periodiserar årsutgifter per månad", () => {
    const months = buildTimelineMonths(0, 1, new Date("2026-01-15"));
    const period: ExpenseCostPeriod = {
      id: "period-1",
      expenseId: baseExpense.id,
      amount: 1200,
      recurrence: "yearly",
      startDate: "2026-01-01"
    };

    expect(expenseAmountForMonth(baseExpense, [period], months[0]).amount).toBe(100);
    expect(expenseAmountForMonth(baseExpense, [period], months[1]).amount).toBe(100);
  });

  it("visar årsutgift som faktisk kontodragning i betalningsmånaden", () => {
    const months = buildTimelineMonths(0, 2, new Date("2026-01-15"));
    const period: ExpenseCostPeriod = {
      id: "period-1",
      expenseId: baseExpense.id,
      amount: 1200,
      recurrence: "yearly",
      startDate: "2026-01-01",
      chargeDay: 27
    };

    expect(cashflowTotals([baseExpense], [period], months)).toEqual({
      "2026-01": 1200,
      "2026-02": 0,
      "2026-03": 0
    });
  });

  it("beräknar tidigaste utgiftsfria månad deterministiskt", () => {
    const expense: Expense = {
      ...baseExpense,
      noticePeriodValue: 1,
      noticePeriodUnit: "months"
    };

    expect(earliestFreeMonth(expense, new Date("2026-05-10"))).toBe("2026-07");
  });

  it("summerar synliga utgifter per månad", () => {
    const months = buildTimelineMonths(0, 0, new Date("2026-01-15"));
    const period: ExpenseCostPeriod = {
      id: "period-1",
      expenseId: baseExpense.id,
      amount: 500,
      recurrence: "monthly",
      startDate: "2026-01-01"
    };

    expect(monthlyTotals([baseExpense], [period], months)).toEqual({ "2026-01": 500 });
  });
  it("respekterar startdatum vid manadsgranser", () => {
    const months = buildTimelineMonths(0, 1, new Date(2026, 1, 15));
    const expense: Expense = {
      ...baseExpense,
      name: "Biltvatt",
      startDate: "2026-03-01"
    };
    const period: ExpenseCostPeriod = {
      id: "period-1",
      expenseId: expense.id,
      amount: 299,
      recurrence: "monthly",
      startDate: "2026-03-01"
    };

    expect(toMonthKey("2026-03-01")).toBe("2026-03");
    expect(expenseAmountForMonth(expense, [period], months[0]).amount).toBe(0);
    expect(expenseAmountForMonth(expense, [period], months[1]).amount).toBe(299);
  });

  it("simulerar uppsagning fran tidigaste mojliga manad", () => {
    const months = buildTimelineMonths(0, 2, new Date(2026, 4, 10));
    const period: ExpenseCostPeriod = {
      id: "period-1",
      expenseId: baseExpense.id,
      amount: 500,
      recurrence: "monthly",
      startDate: "2026-01-01"
    };

    expect(simulatedMonthlyTotals([{ ...baseExpense, noticePeriodValue: 1, noticePeriodUnit: "months" }], [period], months, [baseExpense.id], new Date(2026, 4, 10))).toEqual({
      "2026-05": 500,
      "2026-06": 500,
      "2026-07": 0
    });
  });

  it("simulerar uppsagning omgaende nar uppsagningstid saknas", () => {
    const months = buildTimelineMonths(0, 1, new Date(2026, 4, 10));
    const period: ExpenseCostPeriod = {
      id: "period-1",
      expenseId: baseExpense.id,
      amount: 500,
      recurrence: "monthly",
      startDate: "2026-01-01"
    };

    expect(simulatedMonthlyTotals([baseExpense], [period], months, [baseExpense.id], new Date(2026, 4, 10))).toEqual({
      "2026-05": 0,
      "2026-06": 0
    });
  });
});
