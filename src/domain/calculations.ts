import { addMonths, addNotice, buildTimelineMonths, isSameOrAfterMonth, isSameOrBeforeMonth, parseDateOrToday, startOfMonth, toIsoDate, toMonthKey } from "./date";
import type { AppState, Category, Context, Expense, ExpenseCostPeriod, ExpenseMonthValue, NecessityLevel, Person, Reminder, Supplier, TimelineMonth } from "./types";

export function formatMoney(amount: number, currency = "SEK"): string {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(Math.round(amount));
}

export function currentContext(state: AppState): Context {
  return state.contexts.find((context) => context.id === state.activeContextId) ?? state.contexts[0];
}

export function byContext<T extends { contextId: string }>(items: T[], contextId: string): T[] {
  return items.filter((item) => item.contextId === contextId);
}

export function getVisibleTimelineMonths(context: Context, hidePastMonths: boolean, now = new Date()): TimelineMonth[] {
  const months = buildTimelineMonths(context.monthsBack, context.monthsForward, now);
  if (!hidePastMonths) return months;
  const currentKey = toMonthKey(now);
  return months.filter((month) => month.key >= currentKey);
}

export function monthlyAmountForPeriod(period: ExpenseCostPeriod, month: TimelineMonth): number {
  const monthKey = month.key;
  const starts = toMonthKey(period.startDate);
  const ends = period.endDate ? toMonthKey(period.endDate) : undefined;
  if (monthKey < starts || (ends && monthKey > ends)) return 0;

  const periodStart = parseDateOrToday(period.startDate);
  const monthIndex = (month.date.getFullYear() - periodStart.getFullYear()) * 12 + (month.date.getMonth() - periodStart.getMonth());
  if (monthIndex < 0) return 0;

  if (period.recurrence === "monthly") return period.amount;
  if (period.recurrence === "quarterly") return monthIndex % 3 === 0 ? period.amount : 0;
  if (period.recurrence === "yearly") return period.amount / 12;
  return monthKey === starts ? period.amount : 0;
}

export function cashflowAmountForPeriod(period: ExpenseCostPeriod, month: TimelineMonth): number {
  const monthKey = month.key;
  const starts = toMonthKey(period.startDate);
  const ends = period.endDate ? toMonthKey(period.endDate) : undefined;
  if (monthKey < starts || (ends && monthKey > ends)) return 0;

  const periodStart = parseDateOrToday(period.startDate);
  const monthIndex = (month.date.getFullYear() - periodStart.getFullYear()) * 12 + (month.date.getMonth() - periodStart.getMonth());
  if (monthIndex < 0) return 0;
  if (period.recurrence === "monthly") return period.amount;
  if (period.recurrence === "quarterly") return monthIndex % 3 === 0 ? period.amount : 0;
  if (period.recurrence === "yearly") return monthIndex % 12 === 0 ? period.amount : 0;
  return monthKey === starts ? period.amount : 0;
}

export function expenseCashflowForMonth(expense: Expense, periods: ExpenseCostPeriod[], month: TimelineMonth): number {
  if (expense.status === "cancelled") return 0;
  const inExpenseWindow = (!expense.startDate || isSameOrAfterMonth(month.date, expense.startDate)) && (!expense.endDate || isSameOrBeforeMonth(month.date, expense.endDate));
  if (!inExpenseWindow) return 0;
  return periods.filter((period) => period.expenseId === expense.id).reduce((sum, period) => sum + cashflowAmountForPeriod(period, month), 0);
}

export function earliestFreeMonth(expense: Expense, fromDate = new Date()): string | undefined {
  if (!expense.noticePeriodValue || !expense.noticePeriodUnit) return expense.endDate ? toMonthKey(addMonths(parseDateOrToday(expense.endDate), 1)) : undefined;
  const noticeEnd = addNotice(fromDate, expense.noticePeriodValue, expense.noticePeriodUnit);
  return toMonthKey(addMonths(startOfMonth(noticeEnd), 1));
}

export function isMonthLocked(expense: Expense, month: TimelineMonth, fromDate = new Date()): boolean {
  const freeMonth = earliestFreeMonth(expense, fromDate);
  if (!freeMonth) return false;
  const current = toMonthKey(fromDate);
  return month.key >= current && month.key < freeMonth;
}

export function expenseAmountForMonth(expense: Expense, periods: ExpenseCostPeriod[], month: TimelineMonth): ExpenseMonthValue {
  if (expense.status === "cancelled") {
    return { expenseId: expense.id, monthKey: month.key, amount: 0, locked: false, active: false };
  }
  const amount = periods.filter((period) => period.expenseId === expense.id).reduce((sum, period) => sum + monthlyAmountForPeriod(period, month), 0);
  const inExpenseWindow = (!expense.startDate || isSameOrAfterMonth(month.date, expense.startDate)) && (!expense.endDate || isSameOrBeforeMonth(month.date, expense.endDate));
  return {
    expenseId: expense.id,
    monthKey: month.key,
    amount: inExpenseWindow ? amount : 0,
    locked: inExpenseWindow && isMonthLocked(expense, month),
    active: inExpenseWindow && amount > 0
  };
}

export function needsNoticeInfo(expense: Expense, supplier?: Supplier): boolean {
  const hasNotice = Boolean(expense.noticePeriodValue && expense.noticePeriodUnit);
  const hasSupplierInstructions = Boolean(supplier?.cancellationInstructions?.trim());
  const looksRecurring = expense.status !== "draft" && !expense.endDate;
  return looksRecurring && !hasNotice && !hasSupplierInstructions;
}

export function createReminderForExpense(expense: Expense, contextId: string, fromDate = new Date()): Reminder | undefined {
  const freeMonth = earliestFreeMonth(expense, fromDate);
  if (!freeMonth || !expense.noticePeriodValue || !expense.noticePeriodUnit) return undefined;
  const deadline = addNotice(new Date(`${freeMonth}-01`), -expense.noticePeriodValue, expense.noticePeriodUnit);
  return {
    id: crypto.randomUUID(),
    contextId,
    expenseId: expense.id,
    date: toIsoDate(deadline),
    title: `Säg upp eller omförhandla ${expense.name}`,
    done: false
  };
}

export function filterExpenses(state: AppState, expenses: Expense[], options: { applySimulation?: boolean } = {}): Expense[] {
  const applySimulation = options.applySimulation ?? true;
  const { categoryIds, payerIds, necessityLevels, purchaseFlags, search, simulationExcludedExpenseIds } = state.filters;
  if (purchaseFlags.length > 0) return [];
  const normalized = search.trim().toLowerCase();
  return expenses.filter((expense) => {
    if (applySimulation && simulationExcludedExpenseIds.includes(expense.id)) return false;
    if (categoryIds.length && (!expense.categoryId || !categoryIds.includes(expense.categoryId))) return false;
    if (payerIds.length && (!expense.payerPersonId || !payerIds.includes(expense.payerPersonId))) return false;
    if (necessityLevels.length && !necessityLevels.includes(expense.necessityLevel)) return false;
    if (!normalized) return true;
    return expense.name.toLowerCase().includes(normalized);
  });
}

export function simulatedRemovalMonth(expense: Expense, fromDate = new Date()): string {
  return earliestFreeMonth(expense, fromDate) ?? toMonthKey(fromDate);
}

export function isSimulatedRemovedInMonth(expense: Expense, simulatedExpenseIds: string[], month: TimelineMonth, fromDate = new Date()): boolean {
  return simulatedExpenseIds.includes(expense.id) && month.key >= simulatedRemovalMonth(expense, fromDate);
}

export function simulatedExpenseAmountForMonth(expense: Expense, periods: ExpenseCostPeriod[], month: TimelineMonth, simulatedExpenseIds: string[], fromDate = new Date()): ExpenseMonthValue {
  if (isSimulatedRemovedInMonth(expense, simulatedExpenseIds, month, fromDate)) {
    return { expenseId: expense.id, monthKey: month.key, amount: 0, locked: false, active: false };
  }
  return expenseAmountForMonth(expense, periods, month);
}

export function simulatedExpenseCashflowForMonth(expense: Expense, periods: ExpenseCostPeriod[], month: TimelineMonth, simulatedExpenseIds: string[], fromDate = new Date()): number {
  return isSimulatedRemovedInMonth(expense, simulatedExpenseIds, month, fromDate) ? 0 : expenseCashflowForMonth(expense, periods, month);
}

export function monthlyTotals(expenses: Expense[], periods: ExpenseCostPeriod[], months: TimelineMonth[]): Record<string, number> {
  return Object.fromEntries(
    months.map((month) => [
      month.key,
      expenses.reduce((sum, expense) => sum + expenseAmountForMonth(expense, periods, month).amount, 0)
    ])
  );
}

export function cashflowTotals(expenses: Expense[], periods: ExpenseCostPeriod[], months: TimelineMonth[]): Record<string, number> {
  return Object.fromEntries(months.map((month) => [month.key, expenses.reduce((sum, expense) => sum + expenseCashflowForMonth(expense, periods, month), 0)]));
}

export function simulatedMonthlyTotals(expenses: Expense[], periods: ExpenseCostPeriod[], months: TimelineMonth[], simulatedExpenseIds: string[], fromDate = new Date()): Record<string, number> {
  return Object.fromEntries(
    months.map((month) => [
      month.key,
      expenses.reduce((sum, expense) => sum + simulatedExpenseAmountForMonth(expense, periods, month, simulatedExpenseIds, fromDate).amount, 0)
    ])
  );
}

export function simulatedCashflowTotals(expenses: Expense[], periods: ExpenseCostPeriod[], months: TimelineMonth[], simulatedExpenseIds: string[], fromDate = new Date()): Record<string, number> {
  return Object.fromEntries(months.map((month) => [month.key, expenses.reduce((sum, expense) => sum + simulatedExpenseCashflowForMonth(expense, periods, month, simulatedExpenseIds, fromDate), 0)]));
}

export function chargeDayHotspots(expenses: Expense[], periods: ExpenseCostPeriod[], months: TimelineMonth[]): Array<{ day: number; total: number; count: number }> {
  const buckets = new Map<number, { total: number; count: number }>();
  for (const expense of expenses) {
    for (const period of periods.filter((item) => item.expenseId === expense.id)) {
      const day = Math.min(31, Math.max(1, period.chargeDay ?? (parseDateOrToday(period.startDate).getDate() || 1)));
      const total = months.reduce((sum, month) => sum + expenseCashflowForMonth(expense, [period], month), 0);
      if (total <= 0) continue;
      const current = buckets.get(day) ?? { total: 0, count: 0 };
      buckets.set(day, { total: current.total + total, count: current.count + 1 });
    }
  }
  return [...buckets.entries()].map(([day, value]) => ({ day, ...value })).sort((a, b) => b.total - a.total);
}

export function totalsByCategory(expenses: Expense[], periods: ExpenseCostPeriod[], categories: Category[], months: TimelineMonth[]): Array<{ category: Category; total: number }> {
  return categories
    .map((category) => ({
      category,
      total: expenses
        .filter((expense) => expense.categoryId === category.id)
        .reduce((sum, expense) => sum + months.reduce((monthSum, month) => monthSum + expenseAmountForMonth(expense, periods, month).amount, 0), 0)
    }))
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total);
}

export function totalsByPerson(expenses: Expense[], periods: ExpenseCostPeriod[], people: Person[], months: TimelineMonth[]): Array<{ person: Person; total: number; incomeLeft?: number }> {
  return people
    .map((person) => {
      const total = expenses
        .filter((expense) => expense.payerPersonId === person.id)
        .reduce((sum, expense) => sum + months.reduce((monthSum, month) => monthSum + expenseAmountForMonth(expense, periods, month).amount, 0), 0);
      const averageMonthly = months.length ? total / months.length : 0;
      return {
        person,
        total,
        incomeLeft: person.monthlyAvailableIncome === undefined ? undefined : person.monthlyAvailableIncome - averageMonthly
      };
    })
    .filter((row) => row.total > 0 || row.person.monthlyAvailableIncome !== undefined)
    .sort((a, b) => b.total - a.total);
}

export function potentialSavings(expenses: Expense[], periods: ExpenseCostPeriod[], months: TimelineMonth[]): Record<Extract<NecessityLevel, "luxury" | "unnecessary">, number> {
  const rows = { luxury: 0, unnecessary: 0 };
  for (const expense of expenses) {
    if (expense.necessityLevel !== "luxury" && expense.necessityLevel !== "unnecessary") continue;
    rows[expense.necessityLevel] += months.reduce((sum, month) => sum + expenseAmountForMonth(expense, periods, month).amount, 0);
  }
  return rows;
}
