import { describe, expect, it } from "vitest";
import { expenseAmountForMonth } from "../domain/calculations";
import { buildTimelineMonths } from "../domain/date";
import type { AppState } from "../domain/types";
import { importTransactions, removeContext, toggleTransactionFlag, upsertExpense } from "./actions";

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
    purchaseFlags: [],
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
    expect(next.transactions[0]).toMatchObject({ merchantRaw: "ICA", amount: 125, type: "one-off", source: "import", flags: ["review"] });
  });

  it("markerar importerade kop utan annan signal som granska", () => {
    const next = importTransactions(state, [
      { date: "2026-02-01", bookedDate: "2026-02-02", merchantRaw: "ICA", amount: 125, currency: "SEK" },
      { date: "2026-02-03", bookedDate: "2026-02-04", merchantRaw: "HOTELL", amount: 300, currency: "SEK", flags: ["business"] }
    ]);

    expect(next.transactions.map((transaction) => transaction.flags)).toEqual([["review"], ["business"]]);
  });

  it("expanderar tidsfönstret när importerade köp ligger i äldre kontoutdrag", () => {
    const next = importTransactions(state, [
      { date: "2025-12-28", bookedDate: "2025-12-29", statementMonth: "2025-12", merchantRaw: "APOTEK", amount: 187, currency: "SEK" }
    ]);
    const context = next.contexts.find((item) => item.id === "ctx-1");

    expect(context?.monthsBack).toBeGreaterThanOrEqual(5);
  });

  it("expanderar tidsfonstret fran kopdatum aven nar kontoutdraget avser manaden efter", () => {
    const next = importTransactions(state, [
      { date: "2026-03-30", bookedDate: "2026-03-31", statementMonth: "2026-04", importId: "april 2026.pdf-123", merchantRaw: "ICA", amount: 95.85, currency: "SEK" }
    ]);
    const context = next.contexts.find((item) => item.id === "ctx-1");

    expect(context?.monthsBack).toBeGreaterThanOrEqual(2);
  });

  it("visar historik igen nar importerade kop ligger bakat i tiden", () => {
    const next = importTransactions({ ...state, hidePastMonths: true }, [
      { date: "2026-04-18", bookedDate: "2026-04-19", statementMonth: "2026-04", merchantRaw: "ICA", amount: 95.85, currency: "SEK" }
    ]);

    expect(next.hidePastMonths).toBe(false);
  });

  it("rensar filter som kan dölja importerade köp", () => {
    const next = importTransactions(
      {
        ...state,
        filters: {
          ...state.filters,
          categoryIds: ["cat-1"],
          necessityLevels: ["luxury"],
          purchaseFlags: ["business"],
          search: "business"
        }
      },
      [{ date: "2026-04-18", bookedDate: "2026-04-19", statementMonth: "2026-04", merchantRaw: "ICA", amount: 95.85, currency: "SEK" }]
    );

    expect(next.filters).toMatchObject({
      categoryIds: [],
      payerIds: [],
      necessityLevels: [],
      purchaseFlags: [],
      search: ""
    });
  });
});

describe("toggleTransactionFlag", () => {
  it("ersatter tidigare kopssignal nar en ny signal valjs", () => {
    const next = toggleTransactionFlag(
      {
        ...state,
        transactions: [
          {
            id: "txn-1",
            contextId: "ctx-1",
            date: "2026-02-01",
            amount: 125,
            currency: "SEK",
            merchantRaw: "ICA",
            merchantNormalized: "ICA",
            source: "import",
            type: "one-off",
            flags: ["review"],
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z"
          }
        ]
      },
      "txn-1",
      "business"
    );

    expect(next.transactions[0].flags).toEqual(["business"]);
  });

  it("slacker signalen nar samma signal valjs igen", () => {
    const next = toggleTransactionFlag(
      {
        ...state,
        transactions: [
          {
            id: "txn-1",
            contextId: "ctx-1",
            date: "2026-02-01",
            amount: 125,
            currency: "SEK",
            merchantRaw: "ICA",
            merchantNormalized: "ICA",
            source: "import",
            type: "one-off",
            flags: ["business"],
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z"
          }
        ]
      },
      "txn-1",
      "business"
    );

    expect(next.transactions[0].flags).toEqual([]);
  });
});

describe("removeContext", () => {
  it("raderar vald kontext och all data som hör till den", () => {
    const next = removeContext({
      ...state,
      activeContextId: "ctx-2",
      contexts: [
        ...state.contexts,
        { id: "ctx-2", name: "Resa", currency: "SEK", monthsBack: 1, monthsForward: 1, plan: "free", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }
      ],
      people: [...state.people, { id: "per-2", contextId: "ctx-2", firstName: "Ada", lastName: "Test", active: true }],
      suppliers: [...state.suppliers, { id: "sup-2", contextId: "ctx-2", name: "SJ" }],
      categories: [...state.categories, { id: "cat-2", contextId: "ctx-2", name: "Resa", color: "#7db7ee", icon: "tag" }],
      expenses: [
        ...state.expenses,
        { id: "exp-2", contextId: "ctx-2", supplierId: "sup-2", categoryId: "cat-2", name: "Tåg", necessityLevel: "comfortable", status: "active", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }
      ],
      costPeriods: [...state.costPeriods, { id: "cost-2", expenseId: "exp-2", amount: 500, recurrence: "one-time", startDate: "2026-02-01" }],
      attachments: [{ id: "att-2", contextId: "ctx-2", expenseId: "exp-2", fileName: "ticket.pdf", mimeType: "application/pdf", size: 10, blobRef: "blob", dataUrl: "data:", createdAt: "2026-01-01T00:00:00.000Z" }],
      reminders: [{ id: "rem-2", contextId: "ctx-2", expenseId: "exp-2", date: "2026-02-01", title: "Kolla", done: false }],
      transactions: [{ id: "txn-2", contextId: "ctx-2", date: "2026-02-01", amount: 100, currency: "SEK", merchantRaw: "SJ", merchantNormalized: "SJ", source: "manual", type: "one-off", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }],
      merchantRules: [{ id: "rule-2", contextId: "ctx-2", pattern: "SJ", merchantName: "SJ", categoryId: "cat-2", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }],
      filters: {
        ...state.filters,
        categoryIds: ["cat-1", "cat-2"],
        payerIds: ["per-2"],
        simulationExcludedExpenseIds: ["exp-2"]
      }
    }, "ctx-2");

    expect(next.activeContextId).toBe("ctx-1");
    expect(next.contexts.map((context) => context.id)).toEqual(["ctx-1"]);
    expect(next.people).toHaveLength(0);
    expect(next.suppliers.map((supplier) => supplier.id)).toEqual(["sup-1"]);
    expect(next.categories.map((category) => category.id)).toEqual(["cat-1"]);
    expect(next.expenses.map((expense) => expense.id)).toEqual(["exp-1"]);
    expect(next.costPeriods.map((period) => period.id)).toEqual(["cost-1"]);
    expect(next.attachments).toHaveLength(0);
    expect(next.reminders).toHaveLength(0);
    expect(next.transactions).toHaveLength(0);
    expect(next.merchantRules).toHaveLength(0);
    expect(next.filters.categoryIds).toEqual(["cat-1"]);
    expect(next.filters.payerIds).toEqual([]);
    expect(next.filters.simulationExcludedExpenseIds).toEqual([]);
  });

  it("behåller sista kvarvarande kontexten", () => {
    expect(removeContext(state, "ctx-1")).toBe(state);
  });
});
