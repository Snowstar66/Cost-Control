export type NecessityLevel = "necessary" | "comfortable" | "luxury" | "unnecessary";
export type NoticeUnit = "days" | "months";
export type Recurrence = "monthly" | "quarterly" | "yearly" | "one-time";
export type ExpenseStatus = "active" | "draft" | "cancelled";
export type PlanCode = "free" | "premium";
export type TransactionSource = "manual" | "import";
export type TransactionType = "one-off" | "recurring-payment" | "transfer" | "ignored";
export type PurchaseFlag = "review" | "unnecessary" | "recurringCandidate" | "worthIt" | "business";

export type Context = {
  id: string;
  name: string;
  currency: string;
  monthsBack: number;
  monthsForward: number;
  plan: PlanCode;
  createdAt: string;
  updatedAt: string;
};

export type Person = {
  id: string;
  contextId: string;
  firstName: string;
  lastName: string;
  monthlyAvailableIncome?: number;
  active: boolean;
};

export type Supplier = {
  id: string;
  contextId: string;
  name: string;
  serviceType?: string;
  icon?: string;
  color?: string;
  logoFileId?: string;
  website?: string;
  email?: string;
  phone?: string;
  cancellationInstructions?: string;
  notes?: string;
};

export type Category = {
  id: string;
  contextId: string;
  name: string;
  parentCategoryId?: string;
  color: string;
  icon: string;
};

export type ExpenseCostPeriod = {
  id: string;
  expenseId: string;
  amount: number;
  recurrence: Recurrence;
  startDate: string;
  endDate?: string;
  chargeDay?: number;
};

export type Attachment = {
  id: string;
  contextId: string;
  expenseId?: string;
  supplierId?: string;
  fileName: string;
  mimeType: string;
  size: number;
  blobRef: string;
  dataUrl: string;
  createdAt: string;
};

export type Reminder = {
  id: string;
  contextId: string;
  expenseId: string;
  date: string;
  title: string;
  done: boolean;
};

export type Expense = {
  id: string;
  contextId: string;
  supplierId?: string;
  categoryId?: string;
  payerPersonId?: string;
  name: string;
  necessityLevel: NecessityLevel;
  startDate?: string;
  endDate?: string;
  noticePeriodValue?: number;
  noticePeriodUnit?: NoticeUnit;
  status: ExpenseStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type PurchaseTransaction = {
  id: string;
  contextId: string;
  date: string;
  bookedDate?: string;
  statementMonth?: string;
  amount: number;
  currency: string;
  merchantRaw: string;
  merchantNormalized: string;
  description?: string;
  location?: string;
  categoryId?: string;
  supplierId?: string;
  recurringExpenseId?: string;
  source: TransactionSource;
  importId?: string;
  type: TransactionType;
  flags?: PurchaseFlag[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type MerchantRule = {
  id: string;
  contextId: string;
  pattern: string;
  merchantName: string;
  categoryId?: string;
  supplierId?: string;
  transactionType?: TransactionType;
  createdAt: string;
  updatedAt: string;
};

export type AppState = {
  version: number;
  activeContextId: string;
  contexts: Context[];
  people: Person[];
  suppliers: Supplier[];
  categories: Category[];
  expenses: Expense[];
  costPeriods: ExpenseCostPeriod[];
  attachments: Attachment[];
  reminders: Reminder[];
  transactions: PurchaseTransaction[];
  merchantRules: MerchantRule[];
  onboardingComplete: boolean;
  hidePastMonths: boolean;
  purchasesEnabled: boolean;
  filters: {
    categoryIds: string[];
    payerIds: string[];
    necessityLevels: NecessityLevel[];
    purchaseFlags: PurchaseFlag[];
    search: string;
    simulationExcludedExpenseIds: string[];
    budgetOutcomeStartMonth?: string;
  };
};

export type ExportPayload = {
  kind: "cost-control-context-export";
  version: number;
  exportedAt: string;
  context: Context;
  people: Person[];
  suppliers: Supplier[];
  categories: Category[];
  expenses: Expense[];
  costPeriods: ExpenseCostPeriod[];
  attachments: Attachment[];
  reminders: Reminder[];
  transactions: PurchaseTransaction[];
  merchantRules: MerchantRule[];
};

export type TimelineMonth = {
  key: string;
  label: string;
  date: Date;
  isCurrentMonth: boolean;
};

export type ExpenseMonthValue = {
  expenseId: string;
  monthKey: string;
  amount: number;
  locked: boolean;
  active: boolean;
};

export const necessityLabels: Record<NecessityLevel, string> = {
  necessary: "Nödvändig",
  comfortable: "Bekväm",
  luxury: "Lyxig",
  unnecessary: "Onödig"
};

export const recurrenceLabels: Record<Recurrence, string> = {
  monthly: "Månad",
  quarterly: "Kvartal",
  yearly: "År",
  "one-time": "Engång"
};
