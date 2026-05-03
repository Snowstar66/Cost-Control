import { createContext as makeContext, createDefaultCategories, createDefaultSuppliers, cloneContextTemplate } from "../domain/seed";
import type { AppState, Attachment, Category, Context, Expense, ExpenseCostPeriod, NecessityLevel, Person, PurchaseFlag, PurchaseTransaction, Recurrence, Reminder, Supplier, TransactionType } from "../domain/types";
import { createReminderForExpense } from "../domain/calculations";

type UpsertExpenseInput = {
  id?: string;
  name: string;
  supplierId?: string;
  newSupplierName?: string;
  categoryId?: string;
  payerPersonId?: string;
  amount?: number;
  recurrence: Recurrence;
  chargeDay?: number;
  necessityLevel: NecessityLevel;
  startDate?: string;
  endDate?: string;
  noticePeriodValue?: number;
  noticePeriodUnit?: "days" | "months";
  notes?: string;
};

export type UpsertTransactionInput = {
  id?: string;
  date: string;
  bookedDate?: string;
  statementMonth?: string;
  amount: number;
  currency?: string;
  merchantRaw: string;
  merchantNormalized?: string;
  description?: string;
  location?: string;
  categoryId?: string;
  supplierId?: string;
  recurringExpenseId?: string;
  source?: "manual" | "import";
  importId?: string;
  type?: TransactionType;
  flags?: PurchaseFlag[];
  notes?: string;
};

const stamp = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

const swedishMonths: Record<string, string> = {
  januari: "01",
  februari: "02",
  mars: "03",
  april: "04",
  maj: "05",
  juni: "06",
  juli: "07",
  augusti: "08",
  september: "09",
  oktober: "10",
  november: "11",
  december: "12"
};

function normalizeDateInput(value?: string): string | undefined {
  if (!value) return undefined;
  const match = value.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/);
  return match ? `${match[1]}-${match[2]}-${match[3] ?? "01"}` : value;
}

function normalizeMerchant(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s+(AB|HB)$/i, "")
    .replace(/[-_]/g, " ")
    .toUpperCase();
}

function monthKeyFromText(value?: string): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  for (const [month, monthNumber] of Object.entries(swedishMonths)) {
    const match = normalized.match(new RegExp(`\\b${month}\\s+(20\\d{2})\\b`));
    if (match) return `${match[1]}-${monthNumber}`;
  }
  const iso = normalized.match(/\b(20\d{2})[-_ ]?(0[1-9]|1[0-2])\b/);
  if (iso) return `${iso[1]}-${iso[2]}`;
  return undefined;
}

function transactionPeriodMonthInput(transaction: Pick<UpsertTransactionInput, "date" | "bookedDate" | "statementMonth" | "importId">): string {
  const transactionMonth = (normalizeDateInput(transaction.bookedDate) ?? normalizeDateInput(transaction.date))?.slice(0, 7);
  return transactionMonth ?? transaction.statementMonth?.slice(0, 7) ?? monthKeyFromText(transaction.importId) ?? new Date().toISOString().slice(0, 7);
}

function expandContextWindowForTransactions(state: AppState, transactions: UpsertTransactionInput[]): AppState {
  const context = state.contexts.find((item) => item.id === state.activeContextId);
  if (!context || transactions.length === 0) return state;
  const now = new Date();
  const currentMonthIndex = now.getFullYear() * 12 + now.getMonth();
  let monthsBack = context.monthsBack;
  let monthsForward = context.monthsForward;
  let hasPastTransactions = false;
  for (const transaction of transactions) {
    const [year, month] = transactionPeriodMonthInput(transaction).split("-").map(Number);
    if (!year || !month) continue;
    const diff = year * 12 + (month - 1) - currentMonthIndex;
    if (diff < 0) {
      hasPastTransactions = true;
      monthsBack = Math.max(monthsBack, Math.abs(diff));
    }
    if (diff > 0) monthsForward = Math.max(monthsForward, diff);
  }
  const shouldShowHistory = state.hidePastMonths && hasPastTransactions;
  if (monthsBack === context.monthsBack && monthsForward === context.monthsForward && !shouldShowHistory) return state;
  return {
    ...state,
    hidePastMonths: shouldShowHistory ? false : state.hidePastMonths,
    contexts: state.contexts.map((item) => (item.id === context.id ? { ...item, monthsBack, monthsForward, updatedAt: stamp() } : item))
  };
}

export function addContext(state: AppState, name: string, currency = "SEK", template?: "family" | "travel" | "cohabiting", includeDefaultSuppliers = false): AppState {
  const context = makeContext(name, currency, state.contexts.length >= 2 ? "premium" : "free");
  const categories = createDefaultCategories(context.id);
  const suppliers = includeDefaultSuppliers ? createDefaultSuppliers(context.id) : [];
  const templatedCategories: Category[] =
    template === "travel"
      ? ["Boende resa", "Transport resa", "Mat", "Aktiviteter"].map((name, index) => ({ id: id("cat"), contextId: context.id, name, color: ["#7db7ee", "#f7c86b", "#a2dba6", "#b58df1"][index], icon: "tag" }))
      : template === "family"
        ? ["Boende", "Barn", "Mat", "Transport", "Försäkring"].map((name, index) => ({ id: id("cat"), contextId: context.id, name, color: ["#7db7ee", "#f7c86b", "#a2dba6", "#4fc4bd", "#f58e92"][index], icon: "tag" }))
        : categories;
  return {
    ...state,
    activeContextId: context.id,
    contexts: [...state.contexts, context],
    suppliers: [...state.suppliers, ...suppliers],
    categories: [...state.categories, ...templatedCategories],
    onboardingComplete: true
  };
}

export function updateContext(state: AppState, patch: Partial<Context> & { id: string }): AppState {
  return {
    ...state,
    contexts: state.contexts.map((context) => (context.id === patch.id ? { ...context, ...patch, updatedAt: stamp() } : context))
  };
}

export function removeContext(state: AppState, contextId: string): AppState {
  const context = state.contexts.find((item) => item.id === contextId);
  if (!context || state.contexts.length <= 1) return state;

  const remainingContexts = state.contexts.filter((item) => item.id !== contextId);
  const removedPeopleIds = new Set(state.people.filter((person) => person.contextId === contextId).map((person) => person.id));
  const removedCategoryIds = new Set(state.categories.filter((category) => category.contextId === contextId).map((category) => category.id));
  const removedExpenseIds = new Set(state.expenses.filter((expense) => expense.contextId === contextId).map((expense) => expense.id));
  return {
    ...state,
    activeContextId: state.activeContextId === contextId ? remainingContexts[0].id : state.activeContextId,
    contexts: remainingContexts,
    people: state.people.filter((person) => person.contextId !== contextId),
    suppliers: state.suppliers.filter((supplier) => supplier.contextId !== contextId),
    categories: state.categories.filter((category) => category.contextId !== contextId),
    expenses: state.expenses.filter((expense) => expense.contextId !== contextId),
    costPeriods: state.costPeriods.filter((period) => !removedExpenseIds.has(period.expenseId)),
    attachments: state.attachments.filter((attachment) => attachment.contextId !== contextId),
    reminders: state.reminders.filter((reminder) => reminder.contextId !== contextId),
    transactions: state.transactions.filter((transaction) => transaction.contextId !== contextId),
    merchantRules: state.merchantRules.filter((rule) => rule.contextId !== contextId),
    filters: {
      ...state.filters,
      categoryIds: state.filters.categoryIds.filter((id) => !removedCategoryIds.has(id)),
      payerIds: state.filters.payerIds.filter((id) => !removedPeopleIds.has(id)),
      simulationExcludedExpenseIds: state.filters.simulationExcludedExpenseIds.filter((id) => !removedExpenseIds.has(id))
    }
  };
}

export function duplicateCurrentContext(state: AppState, name: string): AppState {
  return cloneContextTemplate(state, state.activeContextId, name);
}

export function upsertPerson(state: AppState, person: Partial<Person> & Pick<Person, "firstName" | "lastName">): AppState {
  const contextId = state.activeContextId;
  const next: Person = {
    id: person.id ?? id("per"),
    contextId,
    firstName: person.firstName,
    lastName: person.lastName,
    monthlyAvailableIncome: person.monthlyAvailableIncome,
    active: person.active ?? true
  };
  return { ...state, people: person.id ? state.people.map((item) => (item.id === person.id ? next : item)) : [...state.people, next] };
}

export function upsertSupplier(state: AppState, supplier: Partial<Supplier> & Pick<Supplier, "name">): AppState {
  const contextId = state.activeContextId;
  const next: Supplier = {
    id: supplier.id ?? id("sup"),
    contextId,
    name: supplier.name,
    serviceType: supplier.serviceType,
    icon: supplier.icon ?? "tag",
    color: supplier.color ?? "#4fc4bd",
    logoFileId: supplier.logoFileId,
    website: supplier.website,
    email: supplier.email,
    phone: supplier.phone,
    cancellationInstructions: supplier.cancellationInstructions,
    notes: supplier.notes
  };
  return { ...state, suppliers: supplier.id ? state.suppliers.map((item) => (item.id === supplier.id ? next : item)) : [...state.suppliers, next] };
}

export function upsertCategory(state: AppState, category: Partial<Category> & Pick<Category, "name">): AppState {
  const contextId = state.activeContextId;
  const next: Category = {
    id: category.id ?? id("cat"),
    contextId,
    name: category.name,
    parentCategoryId: category.parentCategoryId,
    color: category.color ?? "#4fc4bd",
    icon: category.icon ?? "tag"
  };
  return { ...state, categories: category.id ? state.categories.map((item) => (item.id === category.id ? next : item)) : [...state.categories, next] };
}

export function removePerson(state: AppState, personId: string): AppState {
  return {
    ...state,
    people: state.people.filter((person) => person.id !== personId),
    expenses: state.expenses.map((expense) => (expense.payerPersonId === personId ? { ...expense, payerPersonId: undefined, updatedAt: stamp() } : expense))
  };
}

export function removeSupplier(state: AppState, supplierId: string): AppState {
  return {
    ...state,
    suppliers: state.suppliers.filter((supplier) => supplier.id !== supplierId),
    expenses: state.expenses.map((expense) => (expense.supplierId === supplierId ? { ...expense, supplierId: undefined, updatedAt: stamp() } : expense)),
    attachments: state.attachments.filter((attachment) => attachment.supplierId !== supplierId),
    transactions: state.transactions.map((transaction) => (transaction.supplierId === supplierId ? { ...transaction, supplierId: undefined, updatedAt: stamp() } : transaction))
  };
}

export function removeCategory(state: AppState, categoryId: string): AppState {
  return {
    ...state,
    categories: state.categories.filter((category) => category.id !== categoryId),
    expenses: state.expenses.map((expense) => (expense.categoryId === categoryId ? { ...expense, categoryId: undefined, updatedAt: stamp() } : expense)),
    transactions: state.transactions.map((transaction) => (transaction.categoryId === categoryId ? { ...transaction, categoryId: undefined, updatedAt: stamp() } : transaction))
  };
}

export function upsertExpense(state: AppState, input: UpsertExpenseInput): AppState {
  let supplierId = input.supplierId;
  let suppliers = state.suppliers;
  if (!supplierId && input.newSupplierName?.trim()) {
    supplierId = id("sup");
    suppliers = [...suppliers, { id: supplierId, contextId: state.activeContextId, name: input.newSupplierName.trim() }];
  }
  const isDraft = !input.amount || !input.categoryId || !supplierId;
  const expenseId = input.id ?? id("exp");
  const existing = state.expenses.find((expense) => expense.id === expenseId);
  const existingPeriod = state.costPeriods.find((item) => item.expenseId === expenseId);
  const startDate = normalizeDateInput(input.startDate);
  const endDate = normalizeDateInput(input.endDate);
  const expense: Expense = {
    id: expenseId,
    contextId: state.activeContextId,
    supplierId,
    categoryId: input.categoryId,
    payerPersonId: input.payerPersonId,
    name: input.name || input.newSupplierName || "Ofullständig utgift",
    necessityLevel: input.necessityLevel,
    startDate,
    endDate,
    noticePeriodValue: input.noticePeriodValue,
    noticePeriodUnit: input.noticePeriodUnit,
    status: isDraft ? "draft" : "active",
    notes: input.notes,
    createdAt: existing?.createdAt ?? stamp(),
    updatedAt: stamp()
  };
  const period: ExpenseCostPeriod | undefined = input.amount
    ? {
        id: existingPeriod?.id ?? id("cost"),
        expenseId,
        amount: input.amount,
        recurrence: input.recurrence,
        startDate: startDate || new Date().toISOString().slice(0, 10),
        endDate,
        chargeDay: input.chargeDay
      }
    : existingPeriod && (startDate || endDate)
      ? {
          ...existingPeriod,
          startDate: startDate ?? existingPeriod.startDate,
          endDate
        }
      : undefined;
  const reminders = state.reminders.filter((reminder) => reminder.expenseId !== expenseId);
  const reminder = createReminderForExpense(expense, state.activeContextId);
  return {
    ...state,
    suppliers,
    expenses: existing ? state.expenses.map((item) => (item.id === expenseId ? expense : item)) : [...state.expenses, expense],
    costPeriods: period ? [...state.costPeriods.filter((item) => item.expenseId !== expenseId), period] : state.costPeriods,
    reminders: reminder ? [...reminders, reminder] : reminders
  };
}

export function removeExpense(state: AppState, expenseId: string): AppState {
  return {
    ...state,
    expenses: state.expenses.filter((expense) => expense.id !== expenseId),
    costPeriods: state.costPeriods.filter((period) => period.expenseId !== expenseId),
    attachments: state.attachments.filter((attachment) => attachment.expenseId !== expenseId),
    reminders: state.reminders.filter((reminder) => reminder.expenseId !== expenseId),
    transactions: state.transactions.map((transaction) => (transaction.recurringExpenseId === expenseId ? { ...transaction, recurringExpenseId: undefined, updatedAt: stamp() } : transaction))
  };
}

export function transactionFingerprint(transaction: Pick<PurchaseTransaction, "date" | "bookedDate" | "amount" | "merchantRaw">): string {
  return [transaction.date, transaction.bookedDate ?? "", Math.round(transaction.amount * 100), normalizeMerchant(transaction.merchantRaw)].join("|");
}

export function upsertTransaction(state: AppState, input: UpsertTransactionInput): AppState {
  const contextId = state.activeContextId;
  const existing = input.id ? state.transactions.find((transaction) => transaction.id === input.id) : undefined;
  const merchantRaw = input.merchantRaw.trim() || input.description?.trim() || "Okänt köp";
  const next: PurchaseTransaction = {
    id: input.id ?? id("txn"),
    contextId,
    date: normalizeDateInput(input.date) ?? new Date().toISOString().slice(0, 10),
    bookedDate: normalizeDateInput(input.bookedDate),
    statementMonth: input.statementMonth,
    amount: Number(input.amount),
    currency: input.currency ?? "SEK",
    merchantRaw,
    merchantNormalized: input.merchantNormalized?.trim() || normalizeMerchant(merchantRaw),
    description: input.description,
    location: input.location,
    categoryId: input.categoryId,
    supplierId: input.supplierId,
    recurringExpenseId: input.recurringExpenseId,
    source: input.source ?? "manual",
    importId: input.importId,
    type: input.recurringExpenseId && !input.type ? "recurring-payment" : input.type ?? "one-off",
    flags: input.flags ?? existing?.flags ?? [],
    notes: input.notes,
    createdAt: existing?.createdAt ?? stamp(),
    updatedAt: stamp()
  };
  return {
    ...state,
    transactions: existing ? state.transactions.map((transaction) => (transaction.id === next.id ? next : transaction)) : [...state.transactions, next]
  };
}

export function removeTransaction(state: AppState, transactionId: string): AppState {
  return { ...state, transactions: state.transactions.filter((transaction) => transaction.id !== transactionId) };
}

export function importTransactions(state: AppState, transactions: UpsertTransactionInput[]): AppState {
  const existingFingerprints = new Set(state.transactions.map(transactionFingerprint));
  const nextTransactions: PurchaseTransaction[] = [];
  for (const input of transactions) {
    const candidate = {
      date: normalizeDateInput(input.date) ?? new Date().toISOString().slice(0, 10),
      bookedDate: normalizeDateInput(input.bookedDate),
      statementMonth: input.statementMonth,
      amount: Number(input.amount),
      merchantRaw: input.merchantRaw
    };
    const fingerprint = transactionFingerprint(candidate);
    if (existingFingerprints.has(fingerprint)) continue;
    existingFingerprints.add(fingerprint);
    const merchantRaw = input.merchantRaw.trim() || input.description?.trim() || "Okänt köp";
    nextTransactions.push({
      id: id("txn"),
      contextId: state.activeContextId,
      date: candidate.date,
      bookedDate: candidate.bookedDate,
      statementMonth: candidate.statementMonth,
      amount: candidate.amount,
      currency: input.currency ?? "SEK",
      merchantRaw,
      merchantNormalized: input.merchantNormalized?.trim() || normalizeMerchant(merchantRaw),
      description: input.description,
      location: input.location,
      categoryId: input.categoryId,
      supplierId: input.supplierId,
      recurringExpenseId: input.recurringExpenseId,
      source: input.source ?? "import",
      importId: input.importId,
      type: input.recurringExpenseId && !input.type ? "recurring-payment" : input.type ?? "one-off",
      flags: input.flags ?? [],
      notes: input.notes,
      createdAt: stamp(),
      updatedAt: stamp()
    });
  }
  const expandedState = expandContextWindowForTransactions(state, transactions);
  return {
    ...expandedState,
    purchasesEnabled: true,
    filters:
      nextTransactions.length > 0
        ? { ...expandedState.filters, categoryIds: [], payerIds: [], necessityLevels: [], purchaseFlags: [], search: "" }
        : expandedState.filters,
    transactions: [...expandedState.transactions, ...nextTransactions]
  };
}

export function toggleTransactionFlag(state: AppState, transactionId: string, flag: PurchaseFlag): AppState {
  return {
    ...state,
    transactions: state.transactions.map((transaction) => {
      if (transaction.id !== transactionId) return transaction;
      const current = new Set(transaction.flags ?? []);
      if (current.has(flag)) current.delete(flag);
      else current.add(flag);
      return { ...transaction, flags: [...current], updatedAt: stamp() };
    })
  };
}

export function cancelExpense(state: AppState, expenseId: string): AppState {
  return {
    ...state,
    expenses: state.expenses.map((expense) => (expense.id === expenseId ? { ...expense, status: "cancelled", endDate: new Date().toISOString().slice(0, 10), updatedAt: stamp() } : expense))
  };
}

export function addAttachment(state: AppState, attachment: Omit<Attachment, "id" | "contextId" | "createdAt" | "blobRef">): AppState {
  const next: Attachment = {
    ...attachment,
    id: id("file"),
    contextId: state.activeContextId,
    blobRef: id("blob"),
    createdAt: stamp()
  };
  const expenses = attachment.supplierId
    ? state.suppliers.map((supplier) => (supplier.id === attachment.supplierId ? { ...supplier, logoFileId: next.id } : supplier))
    : state.suppliers;
  return { ...state, attachments: [...state.attachments, next], suppliers: expenses };
}

export function removeAttachment(state: AppState, attachmentId: string): AppState {
  return {
    ...state,
    attachments: state.attachments.filter((attachment) => attachment.id !== attachmentId),
    suppliers: state.suppliers.map((supplier) => (supplier.logoFileId === attachmentId ? { ...supplier, logoFileId: undefined } : supplier))
  };
}

export function toggleReminder(state: AppState, reminderId: string): AppState {
  return { ...state, reminders: state.reminders.map((reminder: Reminder) => (reminder.id === reminderId ? { ...reminder, done: !reminder.done } : reminder)) };
}
