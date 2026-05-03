import {
  Archive,
  BadgeDollarSign,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Cloud,
  CreditCard,
  Download,
  FileArchive,
  FileJson,
  FileText,
  Flag,
  FolderPlus,
  Gauge,
  Home,
  Import,
  LineChart,
  LockKeyhole,
  Music,
  Newspaper,
  Paperclip,
  Pencil,
  Phone,
  Play,
  Plus,
  ReceiptText,
  RefreshCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Store,
  Tag,
  Trash2,
  Upload,
  Users,
  Wallet,
  Wrench,
  X,
  Zap
} from "lucide-react";
import { Fragment, type ChangeEvent, type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  addAttachment,
  addContext,
  cancelExpense,
  duplicateCurrentContext,
  removeCategory,
  removeAttachment,
  removeExpense,
  removePerson,
  removeSupplier,
  removeTransaction,
  toggleTransactionFlag,
  toggleReminder,
  updateContext,
  upsertCategory,
  upsertExpense,
  upsertPerson,
  upsertSupplier,
  upsertTransaction,
  importTransactions,
  type UpsertTransactionInput
} from "../app/actions";
import { useAppState } from "../app/useAppState";
import {
  byContext,
  cashflowTotals,
  earliestFreeMonth,
  expenseCashflowForMonth,
  expenseAmountForMonth,
  filterExpenses,
  formatMoney,
  getVisibleTimelineMonths,
  monthlyTotals,
  simulatedCashflowTotals,
  simulatedExpenseAmountForMonth,
  simulatedExpenseCashflowForMonth,
  simulatedMonthlyTotals,
  simulatedRemovalMonth,
} from "../domain/calculations";
import { toIsoDate } from "../domain/date";
import type { Attachment, Category, Expense, ExpenseCostPeriod, NecessityLevel, Person, PurchaseFlag, PurchaseTransaction, Recurrence, Supplier, TimelineMonth } from "../domain/types";
import { necessityLabels, recurrenceLabels } from "../domain/types";
import { parseBankStatementFile, type BankStatementImportResult } from "../storage/bankStatementImport";
import { exportCsv, exportJson, exportPdf, exportRemindersIcs, exportZip, importAsNewContext, shareDataFile, validateImportPayload } from "../storage/exportImport";

const iconMap = {
  home: Home,
  car: Archive,
  wifi: Gauge,
  heart: ShieldCheck,
  sparkles: Sparkles,
  wrench: Wrench,
  tag: Tag,
  book: BookOpen,
  newspaper: Newspaper,
  cloud: Cloud,
  shield: ShieldCheck,
  phone: Phone,
  play: Play,
  music: Music,
  zap: Zap
};
const allowedFileTypes = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
const maxFileSize = 10 * 1024 * 1024;
const overviewNecessityOrder: NecessityLevel[] = ["luxury", "necessary", "comfortable", "unnecessary"];
const overviewNecessityLabels: Record<NecessityLevel, string> = {
  luxury: "Lyxigt",
  necessary: "Nödvändigt",
  comfortable: "Bekvämt",
  unnecessary: "Onödigt"
};
const overviewNecessityIcons: Record<NecessityLevel, typeof Wallet> = {
  luxury: Sparkles,
  necessary: ShieldCheck,
  comfortable: CheckCircle2,
  unnecessary: Flag
};
const purchaseFlagMeta: Record<PurchaseFlag, { label: string; shortLabel: string; tone: "blue" | "green" | "amber" | "red"; icon: typeof Wallet }> = {
  review: { label: "Granska", shortLabel: "Granska", tone: "blue", icon: ShieldCheck },
  unnecessary: { label: "Onödigt", shortLabel: "Onödigt", tone: "red", icon: Flag },
  recurringCandidate: { label: "Återkommande kandidat", shortLabel: "Kandidat", tone: "amber", icon: RefreshCcw },
  worthIt: { label: "Värt det", shortLabel: "Värt", tone: "green", icon: CheckCircle2 }
};
type ExpenseFormInput = Parameters<typeof upsertExpense>[1];
type PurchaseImportPreview = BankStatementImportResult & {
  fileName: string;
  transactions: UpsertTransactionInput[];
};
type PurchaseSaveOptions = {
  applyCategoryToSameMerchant?: boolean;
};
type PurchaseCategoryRow = {
  key: string;
  label: string;
  color: string;
  count: number;
  totals: Record<string, number>;
  transactionsByMonth: Record<string, PurchaseTransaction[]>;
};
type PurchasePeriodRow = {
  key: string;
  label: string;
  total: number;
  count: number;
  average: number;
  uniqueMerchants: number;
  topMerchants: string;
};
type MerchantInsightRow = {
  label: string;
  total: number;
  count: number;
  average: number;
  monthsActive: number;
  trend: number;
  trendLabel: string;
  trendTone: "up" | "down" | "flat" | "single";
  series: number[];
  color: string;
};
type TransactionCountRow = {
  label: string;
  count: number;
  total: number;
  average: number;
  color?: string;
};
type DecisionInsight = {
  title: string;
  value: string;
  detail: string;
  tone: "blue" | "green" | "amber" | "red";
  icon: typeof Wallet;
};
type ChartMarker = {
  monthKey: string;
  label: string;
  kind: "Utgift" | "Start" | "Avslut" | "Möjlig uppsägning" | "Simulerad uppsägning" | "Faktisk ändring";
  value: number;
  amount?: number;
  supplierName?: string;
  color: string;
  count?: number;
  necessityLevel?: NecessityLevel;
  entries?: Array<{ label: string; amount?: number; supplierName?: string; necessityLevel?: NecessityLevel }>;
};

export function App() {
  const {
    state,
    setState,
    context,
    reset,
    dataFile,
    connectDataFile,
    saveAsDataFile,
    saveDataFileNow,
    disconnectDataFile,
    cloudSync,
    configureCloudSync,
    pullCloudState,
    pushCloudStateNow,
    disconnectCloudSync
  } = useAppState();
  const [activeView, setActiveView] = useState<"overview" | "purchases" | "statistics" | "registers" | "admin" | "help">("overview");
  const activeViewLabel = activeView === "overview" ? "Översikt" : activeView === "purchases" ? "Enskilda köp" : activeView === "statistics" ? "Statistik" : activeView === "registers" ? "Register" : activeView === "admin" ? "Data" : "Hjälp";
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | undefined>();
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | undefined>();
  const [purchaseFormOpen, setPurchaseFormOpen] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<string | undefined>();
  const [purchaseImportPreview, setPurchaseImportPreview] = useState<PurchaseImportPreview | undefined>();
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [registerListsVisible, setRegisterListsVisible] = useState(true);
  const [costCurveCollapsed, setCostCurveCollapsed] = useState(true);
  const quickImportInputRef = useRef<HTMLInputElement>(null);
  const previousViewRef = useRef(activeView);

  const people = useMemo(() => byContext(state.people, context.id), [state.people, context.id]);
  const suppliers = useMemo(() => byContext(state.suppliers, context.id), [state.suppliers, context.id]);
  const categories = useMemo(() => byContext(state.categories, context.id), [state.categories, context.id]);
  const contextExpenses = useMemo(() => byContext(state.expenses, context.id), [state.expenses, context.id]);
  const transactions = useMemo(() => byContext(state.transactions, context.id), [state.transactions, context.id]);
  const expenses = useMemo(() => filterExpenses(state, contextExpenses), [state, contextExpenses]);
  const months = useMemo(() => getVisibleTimelineMonths(context, state.hidePastMonths), [context, state.hidePastMonths]);
  const totals = useMemo(() => monthlyTotals(expenses, state.costPeriods, months), [expenses, state.costPeriods, months]);
  const purchaseCategoryRows = useMemo(() => buildPurchaseCategoryRows(transactions, categories, months, state), [transactions, categories, months, state]);
  const combinedTotals = useMemo(() => combineRecurringAndPurchaseTotals(totals, purchaseCategoryRows, months), [totals, purchaseCategoryRows, months]);
  const selectedExpense = selectedExpenseId ? state.expenses.find((expense) => expense.id === selectedExpenseId) : undefined;
  const editingExpense = editingExpenseId ? state.expenses.find((expense) => expense.id === editingExpenseId) : undefined;
  const editingCostPeriod = editingExpense ? state.costPeriods.find((period) => period.expenseId === editingExpense.id) : undefined;
  const editingTransaction = editingTransactionId ? state.transactions.find((transaction) => transaction.id === editingTransactionId) : undefined;
  const selectedSupplier = selectedExpense?.supplierId ? suppliers.find((supplier) => supplier.id === selectedExpense.supplierId) : undefined;
  const selectedAttachments = selectedExpense ? state.attachments.filter((attachment) => attachment.expenseId === selectedExpense.id) : [];

  useEffect(() => {
    if (previousViewRef.current === activeView) return;
    previousViewRef.current = activeView;
    if (typeof window === "undefined" || typeof window.matchMedia !== "function" || !window.matchMedia("(max-width: 720px)").matches) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.querySelector(".main")?.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [activeView]);

  const openExpenseForm = (expenseId?: string) => {
    setSelectedExpenseId(undefined);
    setEditingExpenseId(expenseId);
    setExpenseFormOpen(true);
  };
  const selectExpense = (expenseId: string) => {
    setSelectedExpenseId((current) => (current === expenseId ? undefined : expenseId));
  };
  const closeExpenseForm = () => {
    setExpenseFormOpen(false);
    setEditingExpenseId(undefined);
  };
  const saveExpense = (input: ExpenseFormInput) => {
    setState((current) => upsertExpense(current, input));
    closeExpenseForm();
  };
  const openPurchaseForm = (transactionId?: string) => {
    setEditingTransactionId(transactionId);
    setPurchaseFormOpen(true);
  };
  const closePurchaseForm = () => {
    setPurchaseFormOpen(false);
    setEditingTransactionId(undefined);
  };
  const saveTransaction = (input: UpsertTransactionInput, options: PurchaseSaveOptions = {}) => {
    setState((current) => {
      const updated = upsertTransaction(current, input);
      if (!options.applyCategoryToSameMerchant || !input.id) return updated;
      const edited = updated.transactions.find((transaction) => transaction.id === input.id);
      if (!edited) return updated;
      const merchantKey = editingTransaction ? transactionMerchantLabel(editingTransaction) : transactionMerchantLabel(edited);
      return {
        ...updated,
        transactions: updated.transactions.map((transaction) =>
          transaction.contextId === edited.contextId && transaction.type !== "ignored" && transactionMerchantLabel(transaction) === merchantKey
            ? { ...transaction, categoryId: edited.categoryId, updatedAt: new Date().toISOString() }
            : transaction
        )
      };
    });
    closePurchaseForm();
  };
  const importPurchaseFile = async (file: File) => {
    const parsed = await parseBankStatementFile(file);
    setPurchaseImportPreview({
      ...parsed,
      fileName: file.name,
      transactions: parsed.transactions.map((transaction) => enrichImportedTransaction(transaction, categories, suppliers, contextExpenses, state.costPeriods))
    });
  };

  const openQuickExpense = () => {
    setActiveView("overview");
    openExpenseForm();
  };

  const openQuickPurchase = () => {
    setActiveView("purchases");
    openPurchaseForm();
  };

  const openQuickImport = () => {
    setActiveView("purchases");
    quickImportInputRef.current?.click();
  };

  const importQuickPurchaseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (file) void importPurchaseFile(file);
    event.currentTarget.value = "";
  };

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const parsed = JSON.parse(text);
      const validation = validateImportPayload(parsed);
      if (!validation.ok) {
        setImportErrors(validation.errors);
        return;
      }
      setState((current) => importAsNewContext(current, validation.payload));
      setImportErrors([]);
    } catch {
      setImportErrors(["Filen kunde inte läsas som JSON. ZIP-import stöds via context.json som du kan exportera separat."]);
    }
  };

  return (
    <div className={`shell ${sidebarCollapsed ? "sidebarCollapsed" : ""}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark">
            <Wallet size={28} />
          </div>
          <div>
            <strong>Mina Utgifter</strong>
            <span>{context.name}</span>
          </div>
          <button className="collapseNav" onClick={() => setSidebarCollapsed((value) => !value)} title={sidebarCollapsed ? "Visa meny" : "Dölj meny"}>
            {sidebarCollapsed ? <ChevronsRight size={17} /> : <ChevronsLeft size={17} />}
          </button>
        </div>
        <nav className="nav">
          {(
            [
              ["overview", BarChart3, "Översikt"],
              ...(state.purchasesEnabled ? ([["purchases", ShoppingBag, "Enskilda köp"]] as const) : []),
              ["statistics", LineChart, "Statistik"],
              ["registers", Users, "Register"],
              ["admin", ShieldCheck, "Data"],
              ["help", BookOpen, "Hjälp"]
            ] as const
          ).map(([key, Icon, label]) => (
            <button key={key} className={activeView === key ? "active" : ""} onClick={() => setActiveView(key as typeof activeView)} title={String(label)}>
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        </aside>

      <main className="main">
        <header className="compactHeader">
          <div className="appHeading">
            <div className="appHeadingIcon">
              <Wallet size={20} />
            </div>
            <div>
              <strong>{activeViewLabel}</strong>
            </div>
          </div>
          <div className="headerActions">
            {activeView === "registers" && (
              <button className="ghostBtn" onClick={() => setRegisterListsVisible((value) => !value)}>
                {registerListsVisible ? "Dölj listor" : "Visa listor"}
              </button>
            )}
            <QuickAddMenu
              variant="desktop"
              purchasesEnabled={state.purchasesEnabled}
              onAddExpense={openQuickExpense}
              onAddPurchase={openQuickPurchase}
              onImportPurchases={openQuickImport}
            />
          </div>
        </header>

        <section className="viewStage">
          {activeView === "overview" && (
            <>
            <TimelineToolbar context={context} state={state} setState={setState} categories={categories} people={people} />
            <Overview
              contextName={context.name}
              currency={context.currency}
              expenses={contextExpenses}
              visibleExpenses={expenses}
              months={months}
              totals={combinedTotals}
              purchaseRows={purchaseCategoryRows}
              categories={categories}
              people={people}
              suppliers={suppliers}
              onSelect={selectExpense}
              onSelectPurchase={openPurchaseForm}
              setState={setState}
              state={state}
            />
            </>
          )}

          {activeView === "purchases" && (
            <Purchases
              context={context}
              transactions={transactions}
              categories={categories}
              suppliers={suppliers}
              importPreview={purchaseImportPreview}
              onImportFile={(file) => void importPurchaseFile(file)}
              onCommitImport={() => {
                if (!purchaseImportPreview) return;
                setState((current) => importTransactions(current, purchaseImportPreview.transactions));
                setPurchaseImportPreview(undefined);
              }}
              onCancelImport={() => setPurchaseImportPreview(undefined)}
              onEdit={openPurchaseForm}
              onDelete={(id) => setState((current) => removeTransaction(current, id))}
              onToggleFlag={(id, flag) => setState((current) => toggleTransactionFlag(current, id, flag))}
            />
          )}

          {activeView === "statistics" && (
            <Statistics
            state={state}
            setState={setState}
            expenses={expenses}
            allExpenses={contextExpenses}
            categories={categories}
            people={people}
            suppliers={suppliers}
            transactions={transactions}
            months={months}
            currency={context.currency}
            curveCollapsed={costCurveCollapsed}
            onToggleCurve={() => setCostCurveCollapsed((value) => !value)}
            />
          )}

          {activeView === "registers" && (
            <Registers
            people={people}
            suppliers={suppliers}
            categories={categories}
            attachments={state.attachments}
            showLists={registerListsVisible}
            setState={setState}
            />
          )}

          {activeView === "admin" && (
            <Admin
            context={context}
            state={state}
            setState={setState}
            dataFile={dataFile}
            connectDataFile={connectDataFile}
            saveAsDataFile={saveAsDataFile}
            saveDataFileNow={saveDataFileNow}
            disconnectDataFile={disconnectDataFile}
            cloudSync={cloudSync}
            configureCloudSync={configureCloudSync}
            pullCloudState={pullCloudState}
            pushCloudStateNow={pushCloudStateNow}
            disconnectCloudSync={disconnectCloudSync}
            importErrors={importErrors}
            importFile={importFile}
            reset={reset}
            />
          )}

          {activeView === "help" && (
            <HelpGuide />
          )}
        </section>
      </main>

      {selectedExpense && (
        <ExpenseDrawer
          expense={selectedExpense}
          supplier={selectedSupplier}
          category={categories.find((category) => category.id === selectedExpense.categoryId)}
          payer={people.find((person) => person.id === selectedExpense.payerPersonId)}
          attachments={selectedAttachments}
          currency={context.currency}
          onClose={() => setSelectedExpenseId(undefined)}
          onEdit={() => openExpenseForm(selectedExpense.id)}
          onCancel={() => setState((current) => cancelExpense(current, selectedExpense.id))}
          onDelete={() => {
            setState((current) => removeExpense(current, selectedExpense.id));
            setSelectedExpenseId(undefined);
          }}
          onAttach={(file) => fileToAttachment(file, { expenseId: selectedExpense.id }).then((attachment) => attachment && setState((current) => addAttachment(current, attachment)))}
          onRemoveAttachment={(attachmentId) => setState((current) => removeAttachment(current, attachmentId))}
        />
      )}
      {expenseFormOpen && (
        <ExpenseModal
          expense={editingExpense}
          costPeriod={editingCostPeriod}
          categories={categories}
          people={people}
          suppliers={suppliers}
          onClose={closeExpenseForm}
          onSave={saveExpense}
        />
      )}
      {purchaseFormOpen && (
        <PurchaseModal
          transaction={editingTransaction}
          categories={categories}
          suppliers={suppliers}
          expenses={contextExpenses}
          currency={context.currency}
          onClose={closePurchaseForm}
          onSave={saveTransaction}
        />
      )}
      <input
        ref={quickImportInputRef}
        className="quickImportInput"
        type="file"
        accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={importQuickPurchaseFile}
        aria-hidden="true"
        tabIndex={-1}
      />
      <QuickAddMenu
        variant="mobile"
        purchasesEnabled={state.purchasesEnabled}
        onAddExpense={openQuickExpense}
        onAddPurchase={openQuickPurchase}
        onImportPurchases={openQuickImport}
      />
    </div>
  );
}

function QuickAddMenu({
  variant,
  purchasesEnabled,
  onAddExpense,
  onAddPurchase,
  onImportPurchases
}: {
  variant: "desktop" | "mobile";
  purchasesEnabled: boolean;
  onAddExpense: () => void;
  onAddPurchase: () => void;
  onImportPurchases: () => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const actions: Array<{ label: string; detail: string; icon: typeof Wallet; action: () => void }> = [
    {
      label: "Återkommande utgift",
      detail: "Prenumeration, avtal eller fast kostnad",
      icon: ReceiptText,
      action: onAddExpense
    },
    ...(purchasesEnabled
      ? [
          {
            label: "Enskilt köp",
            detail: "Lägg in ett köp manuellt",
            icon: ShoppingBag,
            action: onAddPurchase
          },
          {
            label: "Importera kontoutdrag",
            detail: "Läs in köp från CSV eller Excel",
            icon: Upload,
            action: onImportPurchases
          }
        ]
      : [])
  ];

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  if (variant === "desktop") {
    return (
      <div className="quickAdd desktopQuickAdd">
        <div className="quickAddSplit">
          <button type="button" className="primary quickAddMain" onClick={() => run(onAddExpense)}>
            <Plus size={18} /> Ny utgift
          </button>
          <button type="button" className="primary quickAddChevron" onClick={() => setOpen((value) => !value)} aria-label="Fler nya val" aria-expanded={open} aria-haspopup="menu">
            <ChevronDown size={15} />
          </button>
        </div>
        {open && (
          <div className="quickAddMenu" role="menu">
            {actions.map((item) => {
              const Icon = item.icon;
              return (
                <button type="button" key={item.label} role="menuitem" onClick={() => run(item.action)}>
                  <Icon size={17} />
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.detail}</small>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mobileQuickAdd">
      <button type="button" className="mobileFab" onClick={() => setOpen(true)} aria-label="Lägg till" aria-haspopup="dialog" aria-expanded={open}>
        <Plus size={26} />
      </button>
      {open && (
        <div className="mobileQuickOverlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
          <div className="mobileQuickSheet" role="dialog" aria-modal="true" aria-label="Lägg till">
            <div className="mobileQuickHandle" />
            <div className="mobileQuickHeader">
              <strong>Lägg till</strong>
              <button type="button" className="iconBtn" onClick={() => setOpen(false)} aria-label="Stäng">
                <X size={18} />
              </button>
            </div>
            <div className="mobileQuickActions">
              {actions.map((item) => {
                const Icon = item.icon;
                return (
                  <button type="button" key={item.label} onClick={() => run(item.action)}>
                    <span className="mobileQuickIcon">
                      <Icon size={18} />
                    </span>
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.detail}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ContextSwitcher({ state, setState, activeContextId }: { state: ReturnType<typeof useAppState>["state"]; setState: ReturnType<typeof useAppState>["setState"]; activeContextId: string }) {
  const [name, setName] = useState("");
  const activeContext = state.contexts.find((context) => context.id === activeContextId) ?? state.contexts[0];
  return (
    <div className="contextBox adminContextPanel">
      <div className="panelHeader">
        <h2>Kontext</h2>
        <span>Aktiv arbetsyta</span>
      </div>
      <label>Byt kontext</label>
      <div className="selectWrap">
        <select value={activeContextId} onChange={(event) => setState((current) => ({ ...current, activeContextId: event.target.value }))}>
          {state.contexts.map((context) => (
            <option key={context.id} value={context.id}>
              {context.name}
            </option>
          ))}
        </select>
        <ChevronDown size={16} />
      </div>
      <label>Döp om aktiv kontext</label>
      <input value={activeContext?.name ?? ""} onChange={(event) => activeContext && setState((current) => updateContext(current, { id: activeContext.id, name: event.target.value }))} />
      <div className="contextActions">
        <div className="inline">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ny kontext" />
          <button
            className="iconBtn"
            title="Skapa kontext"
            onClick={() => {
              if (!name.trim()) return;
              setState((current) => addContext(current, name.trim()));
              setName("");
            }}
          >
            <Plus size={17} />
          </button>
        </div>
        <button className="ghostBtn" onClick={() => setState((current) => duplicateCurrentContext(current, `${current.contexts.find((context) => context.id === activeContextId)?.name ?? "Kontext"} mall`))}>
          <FolderPlus size={16} /> Duplicera som mall
        </button>
      </div>
    </div>
  );
}

function Onboarding({ onCreate, onSkip }: { onCreate: (name: string, template?: "family" | "travel" | "cohabiting") => void; onSkip: () => void }) {
  const [name, setName] = useState("Min ekonomi");
  const [template, setTemplate] = useState<"family" | "travel" | "cohabiting" | undefined>();
  return (
    <section className="onboarding">
      <div>
        <p className="eyebrow">Första användning</p>
        <h2>Skapa första kontexten och gå vidare till första utgiften.</h2>
      </div>
      <input value={name} onChange={(event) => setName(event.target.value)} />
      <div className="segmented">
        {[
          [undefined, "Standard"],
          ["family", "Familj"],
          ["travel", "Resa"],
          ["cohabiting", "Sambo"]
        ].map(([value, label]) => (
          <button key={String(value)} className={template === value ? "selected" : ""} onClick={() => setTemplate(value as typeof template)}>
            {label}
          </button>
        ))}
      </div>
      <button className="primary" onClick={() => onCreate(name, template)}>
        <Plus size={18} /> Starta
      </button>
      <button className="ghostBtn" onClick={onSkip}>
        Hoppa över
      </button>
    </section>
  );
}

function Overview(props: {
  contextName: string;
  currency: string;
  expenses: Expense[];
  visibleExpenses: Expense[];
  months: TimelineMonth[];
  totals: Record<string, number>;
  purchaseRows: PurchaseCategoryRow[];
  categories: Category[];
  people: Person[];
  suppliers: Supplier[];
  onSelect: (id: string) => void;
  onSelectPurchase: (id: string) => void;
  setState: ReturnType<typeof useAppState>["setState"];
  state: ReturnType<typeof useAppState>["state"];
}) {
  const currentMonth = props.months.find((month) => month.isCurrentMonth) ?? props.months[0];
  const activeNecessity = props.state.filters.necessityLevels.length === 1 ? props.state.filters.necessityLevels[0] : undefined;
  const summaryExpenses = filterExpenses({ ...props.state, filters: { ...props.state.filters, necessityLevels: [] } }, props.expenses);
  const necessitySummaries = overviewNecessityOrder.map((level) => ({
    level,
    total: currentMonth
      ? summaryExpenses
          .filter((expense) => expense.necessityLevel === level)
          .reduce((sum, expense) => sum + expenseAmountForMonth(expense, props.state.costPeriods, currentMonth).amount, 0)
      : 0,
    count: summaryExpenses.filter((expense) => expense.necessityLevel === level && expense.status !== "cancelled").length
  }));
  return (
    <div className="overviewGrid">
      <div className="panel wide">
        <Timeline
          contextCurrency={props.currency}
          expenses={props.visibleExpenses}
          months={props.months}
          totals={props.totals}
          categories={props.categories}
          people={props.people}
          suppliers={props.suppliers}
          purchaseRows={props.purchaseRows}
          periods={props.state.costPeriods}
          minRows={10}
          onSelect={props.onSelect}
          onSelectPurchase={props.onSelectPurchase}
        />
      </div>
      <div className="necessitySummaryGrid" aria-label="Summering per utgiftstyp">
        {necessitySummaries.map((summary) => {
          const selected = activeNecessity === summary.level;
          const Icon = overviewNecessityIcons[summary.level];
          return (
            <button
              key={summary.level}
              type="button"
              className={`necessitySummary ${summary.level} ${selected ? "selected" : ""}`}
              aria-label={`${overviewNecessityLabels[summary.level]}: ${formatMoney(summary.total, props.currency)} per månad, ${formatMoney(summary.total * 12, props.currency)} per år, ${summary.count} utgifter`}
              aria-pressed={selected}
              onClick={() =>
                props.setState((current) => ({
                  ...current,
                  filters: {
                    ...current.filters,
                    necessityLevels: selected ? [] : [summary.level]
                  }
                }))
              }
            >
              <span className="summaryTop">
                <Icon size={15} />
                <span>{overviewNecessityLabels[summary.level]}</span>
                <em>Månad</em>
              </span>
              <strong>{formatMoney(summary.total, props.currency)}</strong>
              <small>{summary.count} utgifter · år {formatMoney(summary.total * 12, props.currency)}</small>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ title, value, icon: Icon, hint, onClick }: { title: string; value: string; icon: typeof Wallet; hint?: string; onClick?: () => void }) {
  const content = (
    <>
      <Icon size={21} />
      <span>{title}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </>
  );
  return onClick ? (
    <button className="metric metricButton" onClick={onClick}>
      {content}
    </button>
  ) : (
    <div className="metric">{content}</div>
  );
}

function CategoryField({
  categories,
  value,
  onChange,
  label = "Kategori",
  placeholder = "Kategori"
}: {
  categories: Category[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const selectedCategory = categories.find((category) => category.id === value);
  const SelectedIcon = selectedCategory ? iconMap[selectedCategory.icon as keyof typeof iconMap] ?? Tag : Tag;

  return (
    <>
      <label className="categorySelectField desktopCategorySelect">
        <span>{label}</span>
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">{placeholder}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <div className="categorySelectField mobileCategorySelect">
        <span aria-hidden="true">{label}</span>
        <button type="button" className={`categoryPickerButton ${selectedCategory ? "isSelected" : ""}`} onClick={() => setPickerOpen(true)} aria-label={`Välj ${label.toLowerCase()}`}>
          <span>
            <SelectedIcon size={16} />
            {selectedCategory?.name ?? placeholder}
          </span>
          <ChevronDown size={16} />
        </button>
      </div>
      {pickerOpen && (
        <CategoryPickerSheet
          categories={categories}
          value={value}
          title={label}
          placeholder={placeholder}
          onSelect={(categoryId) => {
            onChange(categoryId);
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  );
}

function CategoryPickerSheet({
  categories,
  value,
  title,
  placeholder,
  onSelect,
  onClose
}: {
  categories: Category[];
  value: string;
  title: string;
  placeholder: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const filteredCategories = categories.filter((category) => category.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="modalOverlay categoryPickerOverlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="categoryPickerSheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="categoryPickerHandle" />
        <div className="categoryPickerTitle">
          <div>
            <strong>{title}</strong>
            <span>Välj snabbt utan att lämna flödet.</span>
          </div>
          <button type="button" className="iconBtn" onClick={onClose} aria-label="Stäng kategorival">
            <X size={18} />
          </button>
        </div>
        <label className="categoryPickerSearch">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Sök kategori" autoFocus />
        </label>
        <div className="categoryPickerList">
          <button type="button" className={`categoryOption ${value === "" ? "active" : ""}`} onClick={() => onSelect("")}>
            <span className="categoryOptionIcon">
              <Tag size={16} />
            </span>
            <span>
              <strong>{placeholder}</strong>
              <small>Ingen särskild kategori</small>
            </span>
          </button>
          {filteredCategories.map((category) => {
            const Icon = iconMap[category.icon as keyof typeof iconMap] ?? Tag;
            const active = value === category.id;
            return (
              <button type="button" className={`categoryOption ${active ? "active" : ""}`} key={category.id} onClick={() => onSelect(category.id)}>
                <span className="categoryOptionIcon" style={{ background: category.color }}>
                  <Icon size={16} />
                </span>
                <span>
                  <strong>{category.name}</strong>
                  <small>{active ? "Vald kategori" : "Tryck för att välja"}</small>
                </span>
              </button>
            );
          })}
          {filteredCategories.length === 0 && <p className="note">Ingen kategori matchar sökningen.</p>}
        </div>
      </div>
    </div>
  );
}

function ExpenseModal({ expense, costPeriod, categories, people, suppliers, onSave, onClose }: { expense?: Expense; costPeriod?: ExpenseCostPeriod; categories: Category[]; people: Array<{ id: string; firstName: string; lastName: string }>; suppliers: Supplier[]; onSave: (input: ExpenseFormInput) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    name: "",
    supplierId: "",
    newSupplierName: "",
    categoryId: "",
    payerPersonId: "",
    amount: "",
    recurrence: "monthly" as Recurrence,
    necessityLevel: "comfortable" as NecessityLevel,
    startDate: toIsoDate(new Date()),
    chargeDay: "1",
    noticePeriodValue: "",
    noticePeriodUnit: "months" as "days" | "months",
    notes: ""
  });

  useEffect(() => {
    if (!expense) {
      setForm({
        name: "",
        supplierId: "",
        newSupplierName: "",
        categoryId: "",
        payerPersonId: "",
        amount: "",
        recurrence: "monthly",
        necessityLevel: "comfortable",
        startDate: toIsoDate(new Date()),
        chargeDay: "1",
        noticePeriodValue: "",
        noticePeriodUnit: "months",
        notes: ""
      });
      return;
    }
    setForm({
      name: expense.name,
      supplierId: expense.supplierId ?? "",
      newSupplierName: "",
      categoryId: expense.categoryId ?? "",
      payerPersonId: expense.payerPersonId ?? "",
      amount: costPeriod?.amount ? String(costPeriod.amount) : "",
      recurrence: costPeriod?.recurrence ?? "monthly",
      necessityLevel: expense.necessityLevel,
      startDate: expense.startDate ?? costPeriod?.startDate ?? toIsoDate(new Date()),
      chargeDay: costPeriod?.chargeDay ? String(costPeriod.chargeDay) : "1",
      noticePeriodValue: expense.noticePeriodValue ? String(expense.noticePeriodValue) : "",
      noticePeriodUnit: expense.noticePeriodUnit ?? "months",
      notes: expense.notes ?? ""
    });
  }, [expense, costPeriod]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave({
      id: expense?.id,
      ...form,
      supplierId: form.supplierId || undefined,
      newSupplierName: form.newSupplierName || undefined,
      categoryId: form.categoryId || undefined,
      payerPersonId: form.payerPersonId || undefined,
      amount: form.amount ? Number(form.amount) : undefined,
      chargeDay: form.chargeDay ? Number(form.chargeDay) : undefined,
      noticePeriodValue: form.noticePeriodValue ? Number(form.noticePeriodValue) : undefined
    });
  };

  return (
    <div className="modalOverlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="expenseModal" onSubmit={submit} aria-label={expense ? "Uppdatera utgift" : "Lägg till utgift"}>
        <div className="modalTitle">
          <div className="modalMark">
            <ReceiptText size={24} />
          </div>
          <div>
            <p className="eyebrow">{expense ? "Uppdatera" : "Ny utgift"}</p>
            <h2>{expense ? "Uppdatera utgift" : "Lägg till utgift"}</h2>
            <span>Ofullständig data sparas som utkast.</span>
          </div>
          <button type="button" className="iconBtn" onClick={onClose} title="Stäng">
            <X size={18} />
          </button>
        </div>

        <div className="formSection">
          <label>
            <span>Namn</span>
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Namn, t.ex. Netflix" autoFocus />
          </label>
          <label>
            <span>Belopp</span>
            <input type="number" min="0" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="0" />
          </label>
          <label>
            <span>Period</span>
            <select value={form.recurrence} onChange={(event) => setForm({ ...form, recurrence: event.target.value as Recurrence })}>
              {Object.entries(recurrenceLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="formSection split">
          <label>
            <span>Leverantör</span>
            <select value={form.supplierId} onChange={(event) => setForm({ ...form, supplierId: event.target.value, newSupplierName: event.target.value ? "" : form.newSupplierName })}>
              <option value="">Välj leverantör</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Ny leverantör</span>
            <input value={form.newSupplierName} onChange={(event) => setForm({ ...form, newSupplierName: event.target.value, supplierId: event.target.value ? "" : form.supplierId })} placeholder="Eller skriv ny" />
          </label>
        </div>

        <div className="formSection split">
          <CategoryField categories={categories} value={form.categoryId} onChange={(categoryId) => setForm({ ...form, categoryId })} />
          <label>
            <span>Betalas av</span>
            <select value={form.payerPersonId} onChange={(event) => setForm({ ...form, payerPersonId: event.target.value })}>
              <option value="">Betalas av</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.firstName} {person.lastName}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="formSection split">
          <label>
            <span>Typ</span>
            <select value={form.necessityLevel} onChange={(event) => setForm({ ...form, necessityLevel: event.target.value as NecessityLevel })}>
              {Object.entries(necessityLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Startdatum</span>
            <input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
          </label>
        </div>

        <div className="formSection three">
          <label>
            <span>Dras dag</span>
            <input type="number" min="1" max="31" value={form.chargeDay} onChange={(event) => setForm({ ...form, chargeDay: event.target.value })} placeholder="1" />
          </label>
          <label>
            <span>Uppsägning</span>
            <input type="number" min="0" value={form.noticePeriodValue} onChange={(event) => setForm({ ...form, noticePeriodValue: event.target.value })} placeholder="0" />
          </label>
          <label>
            <span>Enhet</span>
            <select value={form.noticePeriodUnit} onChange={(event) => setForm({ ...form, noticePeriodUnit: event.target.value as "days" | "months" })}>
              <option value="months">månader</option>
              <option value="days">dagar</option>
            </select>
          </label>
        </div>

        <label className="notesField">
          <span>Anteckning</span>
          <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Avtal, uppsägningsinfo eller annat att komma ihåg." />
        </label>

        <div className="modalActions">
          <button type="button" className="ghostBtn" onClick={onClose}>
            Avbryt
          </button>
          <button className="primary">
            {expense ? <Pencil size={17} /> : <Plus size={17} />} {expense ? "Uppdatera" : "Spara"}
          </button>
        </div>
      </form>
    </div>
  );
}

function PurchaseModal({ transaction, categories, suppliers, expenses, currency, onSave, onClose }: { transaction?: PurchaseTransaction; categories: Category[]; suppliers: Supplier[]; expenses: Expense[]; currency: string; onSave: (input: UpsertTransactionInput, options?: PurchaseSaveOptions) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    date: toIsoDate(new Date()),
    bookedDate: "",
    merchantRaw: "",
    amount: "",
    categoryId: "",
    supplierId: "",
    recurringExpenseId: "",
    type: "one-off" as PurchaseTransaction["type"],
    flags: [] as PurchaseFlag[],
    applyCategoryToSameMerchant: false,
    notes: ""
  });

  useEffect(() => {
    if (!transaction) {
      setForm({ date: toIsoDate(new Date()), bookedDate: "", merchantRaw: "", amount: "", categoryId: "", supplierId: "", recurringExpenseId: "", type: "one-off", flags: [], applyCategoryToSameMerchant: false, notes: "" });
      return;
    }
    setForm({
      date: transaction.date,
      bookedDate: transaction.bookedDate ?? "",
      merchantRaw: transaction.merchantRaw,
      amount: String(transaction.amount),
      categoryId: transaction.categoryId ?? "",
      supplierId: transaction.supplierId ?? "",
      recurringExpenseId: transaction.recurringExpenseId ?? "",
      type: transaction.type,
      flags: transaction.flags ?? [],
      applyCategoryToSameMerchant: true,
      notes: transaction.notes ?? ""
    });
  }, [transaction]);

  const toggleFlag = (flag: PurchaseFlag) => {
    setForm((current) => ({
      ...current,
      flags: current.flags.includes(flag) ? current.flags.filter((item) => item !== flag) : [...current.flags, flag]
    }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave({
      id: transaction?.id,
      date: form.date,
      bookedDate: form.bookedDate || undefined,
      merchantRaw: form.merchantRaw,
      merchantNormalized: form.merchantRaw,
      amount: Number(form.amount),
      currency,
      categoryId: form.categoryId || undefined,
      supplierId: form.supplierId || undefined,
      recurringExpenseId: form.recurringExpenseId || undefined,
      type: form.recurringExpenseId && form.type === "one-off" ? "recurring-payment" : form.type,
      source: transaction?.source ?? "manual",
      statementMonth: transaction?.statementMonth,
      importId: transaction?.importId,
      flags: form.flags,
      notes: form.notes || undefined
    }, {
      applyCategoryToSameMerchant: form.applyCategoryToSameMerchant
    });
  };

  return (
    <div className="modalOverlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="expenseModal" onSubmit={submit} aria-label={transaction ? "Uppdatera enskilt köp" : "Lägg till enskilt köp"}>
        <div className="modalTitle">
          <div className="modalMark">
            <ShoppingBag size={24} />
          </div>
          <div>
            <p className="eyebrow">{transaction ? "Uppdatera" : "Nytt enskilt köp"}</p>
            <h2>{transaction ? "Uppdatera enskilt köp" : "Lägg till enskilt köp"}</h2>
            <span>Enskilda köp påverkar kassabok och statistik, men inte återkommande prognos.</span>
          </div>
          <button type="button" className="iconBtn" onClick={onClose} title="Stäng">
            <X size={18} />
          </button>
        </div>
        <div className="formSection split">
          <label>
            <span>Datum</span>
            <input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} autoFocus />
          </label>
          <label>
            <span>Belopp</span>
            <input type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="0" />
          </label>
        </div>
        <div className="formSection split">
          <label>
            <span>Handlare</span>
            <input value={form.merchantRaw} onChange={(event) => setForm({ ...form, merchantRaw: event.target.value })} placeholder="ICA, Apple, OKQ8..." />
          </label>
          <CategoryField categories={categories} value={form.categoryId} onChange={(categoryId) => setForm({ ...form, categoryId })} />
        </div>
        {transaction && (
          <label className="inlineCheck purchaseApplyRule">
            <input type="checkbox" checked={form.applyCategoryToSameMerchant} onChange={(event) => setForm({ ...form, applyCategoryToSameMerchant: event.target.checked })} />
            <span>Uppdatera kategorin för alla köp från samma handlare</span>
          </label>
        )}
        <label className="notesField">
          <span>Anteckning</span>
          <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
        </label>
        <div className="flagPicker" aria-label="Köpflaggor">
          <span>Flaggor</span>
          <div>
            {(Object.keys(purchaseFlagMeta) as PurchaseFlag[]).map((flag) => {
              const meta = purchaseFlagMeta[flag];
              const Icon = meta.icon;
              const active = form.flags.includes(flag);
              return (
                <button type="button" key={flag} className={`flagChip ${meta.tone} ${active ? "active" : ""}`} onClick={() => toggleFlag(flag)} aria-pressed={active}>
                  <Icon size={14} /> {meta.label}
                </button>
              );
            })}
          </div>
        </div>
        <details className="purchaseAdvancedFields">
          <summary>
            <span>Avancerat</span>
            <ChevronDown size={16} />
          </summary>
          <div className="formSection three">
            <label>
              <span>Bokfört</span>
              <input type="date" value={form.bookedDate} onChange={(event) => setForm({ ...form, bookedDate: event.target.value })} />
            </label>
            <label>
              <span>Leverantör</span>
              <select value={form.supplierId} onChange={(event) => setForm({ ...form, supplierId: event.target.value })}>
                <option value="">Ingen koppling</option>
                {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
              </select>
            </label>
            <label>
              <span>Typ</span>
              <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as PurchaseTransaction["type"] })}>
                <option value="one-off">Enskilt köp</option>
                <option value="recurring-payment">Återkommande betalning</option>
                <option value="transfer">Överföring</option>
                <option value="ignored">Ignorera</option>
              </select>
            </label>
          </div>
          <label>
            <span>Koppla till återkommande utgift</span>
            <select value={form.recurringExpenseId} onChange={(event) => setForm({ ...form, recurringExpenseId: event.target.value })}>
              <option value="">Ingen koppling</option>
              {expenses.map((expense) => <option key={expense.id} value={expense.id}>{expense.name}</option>)}
            </select>
          </label>
        </details>
        <div className="modalActions">
          <button type="button" className="ghostBtn" onClick={onClose}>Avbryt</button>
          <button className="primary">{transaction ? <Pencil size={17} /> : <Plus size={17} />} {transaction ? "Uppdatera" : "Spara"}</button>
        </div>
      </form>
    </div>
  );
}

function ExpenseComposer({ categories, people, suppliers, onSave, compact = false }: { categories: Category[]; people: Array<{ id: string; firstName: string; lastName: string }>; suppliers: Supplier[]; compact?: boolean; onSave: Parameters<typeof upsertExpense>[1] extends infer T ? (input: T) => void : never }) {
  const [form, setForm] = useState({
    name: "",
    supplierId: "",
    newSupplierName: "",
    categoryId: "",
    payerPersonId: "",
    amount: "",
    recurrence: "monthly" as Recurrence,
    necessityLevel: "comfortable" as NecessityLevel,
    startDate: toIsoDate(new Date()),
    chargeDay: "1",
    noticePeriodValue: "",
    noticePeriodUnit: "months" as "days" | "months",
    notes: ""
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSave({
      ...form,
      supplierId: form.supplierId || undefined,
      newSupplierName: form.newSupplierName || undefined,
      categoryId: form.categoryId || undefined,
      payerPersonId: form.payerPersonId || undefined,
      amount: form.amount ? Number(form.amount) : undefined,
      chargeDay: form.chargeDay ? Number(form.chargeDay) : undefined,
      noticePeriodValue: form.noticePeriodValue ? Number(form.noticePeriodValue) : undefined
    });
    setForm((current) => ({ ...current, name: "", newSupplierName: "", amount: "", notes: "" }));
  };
  return (
    <form className={`composer ${compact ? "compact" : ""}`} onSubmit={submit}>
      <div className="panelHeader">
        <h2>Lägg till utgift</h2>
        <span>Ofullständig data sparas som utkast</span>
      </div>
      <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Namn, t.ex. Netflix" />
      <select value={form.supplierId} onChange={(event) => setForm({ ...form, supplierId: event.target.value })}>
        <option value="">Välj leverantör</option>
        {suppliers.map((supplier) => (
          <option key={supplier.id} value={supplier.id}>
            {supplier.name}
          </option>
        ))}
      </select>
      <input value={form.newSupplierName} onChange={(event) => setForm({ ...form, newSupplierName: event.target.value })} placeholder="Eller ny leverantör" />
      <input type="number" min="0" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} placeholder="Belopp" />
      <select value={form.recurrence} onChange={(event) => setForm({ ...form, recurrence: event.target.value as Recurrence })}>
        {Object.entries(recurrenceLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <select value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>
        <option value="">Kategori</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <select value={form.payerPersonId} onChange={(event) => setForm({ ...form, payerPersonId: event.target.value })}>
        <option value="">Betalas av</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.firstName} {person.lastName}
          </option>
        ))}
      </select>
      <select value={form.necessityLevel} onChange={(event) => setForm({ ...form, necessityLevel: event.target.value as NecessityLevel })}>
        {Object.entries(necessityLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <input className="advancedField" type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
      <input type="number" min="1" max="31" value={form.chargeDay} onChange={(event) => setForm({ ...form, chargeDay: event.target.value })} placeholder="Dras dag" />
      <input className="advancedField" type="number" min="0" value={form.noticePeriodValue} onChange={(event) => setForm({ ...form, noticePeriodValue: event.target.value })} placeholder="Uppsägningstid" />
      <select className="advancedField" value={form.noticePeriodUnit} onChange={(event) => setForm({ ...form, noticePeriodUnit: event.target.value as "days" | "months" })}>
        <option value="months">månader</option>
        <option value="days">dagar</option>
      </select>
      <button className="primary">
        <Plus size={18} /> Spara
      </button>
    </form>
  );
}

function TimelineToolbar({ context, state, setState, categories, people }: { context: ReturnType<typeof useAppState>["context"]; state: ReturnType<typeof useAppState>["state"]; setState: ReturnType<typeof useAppState>["setState"]; categories: Category[]; people: Array<{ id: string; firstName: string; lastName: string }> }) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const activeMobileFilterCount =
    state.filters.categoryIds.length +
    state.filters.payerIds.length +
    state.filters.necessityLevels.length +
    (state.hidePastMonths ? 1 : 0);
  const filterControls = (variant: "desktop" | "mobile") => (
    <>
      <label className="historyControl">
        <span>Historik</span>
        <input
          type="number"
          min="0"
          max="120"
          value={context.monthsBack}
          onChange={(event) =>
            setState((current) =>
              updateContext(
                { ...current, hidePastMonths: false },
                { id: context.id, monthsBack: Math.max(0, Math.min(120, Number(event.target.value) || 0)) }
              )
            )
          }
        />
        <small>mån bakåt</small>
      </label>
      <button type="button" className={state.hidePastMonths ? "selected" : ""} onClick={() => setState((current) => ({ ...current, hidePastMonths: !current.hidePastMonths }))}>
        <CalendarDays size={17} /> {state.hidePastMonths ? "Visa historik" : "Göm historik"}
      </button>
      <select value={state.filters.categoryIds[0] ?? ""} onChange={(event) => setState((current) => ({ ...current, filters: { ...current.filters, categoryIds: event.target.value ? [event.target.value] : [] } }))}>
        <option value="">Alla kategorier</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <select value={state.filters.payerIds[0] ?? ""} onChange={(event) => setState((current) => ({ ...current, filters: { ...current.filters, payerIds: event.target.value ? [event.target.value] : [] } }))}>
        <option value="">Alla betalare</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.firstName}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="ghostBtn"
        onClick={() => {
          setState((current) => ({ ...current, filters: { ...current.filters, categoryIds: [], payerIds: [], necessityLevels: [], search: "" } }));
          if (variant === "mobile") setMobileFiltersOpen(false);
        }}
      >
        <RefreshCcw size={16} /> Återställ
      </button>
    </>
  );

  return (
    <div className="toolbar">
      <label className="searchBox">
        <Search size={17} />
        <input value={state.filters.search} onChange={(event) => setState((current) => ({ ...current, filters: { ...current.filters, search: event.target.value } }))} placeholder="Sök utgift" />
      </label>
      <div className="desktopToolbarControls">{filterControls("desktop")}</div>
      <button type="button" className="mobileFilterButton" onClick={() => setMobileFiltersOpen(true)} aria-label="Visa filter">
        <SlidersHorizontal size={17} />
        {activeMobileFilterCount > 0 && <span className="mobileFilterBadge">{activeMobileFilterCount}</span>}
      </button>
      {mobileFiltersOpen && (
        <div className="mobileFilterOverlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setMobileFiltersOpen(false)}>
          <div className="mobileFilterSheet" role="dialog" aria-modal="true" aria-label="Filter för översikt">
            <span className="mobileFilterHandle" aria-hidden="true" />
            <div className="mobileFilterHeader">
              <strong>Filter</strong>
              <button type="button" className="iconBtn" onClick={() => setMobileFiltersOpen(false)} title="Stäng filter">
                <X size={17} />
              </button>
            </div>
            <div className="mobileFilterControls">{filterControls("mobile")}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function Timeline(props: {
  contextCurrency: string;
  expenses: Expense[];
  months: TimelineMonth[];
  totals: Record<string, number>;
  categories: Category[];
  people: Array<{ id: string; firstName: string; lastName: string }>;
  suppliers: Supplier[];
  purchaseRows?: PurchaseCategoryRow[];
  periods: ExpenseCostPeriod[];
  minRows?: number;
  onSelect: (id: string) => void;
  onSelectPurchase?: (id: string) => void;
}) {
  const purchaseRows = props.purchaseRows ?? [];
  const [expandedPurchaseKey, setExpandedPurchaseKey] = useState<string | undefined>();
  const [expandedMobilePurchaseKey, setExpandedMobilePurchaseKey] = useState<string | undefined>();
  const placeholderRows = Array.from({ length: purchaseRows.length > 0 ? 0 : Math.max(0, (props.minRows ?? 0) - props.expenses.length) });
  const mobileMonths = props.months.slice(0, 4);
  const togglePurchaseMonth = (rowKey: string, monthKey: string) => {
    const key = `${rowKey}:${monthKey}`;
    setExpandedPurchaseKey((current) => (current === key ? undefined : key));
  };
  const mobilePurchaseTransactions = (row: PurchaseCategoryRow) =>
    Object.values(row.transactionsByMonth)
      .flat()
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 6);
  return (
    <>
      <div className="timelineWrap">
        <div className="timelineGrid" style={{ gridTemplateColumns: `260px repeat(${props.months.length}, minmax(92px, 1fr))` }}>
          <div className="timelineHead stickyCol">Utgifter</div>
          {props.months.map((month) => (
            <div className={`timelineHead ${month.isCurrentMonth ? "current" : ""}`} key={month.key}>
              {month.label}
            </div>
          ))}
          {props.expenses.map((expense) => {
            const supplier = props.suppliers.find((item) => item.id === expense.supplierId);
            const category = props.categories.find((item) => item.id === expense.categoryId);
            return (
              <div className="timelineRow" key={expense.id} style={{ display: "contents" }}>
                <button className={`expenseLabel stickyCol ${expense.status}`} onClick={() => props.onSelect(expense.id)}>
                  <span className="dot" style={{ background: supplier?.color ?? category?.color ?? "#b9c1ce" }} />
                  <strong>{expense.name}</strong>
                  <small>{supplier?.name ?? "Ingen leverantör"} · {expense.status === "draft" ? "utkast" : necessityLabels[expense.necessityLevel]}</small>
                </button>
                {props.months.map((month) => {
                  const value = expenseAmountForMonth(expense, props.periods, month);
                  const amountLabel = value.amount > 0 ? formatMoney(value.amount, props.contextCurrency) : "ingen utgift";
                  return (
                    <button
                      key={`${expense.id}-${month.key}`}
                      className={`monthCell ${value.active ? expense.necessityLevel : ""} ${value.locked ? "locked" : ""}`}
                      onClick={() => props.onSelect(expense.id)}
                      aria-label={`${expense.name} ${month.label}: ${amountLabel}`}
                    >
                      {value.amount > 0 ? formatMoney(value.amount, props.contextCurrency) : ""}
                      {value.locked && <LockKeyhole className="lockIcon" size={12} aria-label="Låst period" />}
                    </button>
                  );
                })}
              </div>
            );
          })}
          {placeholderRows.map((_, index) => (
            <div className="timelineRow placeholder" key={`empty-${index}`} style={{ display: "contents" }}>
              <div className="expenseLabel stickyCol emptyCell" aria-hidden="true">
                <strong>&nbsp;</strong>
                <small>&nbsp;</small>
              </div>
              {props.months.map((month) => (
                <div className="monthCell emptyCell" key={`empty-${index}-${month.key}`} aria-hidden="true" />
              ))}
            </div>
          ))}
          {purchaseRows.length > 0 && (
            <div className="purchaseSectionDivider" style={{ gridColumn: "1 / -1" }}>
              <span>Enskilda köp</span>
              <small>Grupperat per kategori. Klicka på ett månadsbelopp för detaljer.</small>
            </div>
          )}
          {purchaseRows.map((row) => {
            const expandedMonthKey = expandedPurchaseKey?.startsWith(`${row.key}:`) ? expandedPurchaseKey.split(":")[1] : undefined;
            const expandedTransactions = expandedMonthKey ? row.transactionsByMonth[expandedMonthKey] ?? [] : [];
            return (
              <Fragment key={row.key}>
                <div className="timelineRow purchaseAggregate" style={{ display: "contents" }}>
                  <div className="expenseLabel stickyCol purchaseAggregateLabel">
                    <span className="dot" style={{ background: row.color }} />
                    <strong>{row.label}</strong>
                    <small>{row.count} enskilda köp</small>
                  </div>
                  {props.months.map((month) => {
                    const amount = row.totals[month.key] ?? 0;
                    const expanded = expandedPurchaseKey === `${row.key}:${month.key}`;
                    return (
                      <button
                        type="button"
                        className={`monthCell purchaseAggregateCell ${amount > 0 ? "active" : ""} ${expanded ? "expanded" : ""}`}
                        key={`${row.key}-${month.key}`}
                        onClick={() => amount > 0 && togglePurchaseMonth(row.key, month.key)}
                        disabled={amount <= 0}
                        aria-label={`${row.label} ${month.label}: ${amount > 0 ? `${formatMoney(amount, props.contextCurrency)}. Visa köp.` : "inga köp"}`}
                        aria-expanded={expanded}
                      >
                        {amount > 0 ? formatMoney(amount, props.contextCurrency) : ""}
                      </button>
                    );
                  })}
                </div>
                {expandedTransactions.map((transaction) => (
                  <div className="timelineRow purchaseDetail" key={`${row.key}-${expandedMonthKey}-${transaction.id}`} style={{ display: "contents" }}>
                    <button
                      type="button"
                      className="expenseLabel stickyCol purchaseDetailLabel"
                      onClick={() => props.onSelectPurchase?.(transaction.id)}
                      aria-label={`Visa köp ${transaction.merchantRaw} ${formatMoney(transaction.amount, props.contextCurrency)}`}
                    >
                      <span className="purchaseDetailDate">{transaction.date.slice(5)}</span>
                      <span className="purchaseDetailMain">
                        <strong>{transaction.merchantRaw}</strong>
                        <small>{transaction.location ?? transaction.source}</small>
                      </span>
                    </button>
                    {props.months.map((month) => (
                      <button
                        type="button"
                        className="monthCell purchaseDetailCell"
                        key={`${transaction.id}-${month.key}`}
                        onClick={() => month.key === expandedMonthKey && props.onSelectPurchase?.(transaction.id)}
                        disabled={month.key !== expandedMonthKey}
                        aria-label={month.key === expandedMonthKey ? `Visa köp ${transaction.merchantRaw} ${formatMoney(transaction.amount, props.contextCurrency)}` : undefined}
                      >
                        {month.key === expandedMonthKey ? formatMoney(transaction.amount, props.contextCurrency) : ""}
                      </button>
                    ))}
                  </div>
                ))}
              </Fragment>
            );
          })}
          <div className="timelineTotal stickyCol">Summa per månad</div>
          {props.months.map((month) => (
            <div className="timelineTotal" key={month.key}>
              {formatMoney(props.totals[month.key] ?? 0, props.contextCurrency)}
            </div>
          ))}
        </div>
      </div>
      <div className="mobileTimeline">
        {props.expenses.length === 0 && <p className="note">Inga utgifter ännu.</p>}
        {props.expenses.map((expense) => {
          const supplier = props.suppliers.find((item) => item.id === expense.supplierId);
          const category = props.categories.find((item) => item.id === expense.categoryId);
          const focusMonth = props.months.find((month) => month.isCurrentMonth) ?? props.months[0];
          const focusValue = focusMonth ? expenseAmountForMonth(expense, props.periods, focusMonth) : undefined;
          return (
            <button className="mobileExpenseCard" key={expense.id} onClick={() => props.onSelect(expense.id)}>
              <span className="mobileAccent" style={{ background: supplier?.color ?? category?.color ?? "#b9c1ce" }} />
              <span className="mobileExpenseMain">
                <strong>{expense.name}</strong>
                <small>{supplier?.name ?? "Ingen leverantör"} · {expense.status === "draft" ? "utkast" : necessityLabels[expense.necessityLevel]}</small>
              </span>
              <span className="mobileExpenseAmount">{focusValue && focusValue.amount > 0 ? formatMoney(focusValue.amount, props.contextCurrency) : "-"}</span>
              <span className="mobileMonthStrip">
                {mobileMonths.map((month) => {
                  const value = expenseAmountForMonth(expense, props.periods, month);
                  return (
                    <span className={value.active ? expense.necessityLevel : ""} key={`${expense.id}-mobile-${month.key}`}>
                      <small>{month.label.split(" ")[0]}</small>
                      <strong>{value.amount > 0 ? formatMoney(value.amount, props.contextCurrency) : "-"}</strong>
                      {value.locked && <LockKeyhole size={11} aria-label="Låst period" />}
                    </span>
                  );
                })}
              </span>
            </button>
          );
        })}
        {purchaseRows.map((row) => {
          const focusMonth = props.months.find((month) => month.isCurrentMonth) ?? props.months[0];
          const focusValue = focusMonth ? row.totals[focusMonth.key] ?? 0 : 0;
          const firstMonthValue = props.months[0] ? row.totals[props.months[0].key] ?? 0 : 0;
          const expanded = expandedMobilePurchaseKey === row.key;
          const transactions = mobilePurchaseTransactions(row);
          return (
            <Fragment key={`mobile-${row.key}`}>
              <button
                type="button"
                className={`mobileExpenseCard purchaseAggregateMobile ${expanded ? "expanded" : ""}`}
                onClick={() => setExpandedMobilePurchaseKey((current) => (current === row.key ? undefined : row.key))}
                aria-expanded={expanded}
                aria-label={`${row.label}. ${row.count} enskilda köp. Visa köp i kategorin.`}
              >
                <span className="mobileAccent" style={{ background: row.color }} />
                <span className="mobileExpenseMain">
                  <strong>{row.label}</strong>
                  <small>Enskilda köp · {row.count} köp</small>
                </span>
                <span className="mobileExpenseAmount">{formatMoney(focusValue > 0 ? focusValue : firstMonthValue, props.contextCurrency)}</span>
                <ChevronDown className="mobileRowChevron" size={15} />
                <span className="mobileMonthStrip">
                  {mobileMonths.map((month) => (
                    <span className="purchaseAggregate" key={`${row.key}-mobile-${month.key}`}>
                      <small>{month.label.split(" ")[0]}</small>
                      <strong>{(row.totals[month.key] ?? 0) > 0 ? formatMoney(row.totals[month.key] ?? 0, props.contextCurrency) : "-"}</strong>
                    </span>
                  ))}
                </span>
              </button>
              {expanded && (
                <div className="mobilePurchaseDetails">
                  {transactions.length === 0 && <p className="note">Inga köp att visa i kategorin.</p>}
                  {transactions.map((transaction) => (
                    <button type="button" key={transaction.id} onClick={() => props.onSelectPurchase?.(transaction.id)}>
                      <span>
                        <strong>{transaction.merchantRaw}</strong>
                        <small>{transaction.date}</small>
                      </span>
                      <b>{formatMoney(transaction.amount, transaction.currency)}</b>
                    </button>
                  ))}
                </div>
              )}
            </Fragment>
          );
        })}
        <div className="mobileTotals">
          {mobileMonths.map((month) => (
            <span key={`mobile-total-${month.key}`}>
              <small>{month.label}</small>
              <strong>{formatMoney(props.totals[month.key] ?? 0, props.contextCurrency)}</strong>
            </span>
          ))}
        </div>
      </div>
    </>
  );
}

function Registers({ people, suppliers, categories, attachments, showLists, setState }: { people: Array<{ id: string; firstName: string; lastName: string; monthlyAvailableIncome?: number }>; suppliers: Supplier[]; categories: Category[]; attachments: Attachment[]; showLists: boolean; setState: ReturnType<typeof useAppState>["setState"] }) {
  const [editingPerson, setEditingPerson] = useState<Person | undefined>();
  const [editingSupplier, setEditingSupplier] = useState<Supplier | undefined>();
  const [editingCategory, setEditingCategory] = useState<Category | undefined>();
  return (
    <div className="registerGrid">
      <RegisterForm
        className="supplierRegisterForm"
        title="Leverantörer"
        fields={[
          { key: "name", placeholder: "Namn", value: editingSupplier?.name ?? "" },
          { key: "serviceType", placeholder: "Typ", value: editingSupplier?.serviceType ?? "" },
          { key: "website", placeholder: "Webb", value: editingSupplier?.website ?? "" },
          { key: "cancellationInstructions", placeholder: "Uppsägning", value: editingSupplier?.cancellationInstructions ?? "" }
        ]}
        submitLabel={editingSupplier ? "Spara leverantör" : "Lägg till leverantör"}
        onCancel={editingSupplier ? () => setEditingSupplier(undefined) : undefined}
        onSubmit={(values) => {
          setState((current) => upsertSupplier(current, { id: editingSupplier?.id, name: values.name, serviceType: values.serviceType, website: values.website, cancellationInstructions: values.cancellationInstructions, icon: editingSupplier?.icon ?? "tag", color: editingSupplier?.color }));
          setEditingSupplier(undefined);
        }}
      >
        {showLists && (
          <RegisterRows>
            {suppliers.map((supplier) => (
              <EditableRow
                key={supplier.id}
                primary={<SupplierBadge supplier={supplier} />}
                secondary={`${supplier.serviceType ?? "Leverantör"} · ${supplier.cancellationInstructions ? "Instruktion" : "Saknas"}`}
                onEdit={() => setEditingSupplier(supplier)}
                onDelete={() => setState((current) => removeSupplier(current, supplier.id))}
              />
            ))}
          </RegisterRows>
        )}
      </RegisterForm>
      <div className="registerSideColumn">
        <RegisterForm
          className="personRegisterForm"
          title="Personer & inkomst"
          fields={[
            { key: "firstName", placeholder: "Förnamn", value: editingPerson?.firstName ?? "" },
            { key: "lastName", placeholder: "Efternamn", value: editingPerson?.lastName ?? "" },
            { key: "monthlyAvailableIncome", placeholder: "Disponibel inkomst", value: editingPerson?.monthlyAvailableIncome ? String(editingPerson.monthlyAvailableIncome) : "" }
          ]}
          submitLabel={editingPerson ? "Spara person" : "Lägg till person"}
          onCancel={editingPerson ? () => setEditingPerson(undefined) : undefined}
          onSubmit={(values) => {
            setState((current) => upsertPerson(current, { id: editingPerson?.id, firstName: values.firstName, lastName: values.lastName, monthlyAvailableIncome: values.monthlyAvailableIncome ? Number(values.monthlyAvailableIncome) : undefined }));
            setEditingPerson(undefined);
          }}
        >
          {showLists && (
            <RegisterRows>
              {people.map((person) => (
                <EditableRow
                  key={person.id}
                  primary={`${person.firstName} ${person.lastName}`}
                  secondary={person.monthlyAvailableIncome ? formatMoney(person.monthlyAvailableIncome) : "Ingen inkomst"}
                  onEdit={() => setEditingPerson(person as Person)}
                  onDelete={() => setState((current) => removePerson(current, person.id))}
                />
              ))}
            </RegisterRows>
          )}
        </RegisterForm>
        <RegisterForm
          className="categoryRegisterForm"
          title="Kategorier"
          fields={[
            { key: "name", placeholder: "Namn", value: editingCategory?.name ?? "" },
            { key: "color", placeholder: "Färg", value: editingCategory?.color ?? "" }
          ]}
          submitLabel={editingCategory ? "Spara kategori" : "Lägg till kategori"}
          onCancel={editingCategory ? () => setEditingCategory(undefined) : undefined}
          onSubmit={(values) => {
            setState((current) => upsertCategory(current, { id: editingCategory?.id, name: values.name, color: values.color || "#4fc4bd", icon: editingCategory?.icon ?? "tag" }));
            setEditingCategory(undefined);
          }}
        >
          {showLists && (
            <RegisterRows compact>
              {categories.map((category) => {
                const Icon = iconMap[category.icon as keyof typeof iconMap] ?? Tag;
                return (
                  <EditableRow
                    key={category.id}
                    primary={
                      <span className="chip">
                        <Icon size={14} /> {category.name}
                      </span>
                    }
                    secondary={
                      <span className="colorSwatchLabel">
                        <i style={{ background: category.color }} />
                        {category.color.replace(/^#/, "").toUpperCase()}
                      </span>
                    }
                    onEdit={() => setEditingCategory(category)}
                    onDelete={() => setState((current) => removeCategory(current, category.id))}
                  />
                );
              })}
            </RegisterRows>
          )}
        </RegisterForm>
        {showLists && attachments.length > 0 && (
          <div className="panel registerFilesPanel">
            <div className="panelHeader">
              <h2>Filer</h2>
            </div>
            <RegisterRows>
              {attachments.map((attachment) => (
                <div className="tableRow" key={attachment.id}>
                  <span>{attachment.fileName}</span>
                  <small>{Math.round(attachment.size / 1024)} KB</small>
                </div>
              ))}
            </RegisterRows>
          </div>
        )}
      </div>
    </div>
  );
}

const helpViewCards: Array<{ icon: typeof Wallet; title: string; text: string; items: string[] }> = [
  {
    icon: BarChart3,
    title: "Översikt",
    text: "Här ser du återkommande kostnader och enskilda köp i samma månadsbild.",
    items: ["Sök, filtrera och göm historik i verktygsraden.", "Tryck på en utgift för detaljer, filer och åtgärder.", "Summeringskorten visar vilka kostnader som är lyxiga, nödvändiga, bekväma eller onödiga."]
  },
  {
    icon: ShoppingBag,
    title: "Enskilda köp",
    text: "Kassaboken för bankrader och manuella köp. Den hjälper dig se mönster utan att dubbelräkna abonnemang.",
    items: ["Importera kontoutdrag eller lägg till köp manuellt.", "Flagga köp som granska, onödigt, kandidat eller värt det.", "Matchade återkommande betalningar räknas inte som vanliga enskilda köp."]
  },
  {
    icon: LineChart,
    title: "Statistik",
    text: "Analysvyn visar vad som driver kostnaden över tid och var det finns möjliga åtgärder.",
    items: ["Jämför återkommande kostnader med enskilda köp.", "Se handlare, kategorier, betalare och dragningsdagar.", "Simulera uppsägningar för att förstå effekt innan du ändrar något."]
  },
  {
    icon: Users,
    title: "Register",
    text: "Basdata som gör resten av appen begriplig: personer, leverantörer och kategorier.",
    items: ["Lägg till betalare och disponibel inkomst.", "Spara leverantörer med uppsägningsinfo.", "Håll kategorierna få och tydliga för bättre statistik."]
  },
  {
    icon: ShieldCheck,
    title: "Data",
    text: "Allt som rör lagring, export, import, molnsync och lokal integritet finns här.",
    items: ["Spara lokal datafil när du vill äga filen själv.", "Dela datafil för att flytta till annan enhet.", "Molnsync är local-first och kan kopplas till en egen endpoint."]
  }
];

const helpFunctionCards: Array<{ icon: typeof Wallet; title: string; text: string }> = [
  { icon: Plus, title: "Lägg till utgift", text: "Skapa en återkommande kostnad som prenumeration, försäkring eller avtal. Ofullständiga poster sparas som utkast." },
  { icon: Upload, title: "Importera kontoutdrag", text: "Läs in bankrader som enskilda köp. Appen försöker koppla kända abonnemangsdragningar till rätt återkommande utgift." },
  { icon: RefreshCcw, title: "Undvik dubbelräkning", text: "Återkommande utgift är plan eller avtal. Banktransaktionen är faktisk dragning. Matchade dragningar blir återkommande betalning, inte extra köp." },
  { icon: Paperclip, title: "Bifoga underlag", text: "Spara kvitton, avtal eller uppsägningsunderlag på en utgift. Filer följer med i export med filer." },
  { icon: Download, title: "Flytta mellan enheter", text: "Använd Dela datafil eller exportera JSON. På den andra enheten importerar du filen som ny kontext." },
  { icon: Cloud, title: "Molnsync", text: "För test eller egen drift kan appen synka hela state mot en endpoint. Lokal data finns kvar även om nätet saknas." }
];

function HelpGuide() {
  return (
    <div className="helpGuide">
      <section className="helpHero">
        <div>
          <p className="eyebrow">Om Mina Utgifter</p>
          <h1>Få koll på kostnader, köp och avtal – med data som stannar hos dig.</h1>
          <p>
            Appen skiljer på återkommande kostnader, enskilda köp och bankens faktiska dragningar. Målet är att du snabbt ska se vad som är fast, vad som är beteende och vad du kan påverka.
          </p>
        </div>
        <div className="helpHeroCard">
          <Sparkles size={20} />
          <strong>Bästa start</strong>
          <span>Lägg in återkommande kostnader först. Importera sedan kontoutdrag för enskilda köp och avstämning.</span>
        </div>
      </section>

      <section className="helpQuickGrid" aria-label="Snabb överblick">
        <HelpMini icon={Wallet} title="Lokalt först" text="Datan sparas i webbläsaren och kan exporteras när du vill." />
        <HelpMini icon={ShieldCheck} title="Ingen dubbelräkning" text="Matchade abonnemangsdragningar räknas inte som vanliga köp." />
        <HelpMini icon={FileJson} title="Flyttbar data" text="Dela eller exportera datafilen när du byter enhet." />
      </section>

      <section className="helpSection">
        <div className="helpSectionHeader">
          <h2>Vyerna</h2>
          <span>Vad varje del är till för</span>
        </div>
        <div className="helpViewGrid">
          {helpViewCards.map((card) => {
            const Icon = card.icon;
            return (
              <article className="helpViewCard" key={card.title}>
                <div className="helpIcon"><Icon size={18} /></div>
                <div>
                  <h3>{card.title}</h3>
                  <p>{card.text}</p>
                  <ul>
                    {card.items.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="helpSection">
        <div className="helpSectionHeader">
          <h2>Funktioner</h2>
          <span>Det du använder oftast</span>
        </div>
        <div className="helpFunctionGrid">
          {helpFunctionCards.map((card) => {
            const Icon = card.icon;
            return (
              <article className="helpFunctionCard" key={card.title}>
                <Icon size={17} />
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="helpSection helpFlowPanel">
        <div className="helpSectionHeader">
          <h2>Rekommenderat arbetssätt</h2>
          <span>En lugn ordning</span>
        </div>
        <div className="helpSteps">
          {[
            ["1", "Registrera basen", "Lägg in personer, kategorier och leverantörer så att allt får rätt namn."],
            ["2", "Lägg in fasta kostnader", "Prenumerationer och avtal blir din prognos och din lista över möjliga åtgärder."],
            ["3", "Importera köp", "Kontoutdrag ger verkliga köpvanor. Återkommande dragningar matchas separat."],
            ["4", "Analysera och agera", "Använd Statistik för att hitta största drivare och simulera uppsägning innan du bestämmer dig."],
            ["5", "Spara eller dela", "Exportera, dela datafil eller använd molnsync beroende på hur du vill flytta data."]
          ].map(([step, title, text]) => (
            <div className="helpStep" key={step}>
              <b>{step}</b>
              <span>
                <strong>{title}</strong>
                <small>{text}</small>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="helpSection helpFaq">
        <div className="helpSectionHeader">
          <h2>Bra att veta</h2>
          <span>Vanliga frågor</span>
        </div>
        <details open>
          <summary>Varför finns både återkommande kostnader och kontoutdrag?</summary>
          <p>Återkommande kostnader beskriver vad du har åtagit dig. Kontoutdraget visar vad som faktiskt drogs. När de matchar används transaktionen som avstämning, inte som extra köp.</p>
        </details>
        <details>
          <summary>Kan flera personer använda appen?</summary>
          <p>Ja, lägg till personer i Register och koppla utgifter till betalare. För flera enheter använder du datafil, delning eller molnsync.</p>
        </details>
        <details>
          <summary>Vad bör mer samlas här?</summary>
          <p>På sikt passar korta videogenomgångar, exempeldata, felsökningsflöde för import, och en tydlig integritetssida bra i hjälpen. Den här vyn är byggd för att kunna växa dit.</p>
        </details>
      </section>
    </div>
  );
}

function HelpMini({ icon: Icon, title, text }: { icon: typeof Wallet; title: string; text: string }) {
  return (
    <article className="helpMini">
      <Icon size={18} />
      <span>
        <strong>{title}</strong>
        <small>{text}</small>
      </span>
    </article>
  );
}

function RegisterForm({ title, fields, submitLabel, onSubmit, onCancel, children, className = "" }: { title: string; fields: Array<{ key: string; placeholder: string; value: string }>; submitLabel: string; onSubmit: (values: Record<string, string>) => void; onCancel?: () => void; children?: ReactNode; className?: string }) {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((field) => [field.key, field.value])));
  const signature = fields.map((field) => `${field.key}:${field.value}`).join("|");
  useEffect(() => {
    setValues(Object.fromEntries(fields.map((field) => [field.key, field.value])));
  }, [signature]);
  return (
    <form
      className={`panel stack registerForm ${className}`}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(values);
        setValues(Object.fromEntries(fields.map((field) => [field.key, ""])));
      }}
    >
      <div className="panelHeader">
        <h2>{title}</h2>
      </div>
      <div className="registerFields">
        {fields.map((field) => (
          <input key={field.key} value={values[field.key] ?? ""} onChange={(event) => setValues({ ...values, [field.key]: event.target.value })} placeholder={field.placeholder} />
        ))}
      </div>
      <div className="formActions">
        {onCancel && (
          <button type="button" className="ghostBtn" onClick={onCancel}>
            Avbryt
          </button>
        )}
        <button className="primary">
          <Plus size={17} /> {submitLabel}
        </button>
      </div>
      {children}
    </form>
  );
}

function RegisterRows({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return <div className={`registerRows ${compact ? "compact" : ""}`}>{children}</div>;
}

function EditableRow({ primary, secondary, onEdit, onDelete }: { primary: ReactNode; secondary?: ReactNode; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="editableRow">
      <span>{primary}</span>
      {secondary && <small>{secondary}</small>}
      <div className="rowActions">
        <button type="button" className="iconBtn" onClick={onEdit} title="Redigera">
          <Pencil size={14} />
        </button>
        <button type="button" className="iconBtn dangerText" onClick={onDelete} title="Ta bort">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function SupplierBadge({ supplier }: { supplier: Supplier }) {
  const Icon = iconMap[supplier.icon as keyof typeof iconMap] ?? Tag;
  return (
    <span className="supplierBadge">
      <span className="supplierIcon" style={{ background: supplier.color ?? "#4fc4bd" }}>
        <Icon size={14} />
      </span>
      <span>{supplier.name}</span>
    </span>
  );
}

function buildPurchaseRadar(transactions: PurchaseTransaction[], currency: string) {
  const byFlag = (flag: PurchaseFlag) => transactions.filter((transaction) => transaction.flags?.includes(flag));
  const totalFor = (rows: PurchaseTransaction[]) => rows.reduce((sum, transaction) => sum + transaction.amount, 0);
  const recurringGroups = topTransactionCountRows(transactions, transactionMerchantLabel)
    .filter((row) => row.count >= 3 || transactions.some((transaction) => transactionMerchantLabel(transaction) === row.label && transaction.flags?.includes("recurringCandidate")))
    .sort((a, b) => b.count - a.count || b.total - a.total)
    .slice(0, 5);
  const reviewRows = byFlag("review");
  const unnecessaryRows = byFlag("unnecessary");
  const worthRows = byFlag("worthIt");
  const candidateCount = recurringGroups.reduce((sum, row) => sum + row.count, 0);
  return {
    cards: [
      {
        flag: "review" as const,
        title: "Att granska",
        value: String(reviewRows.length),
        detail: `${formatMoney(totalFor(reviewRows), currency)} markerat för koll.`,
        tone: "blue" as const,
        icon: ShieldCheck
      },
      {
        flag: "unnecessary" as const,
        title: "Onödigt",
        value: formatMoney(totalFor(unnecessaryRows), currency),
        detail: `${unnecessaryRows.length} köp du kan lära dig av.`,
        tone: "red" as const,
        icon: Flag
      },
      {
        flag: "recurringCandidate" as const,
        title: "Kandidater",
        value: String(recurringGroups.length),
        detail: `${candidateCount} köp ser ut som vanor.`,
        tone: "amber" as const,
        icon: RefreshCcw
      },
      {
        flag: "worthIt" as const,
        title: "Värt det",
        value: formatMoney(totalFor(worthRows), currency),
        detail: `${worthRows.length} köp markerade som bra värde.`,
        tone: "green" as const,
        icon: CheckCircle2
      }
    ],
    habits: recurringGroups
  };
}

function Purchases({ context, transactions, categories, suppliers, importPreview, onImportFile, onCommitImport, onCancelImport, onEdit, onDelete, onToggleFlag }: { context: ReturnType<typeof useAppState>["context"]; transactions: PurchaseTransaction[]; categories: Category[]; suppliers: Supplier[]; importPreview?: PurchaseImportPreview; onImportFile: (file: File) => void; onCommitImport: () => void; onCancelImport: () => void; onEdit: (id?: string) => void; onDelete: (id: string) => void; onToggleFlag: (id: string, flag: PurchaseFlag) => void }) {
  const [search, setSearch] = useState("");
  const [activeRadarFlag, setActiveRadarFlag] = useState<PurchaseFlag | undefined>();
  const baseVisible = transactions
    .filter((transaction) => transaction.type !== "ignored")
    .filter((transaction) => [transaction.merchantRaw, transaction.merchantNormalized, transaction.location].join(" ").toLowerCase().includes(search.toLowerCase()));
  const summaryTransactions = baseVisible.filter((transaction) => transaction.type === "one-off");
  const radar = buildPurchaseRadar(summaryTransactions, context.currency);
  const candidateMerchants = new Set(radar.habits.map((habit) => habit.label));
  const isRadarMatch = (transaction: PurchaseTransaction) =>
    activeRadarFlag === "recurringCandidate"
      ? (transaction.flags?.includes("recurringCandidate") ?? false) || candidateMerchants.has(transactionMerchantLabel(transaction))
      : activeRadarFlag
        ? (transaction.flags?.includes(activeRadarFlag) ?? false)
        : false;
  const visible = [...baseVisible].sort((a, b) => {
    if (activeRadarFlag) {
      const matchDiff = Number(isRadarMatch(b)) - Number(isRadarMatch(a));
      if (matchDiff !== 0) return matchDiff;
      if (isRadarMatch(a) && isRadarMatch(b)) return b.amount - a.amount || b.date.localeCompare(a.date);
    }
    return b.date.localeCompare(a.date);
  });
  const total = summaryTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const merchantRows = topTransactionRows(summaryTransactions, (transaction) => transaction.merchantNormalized || transaction.merchantRaw).slice(0, 6);
  const categoryRows = topTransactionRows(summaryTransactions, (transaction) => categories.find((category) => category.id === transaction.categoryId)?.name ?? "Okategoriserat").slice(0, 6);
  const activeRadarLabel = activeRadarFlag ? purchaseFlagMeta[activeRadarFlag].label : undefined;
  const activeRadarCount = activeRadarFlag ? visible.filter(isRadarMatch).length : 0;

  return (
    <div className="purchaseGrid">
      <div className="purchaseToolbar">
        <div className="searchBox">
          <Search size={18} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Sök enskilt köp eller handlare" />
        </div>
        <label className="fileButton">
          <Upload size={17} /> Importera kontoutdrag
          <input type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => event.target.files?.[0] && onImportFile(event.target.files[0])} />
        </label>
        <button className="primary" onClick={() => onEdit()}>
          <Plus size={17} /> Lägg till enskilt köp
        </button>
      </div>

      {importPreview && (
        <div className="panel importPreview">
          <div className="panelHeader">
            <h2>Importförhandsgranskning</h2>
            <span>{importPreview.fileName}</span>
          </div>
          <p className="note">Hittade {importPreview.transactions.length} enskilda köp. Ignorerade {importPreview.ignoredRows} rubriker, summeringar eller ej relevanta rader.</p>
          <div className="importPreviewList">
            {importPreview.transactions.slice(0, 8).map((transaction, index) => (
              <span key={`${transaction.date}-${transaction.merchantRaw}-${index}`}>
                <b>{transaction.date}</b>
                {transaction.merchantRaw}
                <strong>{formatMoney(transaction.amount, transaction.currency)}</strong>
              </span>
            ))}
          </div>
          <div className="modalActions">
            <button className="ghostBtn" onClick={onCancelImport}>Avbryt</button>
            <button className="primary" onClick={onCommitImport}>
              <Import size={17} /> Importera enskilda köp
            </button>
          </div>
        </div>
      )}

      <div className="purchaseSummary">
        <div className="purchaseMetric">
          <CreditCard size={17} />
          <span className="desktopMetricLabel">Enskilda köp</span>
          <span className="mobileMetricLabel">Köp</span>
          <strong>{formatMoney(total, context.currency)}</strong>
          <small>{summaryTransactions.length} poster</small>
        </div>
        <div className="purchaseMetric">
          <Store size={17} />
          <span className="desktopMetricLabel">Största handlare</span>
          <span className="mobileMetricLabel">Handlare</span>
          <strong>{merchantRows[0]?.label ?? "-"}</strong>
          <small>{merchantRows[0] ? formatMoney(merchantRows[0].value, context.currency) : "Ingen data"}</small>
        </div>
        <div className="purchaseMetric">
          <Tag size={17} />
          <span className="desktopMetricLabel">Största kategori</span>
          <span className="mobileMetricLabel">Kategori</span>
          <strong>{categoryRows[0]?.label ?? "-"}</strong>
          <small>{categoryRows[0] ? formatMoney(categoryRows[0].value, context.currency) : "Ingen data"}</small>
        </div>
      </div>

      <div className="panel purchaseRadarPanel">
        <div className="panelHeader">
          <h2>Köpradar</h2>
          <span>Flaggor · vanor · signaler</span>
        </div>
        <div className="radarGrid">
          {radar.cards.map((card) => {
            const Icon = card.icon;
            const active = activeRadarFlag === card.flag;
            return (
              <button
                type="button"
                className={`radarCard ${card.tone} ${active ? "active" : ""}`}
                key={card.title}
                onClick={() => setActiveRadarFlag((current) => (current === card.flag ? undefined : card.flag))}
                aria-pressed={active}
                title={`${active ? "Återställ sortering" : "Sortera kassaboken efter"} ${card.title.toLowerCase()}`}
              >
                <Icon size={17} />
                <span>{card.title}</span>
                <strong>{card.value}</strong>
                <small>{card.detail}</small>
              </button>
            );
          })}
        </div>
        <div className="radarList">
          <div className="miniPanelHeader">
            <strong>Återkommande handlare</strong>
            <span>Flera köp · hitta vanor och småläckage</span>
          </div>
          {radar.habits.length === 0 && <p className="note">Inga återkommande handlare ännu. Importera fler månader eller flagga köp som kandidater.</p>}
          {radar.habits.map((habit) => (
            <div className="radarHabit" key={habit.label}>
              <span>
                <strong>{habit.label}</strong>
                <small>{habit.count} köp · snitt {formatMoney(habit.average, context.currency)}</small>
              </span>
              <b>{formatMoney(habit.total, context.currency)}</b>
            </div>
          ))}
        </div>
      </div>

      <div className="panel purchaseLedger">
        <div className="panelHeader">
          <h2>Köplista</h2>
          <span>{activeRadarLabel ? `${activeRadarLabel} först · ${activeRadarCount} träffar` : `${visible.length} köp`}</span>
        </div>
        <div className="transactionTable" role="table" aria-label="Köplista">
          <div className="transactionHead">Datum</div>
          <div className="transactionHead">Handlare</div>
          <div className="transactionHead">Kategori</div>
          <div className="transactionHead">Signal</div>
          <div className="transactionHead amount">Belopp</div>
          <div className="transactionHead" />
          {visible.map((transaction) => {
            const category = categories.find((item) => item.id === transaction.categoryId);
            const supplier = suppliers.find((item) => item.id === transaction.supplierId);
            return (
              <div className="transactionRow" key={transaction.id} style={{ display: "contents" }}>
                <button type="button" className="transactionCellButton" onClick={() => onEdit(transaction.id)}>{transaction.date}</button>
                <button type="button" className="transactionCellButton merchant" onClick={() => onEdit(transaction.id)}>
                  <strong>{transaction.merchantRaw}</strong>
                  <small>{supplier?.name ?? transaction.location ?? transaction.source}</small>
                </button>
                <button type="button" className="transactionCellButton" onClick={() => onEdit(transaction.id)}>{category?.name ?? "Okategoriserat"}</button>
                <span className="transactionSignals">
                  {(Object.keys(purchaseFlagMeta) as PurchaseFlag[]).map((flag) => {
                    const meta = purchaseFlagMeta[flag];
                    const Icon = meta.icon;
                    const active = transaction.flags?.includes(flag) ?? false;
                    return (
                      <button
                        className={`signalToggle ${meta.tone} ${active ? "active" : ""}`}
                        key={flag}
                        onClick={() => onToggleFlag(transaction.id, flag)}
                        title={meta.label}
                        aria-label={`${meta.label}: ${transaction.merchantRaw}`}
                        aria-pressed={active}
                      >
                        <Icon size={13} />
                      </button>
                    );
                  })}
                </span>
                <button type="button" className="transactionCellButton amount" onClick={() => onEdit(transaction.id)}>{formatMoney(transaction.amount, transaction.currency)}</button>
                <span className="rowActions">
                  <button className="iconBtn" onClick={() => onEdit(transaction.id)} title="Redigera"><Pencil size={14} /></button>
                  <button className="iconBtn dangerText" onClick={() => onDelete(transaction.id)} title="Ta bort"><Trash2 size={14} /></button>
                </span>
              </div>
            );
          })}
        </div>
        <div className="mobileTransactionList" aria-label="Köplista mobil">
          {visible.length === 0 && <p className="note">Inga köp matchar filtret.</p>}
          {visible.map((transaction) => {
            const category = categories.find((item) => item.id === transaction.categoryId);
            const supplier = suppliers.find((item) => item.id === transaction.supplierId);
            return (
              <article className="mobileTransactionCard" key={`mobile-${transaction.id}`}>
                <button type="button" className="mobileTransactionMain" onClick={() => onEdit(transaction.id)}>
                  <span>
                    <strong>{transaction.merchantRaw}</strong>
                    <small>{transaction.date} · {category?.name ?? "Okategoriserat"}</small>
                  </span>
                  <b>{formatMoney(transaction.amount, transaction.currency)}</b>
                </button>
                <div className="mobileTransactionMeta">
                  <small>{supplier?.name ?? transaction.location ?? transaction.source}</small>
                  <span className="transactionSignals">
                    {(Object.keys(purchaseFlagMeta) as PurchaseFlag[]).map((flag) => {
                      const meta = purchaseFlagMeta[flag];
                      const Icon = meta.icon;
                      const active = transaction.flags?.includes(flag) ?? false;
                      return (
                        <button
                          className={`signalToggle ${meta.tone} ${active ? "active" : ""}`}
                          key={flag}
                          onClick={() => onToggleFlag(transaction.id, flag)}
                          title={meta.label}
                          aria-label={`${meta.label.toLowerCase()} ${transaction.merchantRaw}`}
                          aria-pressed={active}
                        >
                          <Icon size={13} />
                        </button>
                      );
                    })}
                  </span>
                </div>
                <div className="mobileTransactionActions">
                  <button type="button" className="iconBtn ghostBtn" onClick={() => onEdit(transaction.id)} title="Redigera" aria-label={`Redigera ${transaction.merchantRaw}`}>
                    <Pencil size={14} /> Redigera
                  </button>
                  <button type="button" className="iconBtn ghostBtn dangerText" onClick={() => onDelete(transaction.id)} title="Ta bort" aria-label={`Ta bort ${transaction.merchantRaw}`}>
                    <Trash2 size={14} /> Ta bort
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>

    </div>
  );
}

const swedishMonthKeys: Record<string, string> = {
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

function transactionPeriodMonth(transaction: PurchaseTransaction): string {
  const fileMonth = monthKeyFromText(transaction.importId ?? "");
  const statementMonth = transaction.statementMonth?.slice(0, 7);
  const fallbackMonth = (transaction.bookedDate ?? transaction.date).slice(0, 7);
  if (fileMonth) return fileMonth;
  if (statementMonth && Math.abs(monthDistance(statementMonth, fallbackMonth)) <= 2) return statementMonth;
  return fallbackMonth;
}

function monthKeyFromText(value: string): string | undefined {
  const normalized = value.trim().toLowerCase();
  const iso = normalized.match(/\b(20\d{2})[-_ ]?(0[1-9]|1[0-2])\b/);
  if (iso) return `${iso[1]}-${iso[2]}`;
  for (const [month, monthNumber] of Object.entries(swedishMonthKeys)) {
    const match = normalized.match(new RegExp(`\\b${month}\\s+(20\\d{2})\\b`));
    if (match) return `${match[1]}-${monthNumber}`;
  }
  return undefined;
}

function monthDistance(a: string, b: string): number {
  const [yearA, monthA] = a.split("-").map(Number);
  const [yearB, monthB] = b.split("-").map(Number);
  if (!yearA || !monthA || !yearB || !monthB) return 0;
  return yearA * 12 + monthA - (yearB * 12 + monthB);
}

function topTransactionRows(transactions: PurchaseTransaction[], groupBy: (transaction: PurchaseTransaction) => string): Array<{ label: string; value: number }> {
  const rows = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.type === "ignored" || transaction.amount <= 0) continue;
    const label = groupBy(transaction) || "Okänt";
    rows.set(label, (rows.get(label) ?? 0) + transaction.amount);
  }
  return [...rows.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

function topTransactionCountRows(transactions: PurchaseTransaction[], groupBy: (transaction: PurchaseTransaction) => string): TransactionCountRow[] {
  const rows = new Map<string, { count: number; total: number }>();
  for (const transaction of transactions) {
    if (transaction.type === "ignored" || transaction.amount <= 0) continue;
    const label = groupBy(transaction) || "Okänt";
    const current = rows.get(label) ?? { count: 0, total: 0 };
    rows.set(label, { count: current.count + 1, total: current.total + transaction.amount });
  }
  return [...rows.entries()]
    .map(([label, row]) => ({ label, count: row.count, total: row.total, average: row.total / Math.max(1, row.count) }))
    .sort((a, b) => b.count - a.count || b.total - a.total);
}

const analyticsColors = ["#1f4a8a", "#0f766e", "#9c7439", "#b75159", "#52787d", "#6b5ca5", "#2f6fdf", "#a15c38"];

function transactionMerchantLabel(transaction: PurchaseTransaction): string {
  return transaction.merchantNormalized || transaction.merchantRaw || "Okänd handlare";
}

function buildMerchantInsightRows(transactions: PurchaseTransaction[], months: TimelineMonth[]): MerchantInsightRow[] {
  const monthKeys = months.map((month) => month.key);
  const groups = new Map<string, { labels: Map<string, number>; total: number; count: number; monthly: Record<string, number> }>();
  for (const transaction of transactions) {
    const key = transactionMerchantLabel(transaction);
    const monthKey = transactionPeriodMonth(transaction);
    const current = groups.get(key) ?? {
      labels: new Map<string, number>(),
      total: 0,
      count: 0,
      monthly: Object.fromEntries(monthKeys.map((key) => [key, 0]))
    };
    current.labels.set(transaction.merchantRaw, (current.labels.get(transaction.merchantRaw) ?? 0) + 1);
    current.total += transaction.amount;
    current.count += 1;
    current.monthly[monthKey] = (current.monthly[monthKey] ?? 0) + transaction.amount;
    groups.set(key, current);
  }
  return [...groups.entries()]
    .map(([key, value], index) => {
      const series = monthKeys.map((monthKey) => value.monthly[monthKey] ?? 0);
      const midpoint = Math.max(1, Math.floor(series.length / 2));
      const earlyAverage = average(series.slice(0, midpoint));
      const lateAverage = average(series.slice(midpoint));
      const label = [...value.labels.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? key;
      const trend = series.length < 2 ? 0 : earlyAverage === 0 ? (lateAverage > 0 ? 100 : 0) : ((lateAverage - earlyAverage) / earlyAverage) * 100;
      const monthsActive = series.filter((amount) => amount > 0).length;
      const trendTone: MerchantInsightRow["trendTone"] = monthsActive < 2 ? "single" : Math.abs(trend) < 15 ? "flat" : trend > 0 ? "up" : "down";
      const trendLabel = trendTone === "single" ? "en månad" : trendTone === "flat" ? "stabilt" : `${trend > 0 ? "+" : ""}${Math.round(trend)}%`;
      return {
        label,
        total: value.total,
        count: value.count,
        average: value.total / Math.max(1, value.count),
        monthsActive,
        trend,
        trendLabel,
        trendTone,
        series,
        color: analyticsColors[index % analyticsColors.length]
      };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);
}

function buildPurchasePeriodRows(transactions: PurchaseTransaction[], months: TimelineMonth[], mode: "month" | "year"): PurchasePeriodRow[] {
  const monthLabels = new Map(months.map((month) => [month.key, month.label]));
  const groups = new Map<string, PurchaseTransaction[]>();
  for (const transaction of transactions) {
    const monthKey = transactionPeriodMonth(transaction);
    const key = mode === "month" ? monthKey : monthKey.slice(0, 4);
    groups.set(key, [...(groups.get(key) ?? []), transaction]);
  }
  const order = mode === "month" ? months.map((month) => month.key) : [...new Set(months.map((month) => month.key.slice(0, 4)))];
  return order
    .map((key) => {
      const rows = groups.get(key) ?? [];
      const total = rows.reduce((sum, transaction) => sum + transaction.amount, 0);
      const merchantCounts = new Map<string, number>();
      for (const transaction of rows) {
        const merchant = transactionMerchantLabel(transaction);
        merchantCounts.set(merchant, (merchantCounts.get(merchant) ?? 0) + 1);
      }
      const topMerchants = [...merchantCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([merchant, count]) => ({ merchant, count }));
      return {
        key,
        label: mode === "month" ? monthLabels.get(key) ?? key : key,
        total,
        count: rows.length,
        average: total / Math.max(1, rows.length),
        uniqueMerchants: merchantCounts.size,
        topMerchants: topMerchants.map((item) => `${item.merchant} × ${item.count}`).join(" · ") || "-"
      };
    })
    .filter((row) => row.count > 0)
    .reverse();
}

function average(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function buildPurchaseCategoryRows(transactions: PurchaseTransaction[], categories: Category[], months: TimelineMonth[], state: ReturnType<typeof useAppState>["state"]): PurchaseCategoryRow[] {
  if (!state.purchasesEnabled || state.filters.payerIds.length > 0) return [];
  const monthKeys = new Set(months.map((month) => month.key));
  const search = state.filters.search.trim().toLowerCase();
  const categoryIds = new Set(state.filters.categoryIds);
  const groups = new Map<string, PurchaseCategoryRow>();

  for (const transaction of transactions) {
    if (transaction.type !== "one-off" || transaction.amount <= 0) continue;
    const monthKey = transactionPeriodMonth(transaction);
    if (!monthKeys.has(monthKey)) continue;
    const category = categories.find((item) => item.id === transaction.categoryId);
    const categoryKey = transaction.categoryId ?? "uncategorized";
    const categoryLabel = category?.name ?? "Okategoriserat";
    if (categoryIds.size > 0 && (!transaction.categoryId || !categoryIds.has(transaction.categoryId))) continue;
    if (search && ![transaction.merchantRaw, transaction.merchantNormalized, transaction.location, categoryLabel].join(" ").toLowerCase().includes(search)) continue;

    const current = groups.get(categoryKey) ?? {
      key: categoryKey,
      label: categoryLabel,
      color: category?.color ?? "#7c8a9c",
      count: 0,
      totals: Object.fromEntries(months.map((month) => [month.key, 0])),
      transactionsByMonth: Object.fromEntries(months.map((month) => [month.key, [] as PurchaseTransaction[]]))
    };
    current.count += 1;
    current.totals[monthKey] = (current.totals[monthKey] ?? 0) + transaction.amount;
    current.transactionsByMonth[monthKey] = [...(current.transactionsByMonth[monthKey] ?? []), transaction].sort((a, b) => b.date.localeCompare(a.date));
    groups.set(categoryKey, current);
  }

  return [...groups.values()].sort((a, b) => Object.values(b.totals).reduce((sum, value) => sum + value, 0) - Object.values(a.totals).reduce((sum, value) => sum + value, 0));
}

function combineRecurringAndPurchaseTotals(recurringTotals: Record<string, number>, purchaseRows: PurchaseCategoryRow[], months: TimelineMonth[]): Record<string, number> {
  return Object.fromEntries(
    months.map((month) => [
      month.key,
      (recurringTotals[month.key] ?? 0) + purchaseRows.reduce((sum, row) => sum + (row.totals[month.key] ?? 0), 0)
    ])
  );
}

function enrichImportedTransaction(input: UpsertTransactionInput, categories: Category[], suppliers: Supplier[], expenses: Expense[], periods: ExpenseCostPeriod[]): UpsertTransactionInput {
  const haystack = `${input.merchantRaw} ${input.merchantNormalized ?? ""}`.toUpperCase();
  const category = inferCategory(haystack, categories);
  const supplier = suppliers.find((item) => haystack.includes(item.name.toUpperCase())) ?? inferSupplier(haystack, suppliers);
  const recurringExpense = findRecurringExpenseMatch(input, expenses, periods, supplier);
  return {
    ...input,
    categoryId: input.categoryId ?? category?.id,
    supplierId: input.supplierId ?? supplier?.id,
    recurringExpenseId: input.recurringExpenseId ?? recurringExpense?.id,
    type: recurringExpense ? "recurring-payment" : input.type ?? "one-off"
  };
}

function findRecurringExpenseMatch(input: UpsertTransactionInput, expenses: Expense[], periods: ExpenseCostPeriod[], supplier?: Supplier): Expense | undefined {
  const haystack = normalizeMatchText(`${input.merchantRaw} ${input.merchantNormalized ?? ""} ${input.description ?? ""}`);
  const transactionDay = Number((input.bookedDate ?? input.date).slice(8, 10));
  const activeExpenses = expenses.filter((expense) => expense.status !== "cancelled");
  const scored = activeExpenses
    .map((expense) => {
      const period = periods.find((item) => item.expenseId === expense.id);
      if (!period || period.recurrence === "one-time") return { expense, score: 0 };
      let score = 0;
      if (supplier?.id && expense.supplierId === supplier.id) score += 5;
      if (haystack.includes(normalizeMatchText(expense.name))) score += 4;
      const expectedSupplier = supplier?.name ? normalizeMatchText(supplier.name) : "";
      if (expectedSupplier && haystack.includes(expectedSupplier)) score += 3;
      const amountDiff = Math.abs(Number(input.amount) - period.amount);
      const tolerance = Math.max(2, period.amount * 0.08);
      if (amountDiff <= tolerance) score += 3;
      if (period.chargeDay && transactionDay && Math.abs(period.chargeDay - transactionDay) <= 4) score += 1;
      return { expense, score };
    })
    .filter((item) => item.score >= 6)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.expense;
}

function normalizeMatchText(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/Å/g, "A")
    .replace(/Ä/g, "A")
    .replace(/Ö/g, "O")
    .replace(/\s+(AB|HB)$/i, "")
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ");
}

function inferCategory(value: string, categories: Category[]): Category | undefined {
  const rules: Array<[RegExp, string[]]> = [
    [/ICA|COOP|MAXI|BAGERI|HEMMAKVALL/, ["Mat", "Boende"]],
    [/OKQ8|PARKSTER|STADIUM|BIL|TANK/, ["Transport"]],
    [/APOTEK|HJARTAT|KAERNAN|STC|GYM|SATS/, ["Hälsa"]],
    [/APPLE|AMAZON|NETFLIX|SPOTIFY|AFTONBLADET|BOKUS|BIO/, ["Underhållning", "Moln & mjukvara", "Nyheter"]],
    [/JULA|VERKTYG|STADIUM/, ["Verktyg"]],
    [/VINTED/, ["Underhållning"]]
  ];
  const match = rules.find(([pattern]) => pattern.test(value));
  const names = match?.[1] ?? [];
  return names.map((name) => categories.find((category) => category.name.toLowerCase() === name.toLowerCase())).find(Boolean) ?? categories[0];
}

function inferSupplier(value: string, suppliers: Supplier[]): Supplier | undefined {
  const rules: Array<[RegExp, RegExp]> = [
    [/APPLE/, /Apple/i],
    [/AMAZON/, /Amazon/i],
    [/OKQ8/, /OKQ8/i],
    [/SPOTIFY/, /Spotify/i],
    [/NETFLIX/, /Netflix/i],
    [/AFTONBLADET/, /Aftonbladet/i],
    [/VATTENFALL/, /Vattenfall/i]
  ];
  const rule = rules.find(([pattern]) => pattern.test(value));
  return rule ? suppliers.find((supplier) => rule[1].test(supplier.name)) : undefined;
}

function SimulationPanel({ state, setState, allExpenses, compact = false, embedded = false }: { state: ReturnType<typeof useAppState>["state"]; setState: ReturnType<typeof useAppState>["setState"]; allExpenses: Expense[]; compact?: boolean; embedded?: boolean }) {
  const excludedIds = state.filters.simulationExcludedExpenseIds;
  const resetSimulation = () =>
    setState((current) => ({
      ...current,
      filters: { ...current.filters, simulationExcludedExpenseIds: [] }
    }));
  return (
    <div className={`${embedded ? "" : "panel"} simulationPanel ${compact ? "compact" : ""} ${embedded ? "embedded" : ""}`}>
      <div className="panelHeader">
        <h2>Simulera uppsägning</h2>
        {excludedIds.length > 0 && <span>{excludedIds.length} aktiv</span>}
      </div>
      {excludedIds.length > 0 && (
        <div className="simulationNotice compactNotice">
          <span>
            <strong>Simulerad vy</strong>
            <small>Utvalda utgifter räknas bort ur analysen men finns kvar.</small>
          </span>
          <button className="ghostBtn" onClick={resetSimulation}>
            <RefreshCcw size={15} /> Återställ
          </button>
        </div>
      )}
      {allExpenses.map((expense) => {
        const checked = excludedIds.includes(expense.id);
        const removalMonth = simulatedRemovalMonth(expense);
        return (
          <label className="simulationRow" key={expense.id}>
            <span>
              <strong>{expense.name}</strong>
              <small>{checked ? `Simuleras uppsagd från ${removalMonth}` : "Ingår i analys"}</small>
            </span>
            <input
              type="checkbox"
              checked={checked}
              aria-label={`Simulera uppsägning av ${expense.name}`}
              onChange={() =>
                setState((current) => ({
                  ...current,
                  filters: {
                    ...current.filters,
                    simulationExcludedExpenseIds: checked ? current.filters.simulationExcludedExpenseIds.filter((id) => id !== expense.id) : [...current.filters.simulationExcludedExpenseIds, expense.id]
                  }
                }))
              }
            />
          </label>
        );
      })}
    </div>
  );
}

function Statistics({ state, setState, expenses, allExpenses, categories, people, suppliers, transactions, months, currency, curveCollapsed, onToggleCurve }: { state: ReturnType<typeof useAppState>["state"]; setState: ReturnType<typeof useAppState>["setState"]; expenses: Expense[]; allExpenses: Expense[]; categories: Category[]; people: Person[]; suppliers: Supplier[]; transactions: PurchaseTransaction[]; months: TimelineMonth[]; currency: string; curveCollapsed: boolean; onToggleCurve: () => void }) {
  const simulationIds = state.filters.simulationExcludedExpenseIds;
  const simulationActive = simulationIds.length > 0;
  const simulationDate = new Date();
  const baseExpenses = filterExpenses(state, allExpenses, { applySimulation: false });
  const originalAccrued = monthlyTotals(baseExpenses, state.costPeriods, months);
  const originalCashflow = cashflowTotals(baseExpenses, state.costPeriods, months);
  const accrued = simulationActive ? simulatedMonthlyTotals(baseExpenses, state.costPeriods, months, simulationIds, simulationDate) : originalAccrued;
  const cashflow = simulationActive ? simulatedCashflowTotals(baseExpenses, state.costPeriods, months, simulationIds, simulationDate) : originalCashflow;
  const monthsCount = Math.max(1, months.length);
  const periodContext = `${months.length} mån period`;
  const monthlyAverage = (value: number) => value / monthsCount;
  const annualized = (value: number) => monthlyAverage(value) * 12;
  const categoryRows = categories
    .map((category) => ({
      category,
      total: baseExpenses
        .filter((expense) => expense.categoryId === category.id)
        .reduce((sum, expense) => sum + months.reduce((monthSum, month) => monthSum + simulatedExpenseAmountForMonth(expense, state.costPeriods, month, simulationIds, simulationDate).amount, 0), 0)
    }))
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 7);
  const personRows = people
    .map((person) => {
      const total = baseExpenses
        .filter((expense) => expense.payerPersonId === person.id)
        .reduce((sum, expense) => sum + months.reduce((monthSum, month) => monthSum + simulatedExpenseAmountForMonth(expense, state.costPeriods, month, simulationIds, simulationDate).amount, 0), 0);
      return {
        person,
        total,
        incomeLeft: person.monthlyAvailableIncome === undefined ? undefined : person.monthlyAvailableIncome - total / monthsCount
      };
    })
    .filter((row) => row.total > 0 || row.person.monthlyAvailableIncome !== undefined)
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);
  const dayHotspots = (() => {
    const buckets = new Map<number, { total: number; count: number }>();
    for (const expense of baseExpenses) {
      for (const period of state.costPeriods.filter((item) => item.expenseId === expense.id)) {
        const day = Math.min(31, Math.max(1, period.chargeDay ?? 1));
        const total = months.reduce((sum, month) => sum + simulatedExpenseCashflowForMonth(expense, [period], month, simulationIds, simulationDate), 0);
        if (total <= 0) continue;
        const current = buckets.get(day) ?? { total: 0, count: 0 };
        buckets.set(day, { total: current.total + total, count: current.count + 1 });
      }
    }
    return [...buckets.entries()].map(([day, value]) => ({ day, ...value })).sort((a, b) => b.total - a.total).slice(0, 6);
  })();
  const supplierRows = suppliers
    .map((supplier) => {
      const supplierExpenses = baseExpenses.filter((expense) => expense.supplierId === supplier.id);
      const total = supplierExpenses.reduce((sum, expense) => sum + months.reduce((monthSum, month) => monthSum + simulatedExpenseAmountForMonth(expense, state.costPeriods, month, simulationIds, simulationDate).amount, 0), 0);
      return { supplier, total };
    })
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);
  const peakMonth = [...months].sort((a, b) => (cashflow[b.key] ?? 0) - (cashflow[a.key] ?? 0))[0];
  const peakDay = dayHotspots[0];
  const monthKeys = new Set(months.map((month) => month.key));
  const periodTransactions = transactions.filter((transaction) => transaction.type === "one-off" && monthKeys.has(transactionPeriodMonth(transaction)));
  const purchaseMerchantRows = topTransactionCountRows(periodTransactions, transactionMerchantLabel)
    .map((row, index) => ({ ...row, color: analyticsColors[index % analyticsColors.length] }))
    .slice(0, 10);
  const purchaseCategoryRows = topTransactionCountRows(periodTransactions, (transaction) => categories.find((category) => category.id === transaction.categoryId)?.name ?? "Okategoriserat")
    .map((row) => ({ ...row, color: categories.find((category) => category.name === row.label)?.color ?? "#0f766e" }))
    .slice(0, 10);
  const recurringPeriodTotal = Object.values(accrued).reduce((sum, value) => sum + value, 0);
  const purchasePeriodTotal = periodTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const purchaseRadar = buildPurchaseRadar(periodTransactions, currency);
  const merchantInsights = buildMerchantInsightRows(periodTransactions, months);
  const purchaseMonthRows = buildPurchasePeriodRows(periodTransactions, months, "month").slice(0, 8);
  const purchaseYearRows = buildPurchasePeriodRows(periodTransactions, months, "year");
  const purchaseAverage = periodTransactions.length ? purchasePeriodTotal / periodTransactions.length : 0;
  const merchantCount = new Set(periodTransactions.map(transactionMerchantLabel)).size;
  const recurringMonthlyAverage = recurringPeriodTotal / monthsCount;
  const recurringAnnualRunRate = recurringMonthlyAverage * 12;
  const recurringNecessityRows = overviewNecessityOrder
    .map((level) => ({
      label: overviewNecessityLabels[level],
      value: baseExpenses
        .filter((expense) => expense.necessityLevel === level)
        .reduce((sum, expense) => sum + months.reduce((monthSum, month) => monthSum + simulatedExpenseAmountForMonth(expense, state.costPeriods, month, simulationIds, simulationDate).amount, 0), 0),
      color: level === "necessary" ? "#b75159" : level === "comfortable" ? "#9c7439" : level === "luxury" ? "#4f7b5b" : "#52787d"
    }))
    .filter((row) => row.value > 0);
  const discretionaryPeriodTotal = recurringNecessityRows.filter((row) => row.label === "Lyxigt" || row.label === "Onödigt").reduce((sum, row) => sum + row.value, 0);
  const purchaseMonthTotals = Object.fromEntries(months.map((month) => [month.key, periodTransactions.filter((transaction) => transactionPeriodMonth(transaction) === month.key).reduce((sum, transaction) => sum + transaction.amount, 0)]));
  const purchasePeakMonth = [...months].sort((a, b) => (purchaseMonthTotals[b.key] ?? 0) - (purchaseMonthTotals[a.key] ?? 0))[0];
  const repeatedMerchant = merchantInsights.find((row) => row.count >= 3) ?? merchantInsights[0];
  const influenceExpenses = baseExpenses
    .map((expense) => {
      const period = state.costPeriods.find((item) => item.expenseId === expense.id);
      const supplier = suppliers.find((item) => item.id === expense.supplierId);
      const monthly = months.reduce((sum, month) => sum + simulatedExpenseAmountForMonth(expense, state.costPeriods, month, simulationIds, simulationDate).amount, 0) / monthsCount;
      return { expense, period, supplier, monthly, freeMonth: earliestFreeMonth(expense) };
    })
    .filter((row) => row.monthly > 0)
    .sort((a, b) => b.monthly - a.monthly);
  const influenceCandidate = influenceExpenses.find((row) => row.expense.necessityLevel !== "necessary") ?? influenceExpenses[0];
  const decisionInsights = buildDecisionInsights({
    currency,
    monthsCount,
    recurringMonthlyAverage,
    recurringAnnualRunRate,
    discretionaryMonthly: discretionaryPeriodTotal / monthsCount,
    topSupplier: supplierRows[0],
    topPurchaseMerchant: repeatedMerchant,
    purchasePeriodTotal,
    purchaseAverage,
    purchasePeakMonth,
    purchasePeakAmount: purchasePeakMonth ? purchaseMonthTotals[purchasePeakMonth.key] ?? 0 : 0,
    peakDay,
    influenceCandidate
  });
  const rawChartMarkers = baseExpenses
    .flatMap((expense) => {
      const period = state.costPeriods.find((item) => item.expenseId === expense.id);
      const supplier = suppliers.find((item) => item.id === expense.supplierId);
      const category = categories.find((item) => item.id === expense.categoryId);
      const color = supplier?.color ?? category?.color ?? "#174a8b";
      const markers: ChartMarker[] = [];
      const startKey = (expense.startDate ?? period?.startDate)?.slice(0, 7);
      if (startKey && monthKeys.has(startKey)) {
        markers.push({ monthKey: startKey, label: expense.name, kind: "Utgift", value: period?.amount ?? 0, amount: period?.amount, supplierName: supplier?.name, color, necessityLevel: expense.necessityLevel });
      }
      const endKey = expense.endDate?.slice(0, 7);
      if (endKey && monthKeys.has(endKey)) {
        markers.push({ monthKey: endKey, label: expense.name, kind: "Avslut", value: 0, amount: period?.amount, supplierName: supplier?.name, color: "#667085", necessityLevel: expense.necessityLevel });
      }
      const freeKey = earliestFreeMonth(expense);
      if (!simulationIds.includes(expense.id) && freeKey && monthKeys.has(freeKey)) {
        markers.push({ monthKey: freeKey, label: expense.name, kind: "Möjlig uppsägning", value: 0, amount: period?.amount, supplierName: supplier?.name, color: "#0f766e", necessityLevel: expense.necessityLevel });
      }
      return markers;
    });
  const groupedReleases = rawChartMarkers
    .filter((marker) => marker.kind === "Möjlig uppsägning")
    .reduce<Record<string, ChartMarker>>((groups, marker) => {
      const existing = groups[marker.monthKey];
      groups[marker.monthKey] = existing
        ? {
            ...existing,
            count: (existing.count ?? 1) + 1,
            amount: (existing.amount ?? 0) + (marker.amount ?? 0),
            entries: [...(existing.entries ?? [{ label: existing.label, amount: existing.amount, supplierName: existing.supplierName, necessityLevel: existing.necessityLevel }]), { label: marker.label, amount: marker.amount, supplierName: marker.supplierName, necessityLevel: marker.necessityLevel }]
          }
        : { ...marker, count: 1, entries: [{ label: marker.label, amount: marker.amount, supplierName: marker.supplierName, necessityLevel: marker.necessityLevel }] };
      return groups;
    }, {});
  const actualBreakMarkers: ChartMarker[] = months.slice(1).flatMap((month, index) => {
    const previousMonth = months[index];
    const totalDelta = (originalCashflow[month.key] ?? 0) - (originalCashflow[previousMonth.key] ?? 0);
    if (totalDelta === 0) return [];
    const entries = baseExpenses
      .map((expense) => {
        const delta = expenseCashflowForMonth(expense, state.costPeriods, month) - expenseCashflowForMonth(expense, state.costPeriods, previousMonth);
        const supplier = suppliers.find((item) => item.id === expense.supplierId);
        return { label: expense.name, amount: delta, supplierName: supplier?.name, necessityLevel: expense.necessityLevel };
      })
      .filter((entry) => entry.amount !== 0)
      .sort((a, b) => Math.abs(b.amount ?? 0) - Math.abs(a.amount ?? 0));
    return [{
      monthKey: month.key,
      label: totalDelta > 0 ? "Ökning" : "Minskning",
      kind: "Faktisk ändring",
      value: originalCashflow[month.key] ?? 0,
      amount: totalDelta,
      color: totalDelta > 0 ? "#b46b07" : "#174a8b",
      count: entries.length > 1 ? entries.length : undefined,
      entries
    }];
  });
  const simulatedBreakMarkerRows: ChartMarker[] = simulationIds.flatMap((expenseId) => {
      const expense = baseExpenses.find((item) => item.id === expenseId);
      if (!expense) return [];
      const monthKey = simulatedRemovalMonth(expense, simulationDate);
      const month = months.find((item) => item.key === monthKey);
      if (!month) return [];
      const period = state.costPeriods.find((item) => item.expenseId === expense.id);
      const supplier = suppliers.find((item) => item.id === expense.supplierId);
      const impact = expenseCashflowForMonth(expense, state.costPeriods, month);
      return [{
        monthKey,
        label: expense.name,
        kind: "Simulerad uppsägning",
        value: cashflow[monthKey] ?? 0,
        amount: impact || period?.amount,
        supplierName: supplier?.name,
        color: "#0f766e",
        necessityLevel: expense.necessityLevel,
        entries: [{ label: expense.name, amount: impact || period?.amount, supplierName: supplier?.name, necessityLevel: expense.necessityLevel }]
      }];
    });
  const simulatedBreakMarkers = simulatedBreakMarkerRows.reduce<Record<string, ChartMarker>>((groups, marker) => {
      const existing = groups[marker.monthKey];
      groups[marker.monthKey] = existing
        ? {
            ...existing,
            count: (existing.count ?? 1) + 1,
            amount: (existing.amount ?? 0) + (marker.amount ?? 0),
            entries: [...(existing.entries ?? [{ label: existing.label, amount: existing.amount, supplierName: existing.supplierName, necessityLevel: existing.necessityLevel }]), ...(marker.entries ?? [])]
          }
        : { ...marker, count: 1 };
      return groups;
    }, {});
  const chartMarkers = (simulationActive
    ? [...actualBreakMarkers, ...Object.values(groupedReleases), ...Object.values(simulatedBreakMarkers)]
    : [...rawChartMarkers.filter((marker) => marker.kind !== "Möjlig uppsägning"), ...Object.values(groupedReleases), ...actualBreakMarkers]
  )
    .sort((a, b) => months.findIndex((month) => month.key === a.monthKey) - months.findIndex((month) => month.key === b.monthKey) || b.value - a.value)
    .slice(0, 40);
  return (
    <div className="statisticsGrid">
      {simulationActive && (
        <div className="simulationNotice simulationBanner">
          <span>
            <strong>Simulerad vy</strong>
            <small>{simulationIds.length} utgifter räknas bort från första möjliga uppsägningsmånad. Saknas uppsägningstid räknas den bort omgående.</small>
          </span>
          <button
            className="ghostBtn"
            onClick={() =>
              setState((current) => ({
                ...current,
                filters: { ...current.filters, simulationExcludedExpenseIds: [] }
              }))
            }
          >
            <RefreshCcw size={15} /> Återställ
          </button>
        </div>
      )}
      <DecisionInsightsPanel insights={decisionInsights} />

      <div className="panel recurringAnalyticsPanel">
        <div className="panelHeader">
          <h2>Återkommande analys</h2>
          <span>Run-rate · mix · besparingssignal</span>
        </div>
        <div className="financeKpis">
          <span>
            <small>Periodiserad period</small>
            <strong>{formatMoney(recurringPeriodTotal, currency)}</strong>
          </span>
          <span>
            <small>Månadssnitt</small>
            <strong>{formatMoney(recurringMonthlyAverage, currency)}</strong>
          </span>
          <span>
            <small>Årstakt</small>
            <strong>{formatMoney(recurringAnnualRunRate, currency)}</strong>
          </span>
          <span>
            <small>Lyxigt/onödigt</small>
            <strong>{formatMoney(discretionaryPeriodTotal / monthsCount, currency)}</strong>
          </span>
        </div>
        <BarList rows={recurringNecessityRows} monthsCount={monthsCount} currency={currency} annualize />
      </div>

      <div className="panel">
        <div className="panelHeader">
          <h2>Kategorier</h2>
          <span>Återkommande · {periodContext}</span>
        </div>
        <PieChart rows={categoryRows.map((row) => ({ label: row.category.name, value: row.total, color: row.category.color }))} monthsCount={monthsCount} currency={currency} />
      </div>

      <div className="panel">
        <div className="panelHeader">
          <h2>Leverantörer</h2>
          <span>Återkommande · {periodContext}</span>
        </div>
        <BarList rows={supplierRows.map((row) => ({ label: row.supplier.name, value: row.total, color: row.supplier.color ?? "#0f766e" }))} monthsCount={monthsCount} currency={currency} annualize />
      </div>

      {state.purchasesEnabled && (
        <>
          <div className="panel">
            <div className="panelHeader">
              <h2>Återkommande vs köp</h2>
              <span>{periodContext}</span>
            </div>
            <BarList
              rows={[
                { label: "Återkommande", value: recurringPeriodTotal, color: "#1f4a8a" },
                { label: "Enskilda köp", value: purchasePeriodTotal, color: "#0f766e" }
              ]}
              monthsCount={monthsCount}
              currency={currency}
              annualize
            />
          </div>
          <WhereMoneyPanel
            merchantRows={purchaseMerchantRows}
            categoryRows={purchaseCategoryRows}
            currency={currency}
            periodContext={periodContext}
          />
          <PurchaseSignalPanel radar={purchaseRadar} currency={currency} />
          <div className="panel purchaseAnalyticsPanel">
            <div className="panelHeader">
              <h2>Köpintelligens</h2>
              <span>Månad · år · handlare</span>
            </div>
            <div className="financeKpis">
              <span>
                <small>Total köpvolym</small>
                <strong>{formatMoney(purchasePeriodTotal, currency)}</strong>
              </span>
              <span>
                <small>Transaktioner</small>
                <strong>{periodTransactions.length}</strong>
              </span>
              <span>
                <small>Medelköp</small>
                <strong>{formatMoney(purchaseAverage, currency)}</strong>
              </span>
              <span>
                <small>Handlare</small>
                <strong>{merchantCount}</strong>
              </span>
            </div>
            <div className="merchantAnalyticsGrid">
              <div className="merchantLeague">
                <div className="miniPanelHeader">
                  <strong>Handlare efter påverkan</strong>
                  <span>Total · antal · snitt</span>
                </div>
                {merchantInsights.length === 0 && <p className="note">Ingen köpdata ännu.</p>}
                {merchantInsights.map((row) => (
                  <div className="merchantInsightRow" key={row.label}>
                    <span>
                      <strong>{row.label}</strong>
                      <small>{row.count} köp · {row.monthsActive} aktiva månader · snitt {formatMoney(row.average, currency)}</small>
                    </span>
                    <Sparkline values={row.series} color={row.color} />
                    <b>{formatMoney(row.total, currency)}</b>
                    <i className={row.trendTone}>{row.trendLabel}</i>
                  </div>
                ))}
              </div>
              <div className="periodLedger">
                <PeriodSummary title="Per månad" rows={purchaseMonthRows} currency={currency} />
                <PeriodSummary title="Per år" rows={purchaseYearRows} currency={currency} />
              </div>
            </div>
          </div>
        </>
      )}

      <div className="panel">
        <div className="panelHeader">
          <h2>Betalare</h2>
          <span>{periodContext}</span>
        </div>
        <BarList rows={personRows.map((row) => ({ label: `${row.person.firstName} ${row.person.lastName}`, value: row.total, color: "#7db7ee" }))} monthsCount={monthsCount} currency={currency} annualize />
      </div>

      <div className="panel">
        <div className="panelHeader">
          <h2>Dragningsdagar</h2>
          <span>{periodContext}</span>
        </div>
        <BarList rows={dayHotspots.map((row) => ({ label: `Dag ${row.day}`, value: row.total, color: row.day >= 25 ? "#b46b07" : "#0f766e" }))} monthsCount={monthsCount} currency={currency} annualize />
      </div>

      <div className={`panel statsHero ${curveCollapsed ? "collapsed" : ""}`}>
        <div className="panelHeader">
          <h2>Utgiftskurva och simulering</h2>
          <button className="ghostBtn panelToggle" onClick={onToggleCurve}>
            {curveCollapsed ? "Visa" : "Fäll ihop"}
          </button>
        </div>
        {curveCollapsed ? (
          <div className="curveSummary">
            <span>Peak {peakMonth ? peakMonth.label : "-"} · {peakMonth ? formatMoney(cashflow[peakMonth.key] ?? 0, currency) : "-"}</span>
            <span>{simulationActive ? "Simulerad vy" : "Periodiserat · faktisk dragning"} · {chartMarkers.length} markörer</span>
          </div>
        ) : (
          <div className="curveSimulationLayout">
            <LineGraph
              months={months}
              series={
                simulationActive
                  ? [
                      { label: "Ursprunglig", values: originalCashflow, color: "#1f4a8a" },
                      { label: "Simulerad", values: cashflow, color: "#0f766e", variant: "dashed" as const }
                    ]
                  : [
                      { label: "Periodiserat", values: accrued, color: "#1f4a8a" },
                      { label: "Dras från konto", values: cashflow, color: "#0f766e" }
                    ]
              }
              markers={chartMarkers}
              currency={currency}
            />
            <SimulationPanel state={state} setState={setState} allExpenses={allExpenses} compact embedded />
          </div>
        )}
      </div>

      <div className="panel cashflowPanel">
        <div className="panelHeader">
          <h2>Kassabelastning</h2>
          <span>{periodContext}</span>
        </div>
        <div className="hotspot">
          <Gauge size={20} />
          <div>
            <strong>{peakMonth ? peakMonth.label : "Saknas"}</strong>
            <span>Högsta kontodragning: {peakMonth ? formatMoney(cashflow[peakMonth.key] ?? 0, currency) : "-"}</span>
          </div>
        </div>
        <div className="hotspot">
          <CalendarDays size={20} />
          <div>
            <strong>{peakDay ? `Dag ${peakDay.day}` : "Ingen dragningsdag"}</strong>
            <span>{peakDay ? `${formatMoney(peakDay.total, currency)} period · ${formatMoney(monthlyAverage(peakDay.total), currency)}/mån · ${formatMoney(annualized(peakDay.total), currency)}/år` : "Lägg till dras-dag på utgifter"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildDecisionInsights({
  currency,
  monthsCount,
  recurringMonthlyAverage,
  recurringAnnualRunRate,
  discretionaryMonthly,
  topSupplier,
  topPurchaseMerchant,
  purchasePeriodTotal,
  purchaseAverage,
  purchasePeakMonth,
  purchasePeakAmount,
  peakDay,
  influenceCandidate
}: {
  currency: string;
  monthsCount: number;
  recurringMonthlyAverage: number;
  recurringAnnualRunRate: number;
  discretionaryMonthly: number;
  topSupplier?: { supplier: Supplier; total: number };
  topPurchaseMerchant?: MerchantInsightRow;
  purchasePeriodTotal: number;
  purchaseAverage: number;
  purchasePeakMonth?: TimelineMonth;
  purchasePeakAmount: number;
  peakDay?: { day: number; total: number; count: number };
  influenceCandidate?: { expense: Expense; supplier?: Supplier; monthly: number; freeMonth?: string };
}): DecisionInsight[] {
  const insights: DecisionInsight[] = [
    {
      title: "Återkommande bas",
      value: formatMoney(recurringMonthlyAverage, currency),
      detail: `Din löpande nivå motsvarar ${formatMoney(recurringAnnualRunRate, currency)}/år innan enskilda köp.`,
      tone: "blue",
      icon: ShieldCheck
    }
  ];
  if (topSupplier) {
    insights.push({
      title: "Största fasta drivare",
      value: topSupplier.supplier.name,
      detail: `${formatMoney(topSupplier.total / Math.max(1, monthsCount), currency)}/mån i snitt över vald period.`,
      tone: "blue",
      icon: Store
    });
  }
  if (discretionaryMonthly > 0) {
    insights.push({
      title: "Påverkbar nivå",
      value: formatMoney(discretionaryMonthly, currency),
      detail: "Lyxiga och onödiga återkommande utgifter per månad.",
      tone: discretionaryMonthly > recurringMonthlyAverage * 0.25 ? "amber" : "green",
      icon: Sparkles
    });
  }
  if (influenceCandidate && influenceCandidate.monthly > 0) {
    insights.push({
      title: "Första åtgärd",
      value: influenceCandidate.expense.name,
      detail: `${formatMoney(influenceCandidate.monthly, currency)}/mån${influenceCandidate.freeMonth ? ` · möjlig från ${influenceCandidate.freeMonth}` : ""}.`,
      tone: influenceCandidate.expense.necessityLevel === "necessary" ? "amber" : "green",
      icon: Wrench
    });
  }
  if (purchasePeriodTotal > 0) {
    insights.push({
      title: "Enskilda köp",
      value: formatMoney(purchasePeriodTotal, currency),
      detail: `Snittköp ${formatMoney(purchaseAverage, currency)}. Detta är periodutfall, inte årskostnad.`,
      tone: "green",
      icon: ShoppingBag
    });
  }
  if (topPurchaseMerchant) {
    insights.push({
      title: topPurchaseMerchant.count >= 3 ? "Återkommande köpvanor" : "Största handlare",
      value: topPurchaseMerchant.label,
      detail: `${topPurchaseMerchant.count} köp · ${formatMoney(topPurchaseMerchant.total, currency)} totalt.`,
      tone: topPurchaseMerchant.count >= 3 ? "amber" : "green",
      icon: Store
    });
  }
  if (purchasePeakMonth && purchasePeakAmount > 0) {
    insights.push({
      title: "Köptopp",
      value: purchasePeakMonth.label,
      detail: `${formatMoney(purchasePeakAmount, currency)} i enskilda köp den månaden.`,
      tone: "amber",
      icon: LineChart
    });
  }
  if (peakDay) {
    insights.push({
      title: "Kontobelastning",
      value: `Dag ${peakDay.day}`,
      detail: `${formatMoney(peakDay.total / Math.max(1, monthsCount), currency)}/mån i snitt dras kring den dagen.`,
      tone: "blue",
      icon: CalendarDays
    });
  }
  return insights.slice(0, 8);
}

function DecisionInsightsPanel({ insights }: { insights: DecisionInsight[] }) {
  return (
    <div className="panel decisionPanel">
      <div className="panelHeader">
        <h2>Insikter och åtgärder</h2>
        <span>Prioriterat beslutsunderlag</span>
      </div>
      <div className="decisionGrid">
        {insights.map((insight) => {
          const Icon = insight.icon;
          return (
            <div className={`decisionCard ${insight.tone}`} key={`${insight.title}-${insight.value}`}>
              <Icon size={18} />
              <span>
                <small>{insight.title}</small>
                <strong>{insight.value}</strong>
                <em>{insight.detail}</em>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LineGraph({ months, series, markers, currency }: { months: TimelineMonth[]; series: Array<{ label: string; values: Record<string, number>; color: string; variant?: "solid" | "dashed" }>; markers: ChartMarker[]; currency: string }) {
  const width = 720;
  const height = 230;
  const padding = 28;
  const leftPadding = 56;
  const allValues = series.flatMap((line) => months.map((month) => line.values[month.key] ?? 0));
  const max = Math.max(1, ...allValues, ...markers.map((marker) => marker.value));
  const yTicks = [0, 0.25, 0.5, 0.75, 1];
  const x = (index: number) => leftPadding + (index * (width - leftPadding - padding)) / Math.max(1, months.length - 1);
  const y = (value: number) => height - padding - (value / max) * (height - padding * 2);
  const markerX = (marker: ChartMarker) => x(Math.max(0, months.findIndex((month) => month.key === marker.monthKey)));
  const markerY = (marker: ChartMarker, index: number) => (marker.value > 0 || marker.kind === "Faktisk ändring" || marker.kind === "Simulerad uppsägning" ? y(Math.min(marker.value, max)) : 42 + (index % 3) * 15);
  const markerGuides = [...new Set(markers.map((marker) => marker.monthKey))];
  const markerLabel = (marker: ChartMarker) => (marker.kind === "Möjlig uppsägning" ? "Möjlig uppsägning" : marker.kind === "Simulerad uppsägning" ? "Simulerad" : marker.kind === "Faktisk ändring" ? "Ändring" : marker.kind);
  const markerTitle = (marker: ChartMarker) => (marker.count && marker.count > 1 ? `${markerLabel(marker)} x ${marker.count}` : markerLabel(marker));
  const markerEntries = (marker: ChartMarker) => marker.entries ?? [{ label: marker.label, amount: marker.amount ?? marker.value, supplierName: marker.supplierName, necessityLevel: marker.necessityLevel }];
  const markerDescription = (marker: ChartMarker) =>
    marker.kind === "Faktisk ändring"
      ? "Brytpunkt i den faktiska kurvan: visar vilka utgifter som ändrade kontodragningen."
      : marker.kind === "Simulerad uppsägning"
      ? "Simulerad uppsägning: brytpunkt där den simulerade kurvan minskar."
      : marker.kind === "Möjlig uppsägning"
      ? "Tidigaste månad då utgiften kan sägas upp enligt uppsägningstid."
      : marker.kind === "Avslut"
        ? "Månad då utgiften är markerad som avslutad."
        : marker.kind === "Start"
          ? "Månad då utgiften börjar."
          : "Registrerad utgift eller periodstart.";
  const tooltipLine = (label: string, value: string) => `${label.padEnd(11, " ")} ${value}`;
  const costLabel = (amount?: number) => (amount ? `${formatMoney(amount, currency)} (${formatMoney(amount * 12, currency)}/år)` : "-");
  const markerTooltip = (marker: ChartMarker) => [
    marker.kind,
    tooltipLine("Månad", marker.monthKey),
    ...markerEntries(marker).flatMap((entry, index, entries) => [
      ...(index > 0 ? ["â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€"] : []),
      tooltipLine(markerEntries(marker).length > 1 ? `Utgift ${index + 1}` : "Utgift", entry.label),
      tooltipLine("Kostnad", costLabel(entry.amount))
    ]),
    "",
    markerDescription(marker)
  ].join("\n");
  return (
    <div className="chartBlock">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Utgiftskurva">
        {yTicks.map((ratio) => (
          <g key={`grid-${ratio}`}>
            <line x1={leftPadding} x2={width - padding} y1={y(max * ratio)} y2={y(max * ratio)} className="gridLine" />
          </g>
        ))}
        {markerGuides.map((monthKey) => {
          const index = months.findIndex((month) => month.key === monthKey);
          return <line key={monthKey} x1={x(index)} x2={x(index)} y1={padding - 6} y2={height - padding} className="markerGuide" />;
        })}
        {series.map((line) => {
          const points = months.map((month, index) => `${x(index)},${y(line.values[month.key] ?? 0)}`).join(" ");
          return <polyline key={line.label} points={points} fill="none" stroke={line.color} strokeWidth={line.variant === "dashed" ? "3.8" : "3"} strokeDasharray={line.variant === "dashed" ? "7 5" : undefined} strokeLinecap="round" strokeLinejoin="round" />;
        })}
        <g className="yAxisLayer">
          <line x1={leftPadding} x2={leftPadding} y1={padding - 6} y2={height - padding} className="axisLine" />
          {yTicks.map((ratio) => (
            <text key={`axis-${ratio}`} x={leftPadding - 8} y={y(max * ratio) + 3} textAnchor="end" className="yAxisText">
              {formatMoney(max * ratio, currency)}
            </text>
          ))}
        </g>
        {months.map((month, index) => (
          <text key={month.key} x={x(index)} y={height - 6} textAnchor="middle" className="axisText">
            {month.label.split(" ")[0]}
          </text>
        ))}
        {markers.map((marker, index) => {
          const cx = markerX(marker);
          const cy = markerY(marker, index);
          const label = markerTitle(marker);
          const labelWidth = Math.min(142, Math.max(54, label.length * 5.2 + 12));
          const labelX = Math.max(leftPadding + 2, Math.min(width - padding - labelWidth, cx + 8));
          const labelY = marker.kind === "Möjlig uppsägning" ? Math.min(height - padding - 20, cy + 16) : Math.max(18, cy - 24);
          type TooltipRow = { kind: "row"; key: string; value: string } | { kind: "divider" };
          const entries = markerEntries(marker);
          const entryRows: TooltipRow[] = [];
          entries.forEach((entry, entryIndex) => {
            if (entryIndex > 0) entryRows.push({ kind: "divider" });
            entryRows.push({ kind: "row", key: entries.length > 1 ? `Utgift ${entryIndex + 1}` : "Utgift", value: entry.label });
            if (entry.necessityLevel) entryRows.push({ kind: "row", key: "Typ", value: overviewNecessityLabels[entry.necessityLevel] });
            entryRows.push({ kind: "row", key: marker.kind === "Simulerad uppsägning" ? "Minskning" : marker.kind === "Faktisk ändring" ? "Förändring" : "Kostnad", value: costLabel(entry.amount) });
          });
          const tooltipRows: TooltipRow[] = [{ kind: "row", key: "Månad", value: marker.monthKey }];
          for (const row of entryRows) {
            if (tooltipRows.length >= 9) break;
            tooltipRows.push(row);
          }
          const tooltipHeight = 30 + tooltipRows.reduce((sum, row) => sum + (row.kind === "divider" ? 8 : 14), 0);
          return (
            <g key={`${marker.kind}-${marker.monthKey}-${marker.label}-${index}`} className="chartMarker">
              <line x1={cx} x2={cx} y1={cy} y2={height - padding} stroke={marker.color} />
              <circle cx={cx} cy={cy} r={4.2} fill={marker.color} />
              <g className="markerBadge">
                <rect x={labelX} y={labelY - 10} width={labelWidth} height="14" rx="4" />
                <text x={labelX + 6} y={labelY}>
                  {label}
                </text>
              </g>
              <g className="chartTooltip" transform={`translate(${Math.min(width - 206, Math.max(12, cx + 12))} ${Math.max(12, Math.min(height - tooltipHeight - 6, cy - 54))})`}>
                <rect width="194" height={tooltipHeight} rx="7" />
                <text x="10" y="17" className="tooltipTitle">{marker.kind}</text>
                {tooltipRows.reduce<{ nodes: ReactNode[]; y: number }>((acc, row, rowIndex) => {
                  if (row.kind === "divider") {
                    acc.nodes.push(<line key={`divider-${rowIndex}`} x1="10" x2="184" y1={acc.y - 5} y2={acc.y - 5} className="tooltipDivider" />);
                    acc.y += 8;
                    return acc;
                  }
                  acc.nodes.push(
                    <text key={`${row.key}-${rowIndex}`} x="10" y={acc.y}>
                      <tspan className="tooltipKey">{row.key}</tspan>
                      <tspan className="tooltipValue" x="78">{row.value}</tspan>
                    </text>
                  );
                  acc.y += 14;
                  return acc;
                }, { nodes: [], y: 36 }).nodes}
              </g>
            </g>
          );
        })}
      </svg>
      <div className="legend">
        {series.map((line) => (
          <span key={line.label}>
            <i style={{ background: line.color }} /> {line.label}
          </span>
        ))}
        <strong>Peak {formatMoney(max, currency)}</strong>
      </div>
      {markers.length > 0 && (
        <div className="markerTape">
          {markers.slice(0, 8).map((marker, index) => (
            <span key={`${marker.kind}-${marker.monthKey}-${marker.label}-${index}`}>
              <i style={{ background: marker.color }} />
              <b>{marker.monthKey}</b>
              {markerTitle(marker)}: {markerEntries(marker).map((entry) => entry.label).join(", ")}
              {(marker.amount ?? marker.value) > 0 ? ` · ${formatMoney(marker.amount ?? marker.value, currency)}` : ""}
            </span>
          ))}
        </div>
      )}
      <div className="markerHelp">
        <span><b>Utgift</b> periodstart eller registrerat belopp</span>
        <span><b>Avslut</b> markerad avslutad utgift</span>
        <span><b>Möjlig uppsägning</b> tidigaste månad då utgiften kan sägas upp</span>
      </div>
    </div>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const width = 118;
  const height = 34;
  const max = Math.max(1, ...values);
  const points = values.length
    ? values.map((value, index) => `${(index * (width - 8)) / Math.max(1, values.length - 1) + 4},${height - 5 - (value / max) * (height - 10)}`).join(" ")
    : `4,${height - 5} ${width - 4},${height - 5}`;
  return (
    <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <line x1="4" y1={height - 5} x2={width - 4} y2={height - 5} />
      <polyline points={points} style={{ stroke: color }} />
    </svg>
  );
}

function PeriodSummary({ title, rows, currency }: { title: string; rows: PurchasePeriodRow[]; currency: string }) {
  return (
    <div className="periodSummary">
      <div className="miniPanelHeader">
        <strong>{title}</strong>
        <span>Total · snitt · topphandlare</span>
      </div>
      {rows.length === 0 && <p className="note">Ingen data ännu.</p>}
      {rows.map((row) => (
        <div className="periodSummaryRow" key={row.key}>
          <span>
            <strong>{row.label}</strong>
            <small>{row.count} köp · {row.uniqueMerchants} handlare</small>
          </span>
          <span className="periodSummaryNumbers">
            <b>{formatMoney(row.total, currency)}</b>
            <em>{formatMoney(row.average, currency)} snitt</em>
          </span>
          <span className="periodMerchantChips">
            {row.topMerchants.split(" · ").map((merchant) => (
              <small key={`${row.key}-${merchant}`}>{merchant}</small>
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}

function WhereMoneyPanel({
  merchantRows,
  categoryRows,
  currency,
  periodContext
}: {
  merchantRows: TransactionCountRow[];
  categoryRows: TransactionCountRow[];
  currency: string;
  periodContext: string;
}) {
  const merchantAmountRows = [...merchantRows].sort((a, b) => b.total - a.total || b.count - a.count).slice(0, 6);
  const merchantCountRows = [...merchantRows].sort((a, b) => b.count - a.count || b.total - a.total).slice(0, 6);
  const categoryAmountRows = [...categoryRows].sort((a, b) => b.total - a.total || b.count - a.count).slice(0, 6);
  const categoryCountRows = [...categoryRows].sort((a, b) => b.count - a.count || b.total - a.total).slice(0, 6);
  return (
    <div className="panel whereMoneyPanel">
      <div className="panelHeader">
        <h2>Var pengarna går</h2>
        <span>Belopp · transaktioner · {periodContext}</span>
      </div>
      <div className="whereGrid">
        <SpendRanking icon={Store} title="Handlare" subtitle="Mest pengar" mode="amount" rows={merchantAmountRows} currency={currency} />
        <SpendRanking icon={ReceiptText} title="Handlare" subtitle="Flest transaktioner" mode="count" rows={merchantCountRows} currency={currency} />
        <SpendRanking icon={Tag} title="Kategori" subtitle="Mest pengar" mode="amount" rows={categoryAmountRows} currency={currency} />
        <SpendRanking icon={BarChart3} title="Kategori" subtitle="Flest transaktioner" mode="count" rows={categoryCountRows} currency={currency} />
      </div>
    </div>
  );
}

function SpendRanking({ icon: Icon, title, subtitle, mode, rows, currency }: { icon: typeof Wallet; title: string; subtitle: string; mode: "amount" | "count"; rows: TransactionCountRow[]; currency: string }) {
  const max = Math.max(1, ...rows.map((row) => (mode === "amount" ? row.total : row.count)));
  return (
    <div className="whereColumn">
      <div className="miniPanelHeader">
        <strong><Icon size={15} /> {title}</strong>
        <span>{subtitle}</span>
      </div>
      {rows.length === 0 && <p className="note">Ingen köpdata ännu.</p>}
      {rows.map((row) => {
        const metric = mode === "amount" ? row.total : row.count;
        return (
          <div className="whereRow" key={`${title}-${row.label}`}>
            <span>
              <strong>{row.label}</strong>
              <small>{row.count} köp · snitt {formatMoney(row.average, currency)}</small>
            </span>
            <b>{mode === "amount" ? formatMoney(row.total, currency) : `${row.count} st`}</b>
            <div>
              <i style={{ width: `${Math.max(7, (metric / max) * 100)}%`, background: row.color ?? "#1f4a8a" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PurchaseSignalPanel({ radar, currency }: { radar: ReturnType<typeof buildPurchaseRadar>; currency: string }) {
  const strongestHabit = radar.habits[0];
  return (
    <div className="panel purchaseSignalPanel">
      <div className="panelHeader">
        <h2>Pengaläckor och vanor</h2>
        <span>Flaggade köp · återkommande mönster</span>
      </div>
      <div className="signalInsightGrid">
        {radar.cards.map((card) => {
          const Icon = card.icon;
          return (
            <div className={`signalInsight ${card.tone}`} key={card.title}>
              <Icon size={17} />
              <span>{card.title}</span>
              <strong>{card.value}</strong>
              <small>{card.detail}</small>
            </div>
          );
        })}
      </div>
      <div className="signalFocus">
        <span>
          <strong>{strongestHabit ? strongestHabit.label : "Inget tydligt mönster ännu"}</strong>
          <small>
            {strongestHabit
              ? `${strongestHabit.count} köp · ${formatMoney(strongestHabit.total, currency)} totalt · snitt ${formatMoney(strongestHabit.average, currency)}`
              : "Flagga köp eller importera fler kontoutdrag så växer analysen fram."}
          </small>
        </span>
        <b>{strongestHabit ? "Starkaste vana" : "Radar väntar"}</b>
      </div>
    </div>
  );
}

function PieChart({ rows, monthsCount = 1, currency }: { rows: Array<{ label: string; value: number; color: string }>; monthsCount?: number; currency: string }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const monthly = (value: number) => value / Math.max(1, monthsCount);
  const yearly = (value: number) => monthly(value) * 12;
  let cursor = 0;
  const gradient = rows
    .map((row) => {
      const start = cursor;
      const end = total ? cursor + (row.value / total) * 100 : cursor;
      cursor = end;
      return `${row.color} ${start}% ${end}%`;
    })
    .join(", ");
  return (
    <div className="pieLayout">
      <div className="pie" style={{ background: total ? `conic-gradient(${gradient})` : "#e5e7eb" }}>
        <span>
          <small>Period</small>
          <strong>{formatMoney(total, currency)}</strong>
          <small>{formatMoney(monthly(total), currency)}/mån</small>
        </span>
      </div>
      <div>
        {rows.map((row) => (
          <div className="legendRow" key={row.label}>
            <i style={{ background: row.color }} />
            <span>{row.label}</span>
            <strong>{formatMoney(row.value, currency)}</strong>
            <small>{total ? Math.round((row.value / total) * 100) : 0}% · {formatMoney(monthly(row.value), currency)}/mån · {formatMoney(yearly(row.value), currency)}/år</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarList({ rows, monthsCount = 1, currency, annualize = false, mode = "recurring" }: { rows: Array<{ label: string; value: number; color: string }>; monthsCount?: number; currency: string; annualize?: boolean; mode?: "recurring" | "purchases" }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  const monthly = (value: number) => value / Math.max(1, monthsCount);
  return (
    <div className="barList">
      {rows.length === 0 && <p className="note">Ingen data ännu.</p>}
      {rows.map((row) => (
        <div className="statBar" key={row.label} title={`${row.label}: ${formatMoney(row.value, currency)}`}>
          <span>{row.label}</span>
          <strong>{formatMoney(row.value, currency)}</strong>
          <small>
            {Math.round((row.value / max) * 100)}% av topp · {mode === "purchases" ? `periodsnitt ${formatMoney(monthly(row.value), currency)}/mån` : `${formatMoney(monthly(row.value), currency)}/mån`}
            {annualize ? ` · ${formatMoney(monthly(row.value) * 12, currency)}/år` : ""}
          </small>
          <div>
            <i style={{ width: `${Math.max(5, (row.value / max) * 100)}%`, background: row.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function CloudSyncPanel({
  cloudSync,
  configureCloudSync,
  pullCloudState,
  pushCloudStateNow,
  disconnectCloudSync
}: {
  cloudSync: ReturnType<typeof useAppState>["cloudSync"];
  configureCloudSync: ReturnType<typeof useAppState>["configureCloudSync"];
  pullCloudState: ReturnType<typeof useAppState>["pullCloudState"];
  pushCloudStateNow: ReturnType<typeof useAppState>["pushCloudStateNow"];
  disconnectCloudSync: ReturnType<typeof useAppState>["disconnectCloudSync"];
}) {
  const [endpoint, setEndpoint] = useState(cloudSync.config.endpoint);
  const [token, setToken] = useState(cloudSync.config.token ?? "");
  useEffect(() => {
    setEndpoint(cloudSync.config.endpoint);
    setToken(cloudSync.config.token ?? "");
  }, [cloudSync.config.endpoint, cloudSync.config.token]);
  const connected = cloudSync.config.enabled;
  const statusLabel =
    cloudSync.status === "synced"
      ? "Synkad"
      : cloudSync.status === "syncing"
        ? "Synkar"
        : cloudSync.status === "conflict"
          ? "Konflikt"
          : cloudSync.status === "error"
            ? "Fel"
            : connected
              ? "Redo"
              : "Av";
  return (
    <details className="panel stack advancedDataPanel cloudSyncPanel">
      <summary>
        <span className="summaryIcon">
          <Cloud size={18} />
        </span>
        <span>
          <strong>Molnsync</strong>
          <small>{connected ? `Aktiv · ${statusLabel}` : "Avancerat: egen endpoint"}</small>
        </span>
        <ChevronDown size={17} />
      </summary>
      <div className="advancedDataBody">
        <p className="note">För egen drift. Appen hämtar och sparar hela datan mot en endpoint, men fortsätter vara local-first.</p>
        <label>Endpoint</label>
        <input value={endpoint} onChange={(event) => setEndpoint(event.target.value)} placeholder="https://.../mina-utgifter/state" />
        <label>Token</label>
        <input value={token} onChange={(event) => setToken(event.target.value)} placeholder="Bearer-token" type="password" />
        <button
          className={connected ? "selected" : "primary"}
          onClick={() => configureCloudSync({ endpoint, token, enabled: Boolean(endpoint.trim()) })}
          disabled={!endpoint.trim()}
        >
          <Cloud size={17} /> {connected ? "Uppdatera molnkoppling" : "Aktivera molnsync"}
        </button>
        <div className="cloudSyncActions">
          <button onClick={() => void pullCloudState()} disabled={!connected || cloudSync.status === "syncing"}>
            <Download size={17} /> Hamta
          </button>
          <button onClick={() => void pushCloudStateNow()} disabled={!connected || cloudSync.status === "syncing"}>
            <Upload size={17} /> Spara
          </button>
        </div>
        <button className="ghostBtn" onClick={disconnectCloudSync} disabled={!connected}>
          Koppla loss molnsync
        </button>
        {cloudSync.config.lastSyncedAt && <p className="note">Senast synkad {new Date(cloudSync.config.lastSyncedAt).toLocaleString("sv-SE")}</p>}
        {cloudSync.error && <p className="error">{cloudSync.error}</p>}
      </div>
    </details>
  );
}

function Admin({
  context,
  state,
  setState,
  dataFile,
  connectDataFile,
  saveAsDataFile,
  saveDataFileNow,
  disconnectDataFile,
  cloudSync,
  configureCloudSync,
  pullCloudState,
  pushCloudStateNow,
  disconnectCloudSync,
  importErrors,
  importFile,
  reset
}: {
  context: ReturnType<typeof useAppState>["context"];
  state: ReturnType<typeof useAppState>["state"];
  setState: ReturnType<typeof useAppState>["setState"];
  dataFile: ReturnType<typeof useAppState>["dataFile"];
  connectDataFile: ReturnType<typeof useAppState>["connectDataFile"];
  saveAsDataFile: ReturnType<typeof useAppState>["saveAsDataFile"];
  saveDataFileNow: ReturnType<typeof useAppState>["saveDataFileNow"];
  disconnectDataFile: ReturnType<typeof useAppState>["disconnectDataFile"];
  cloudSync: ReturnType<typeof useAppState>["cloudSync"];
  configureCloudSync: ReturnType<typeof useAppState>["configureCloudSync"];
  pullCloudState: ReturnType<typeof useAppState>["pullCloudState"];
  pushCloudStateNow: ReturnType<typeof useAppState>["pushCloudStateNow"];
  disconnectCloudSync: ReturnType<typeof useAppState>["disconnectCloudSync"];
  importErrors: string[];
  importFile: (event: ChangeEvent<HTMLInputElement>) => void;
  reset: () => void;
}) {
  const resetLocalData = () => {
    if (!window.confirm("Rensa lokal cache? En ansluten datafil kopplas loss och skrivs inte over.")) return;
    if (window.confirm("Sista kontrollen: rensa endast den lokala browsercachen?")) void reset();
  };
  const dataFileTitle = dataFile.fileName ?? "Sparas i den här webbläsaren";
  const dataFileDetail = dataFile.supported
    ? dataFile.savedAt
      ? `Senast sparad ${new Date(dataFile.savedAt).toLocaleString("sv-SE")}`
      : dataFile.fileName
        ? "Autosparar när filen är ansluten."
        : "Skapa en datafil om du vill kunna flytta eller säkerhetskopiera datan."
    : "Din webbläsare stödjer inte automatisk lokal datafil. Använd Dela datafil.";
  return (
    <div className="adminGrid dataWorkspace">
      <section className="dataMainColumn">
        <div className="panel stack dataFilePanel dataHomePanel">
          <div className="panelHeader">
            <h2>Din data</h2>
            <span>{dataFile.fileName ? "Datafil" : "Lokalt"}</span>
          </div>
          <div className={`dataFileStatus ${dataFile.status}`}>
            <FileJson size={18} />
            <span>
              <strong>{dataFileTitle}</strong>
              <small>{dataFileDetail}</small>
            </span>
          </div>
          <div className="dataPrimaryActions">
            <button className="dataAction primaryDataAction" onClick={() => void saveDataFileNow()} disabled={!dataFile.supported || dataFile.status === "saving"}>
              <Download size={18} />
              <span>
                <strong>{dataFile.fileName ? "Spara datafil" : "Skapa datafil"}</strong>
                <small>{dataFile.fileName ? "Skriv senaste ändringarna till filen." : "Bästa valet för backup på den här enheten."}</small>
              </span>
            </button>
            <button className="dataAction" onClick={() => void shareDataFile(state)}>
              <Upload size={18} />
              <span>
                <strong>Dela till annan enhet</strong>
                <small>Skicka en datafil med AirDrop, mail eller annan delning.</small>
              </span>
            </button>
            <label className="fileButton dataAction">
              <Import size={18} />
              <span>
                <strong>Importera från fil</strong>
                <small>Läs in en datafil som ny kontext.</small>
              </span>
              <input type="file" accept="application/json" onChange={importFile} />
            </label>
          </div>
          <details className="inlineAdvanced">
            <summary>Fler filval</summary>
            <div>
              <button onClick={() => void connectDataFile()} disabled={!dataFile.supported}>
                <Import size={17} /> Öppna annan datafil
              </button>
              <button onClick={() => void saveAsDataFile()} disabled={!dataFile.supported}>
                <FileJson size={17} /> Spara som ny datafil
              </button>
              <button className="ghostBtn" onClick={() => void disconnectDataFile()} disabled={!dataFile.fileName}>
                Koppla loss datafil
              </button>
            </div>
          </details>
          {dataFile.error && <p className="error">{dataFile.error}</p>}
          {importErrors.map((error) => (
            <p className="error" key={error}>
              {error}
            </p>
          ))}
        </div>

        <ContextSwitcher state={state} setState={setState} activeContextId={context.id} />

        <div className="panel stack remindersPanel">
          <div className="panelHeader">
            <h2>Påminnelser</h2>
            <span>Lokalt</span>
          </div>
          <p className="note">Skapas automatiskt när en utgift har uppsägningstid. Påminnelsedatumet blir sista rimliga åtgärdsdag före tidigaste utgiftsfria månad.</p>
          <button onClick={() => exportRemindersIcs(state)} disabled={state.reminders.filter((reminder) => reminder.contextId === context.id && !reminder.done).length === 0}>
            <CalendarDays size={17} /> Exportera kalenderfil
          </button>
          {state.reminders.filter((reminder) => reminder.contextId === context.id).map((reminder) => (
            <label className="checkRow" key={reminder.id}>
              <input type="checkbox" checked={reminder.done} onChange={() => setState((current) => toggleReminder(current, reminder.id))} />
              <span>{reminder.date} · {reminder.title}</span>
            </label>
          ))}
          {state.reminders.filter((reminder) => reminder.contextId === context.id).length === 0 && <p className="note">Inga aktiva påminnelser ännu.</p>}
        </div>
      </section>

      <aside className="dataSideColumn">
        <div className="panel stack dataSettingsPanel">
          <div className="panelHeader">
            <h2>Visning</h2>
            <span>Tidslinje</span>
          </div>
          <label>Valuta</label>
          <input value={context.currency} onChange={(event) => setState((current) => updateContext(current, { id: context.id, currency: event.target.value.toUpperCase() }))} />
          <label>Månader bakåt</label>
          <input type="number" value={context.monthsBack} onChange={(event) => setState((current) => updateContext(current, { id: context.id, monthsBack: Number(event.target.value) }))} />
          <label>Månader framåt</label>
          <input type="number" value={context.monthsForward} onChange={(event) => setState((current) => updateContext(current, { id: context.id, monthsForward: Number(event.target.value) }))} />
          <button className={context.plan === "premium" ? "selected" : ""} onClick={() => setState((current) => updateContext(current, { id: context.id, plan: context.plan === "premium" ? "free" : "premium" }))}>
            <BadgeDollarSign size={16} /> Plan: {context.plan}
          </button>
          <label className="checkRow">
            <input type="checkbox" checked={state.purchasesEnabled} onChange={(event) => setState((current) => ({ ...current, purchasesEnabled: event.target.checked }))} />
            <span>Visa köp och kassabok</span>
          </label>
        </div>

        <CloudSyncPanel
          cloudSync={cloudSync}
          configureCloudSync={configureCloudSync}
          pullCloudState={pullCloudState}
          pushCloudStateNow={pushCloudStateNow}
          disconnectCloudSync={disconnectCloudSync}
        />

        <details className="panel stack advancedDataPanel">
          <summary>
            <span className="summaryIcon">
              <FileArchive size={18} />
            </span>
            <span>
              <strong>Avancerad export</strong>
              <small>JSON, ZIP, CSV och PDF</small>
            </span>
            <ChevronDown size={17} />
          </summary>
          <div className="advancedDataBody">
            <button onClick={() => exportJson(state, true)}>
              <FileJson size={17} /> Exportera JSON med filer
            </button>
            <button onClick={() => exportZip(state, true)}>
              <FileArchive size={17} /> Exportera ZIP med filer
            </button>
            <button onClick={() => exportCsv(state)}>
              <Download size={17} /> Exportera CSV
            </button>
            <button onClick={() => exportPdf(state)}>
              <FileText size={17} /> Skapa PDF-rapport
            </button>
          </div>
        </details>

        <details className="panel stack advancedDataPanel dangerZonePanel">
          <summary>
            <span className="summaryIcon dangerText">
              <Trash2 size={18} />
            </span>
            <span>
              <strong>Säkerhet & integritet</strong>
              <small>Lokalt först och rensning</small>
            </span>
            <ChevronDown size={17} />
          </summary>
          <div className="advancedDataBody">
            <p className="note">Grundversionen skickar ingen data till en server. Kryptering är markerad som exploration tills nyckelhantering är granskad.</p>
            <button className="danger" onClick={resetLocalData}>
              <Trash2 size={17} /> Rensa lokal data
            </button>
          </div>
        </details>
      </aside>
    </div>
  );
}

function ExpenseDrawer(props: {
  expense: Expense;
  supplier?: Supplier;
  category?: Category;
  payer?: { firstName: string; lastName: string };
  attachments: Attachment[];
  currency: string;
  onClose: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onAttach: (file: File) => void;
  onRemoveAttachment: (attachmentId: string) => void;
}) {
  const SupplierIcon = iconMap[props.supplier?.icon as keyof typeof iconMap] ?? Tag;
  return (
    <aside className="drawer">
      <button className="close" onClick={props.onClose}>×</button>
      <h2>{props.expense.name}</h2>
      <div className="drawerLogo" style={{ background: props.supplier?.color ?? "#111827" }}>
        <SupplierIcon size={24} />
      </div>
      <dl>
        <dt>Leverantör</dt>
        <dd>{props.supplier?.name ?? "Saknas"}</dd>
        <dt>Kategori</dt>
        <dd>{props.category?.name ?? "Saknas"}</dd>
        <dt>Betalas av</dt>
        <dd>{props.payer ? `${props.payer.firstName} ${props.payer.lastName}` : "Saknas"}</dd>
        <dt>Flaggning</dt>
        <dd>{necessityLabels[props.expense.necessityLevel]}</dd>
        <dt>Tidigaste utgiftsfria månad</dt>
        <dd>{earliestFreeMonth(props.expense) ?? "Ej beräknad"}</dd>
        <dt>Uppsägning</dt>
        <dd>{props.supplier?.cancellationInstructions ?? "Ingen instruktion"}</dd>
      </dl>
      <label className="fileButton">
        <Paperclip size={17} /> Bifoga underlag
        <input type="file" accept={allowedFileTypes.join(",")} onChange={(event) => event.target.files?.[0] && props.onAttach(event.target.files[0])} />
      </label>
      {props.attachments.map((attachment) => (
        <div className="listRow" key={attachment.id}>
          <span>{attachment.fileName}</span>
          <button className="iconBtn" onClick={() => props.onRemoveAttachment(attachment.id)} title="Radera fil">
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      <div className="drawerActions">
        <button onClick={props.onEdit}>
          <Pencil size={16} /> Redigera
        </button>
        <button onClick={props.onCancel}>Markera avslutad</button>
        <button className="danger" onClick={props.onDelete}>
          <Trash2 size={16} /> Radera
        </button>
      </div>
    </aside>
  );
}

function StoryCoverage() {
  return (
    <div className="coverage">
      <strong>Story coverage</strong>
      <span>EP-001-010</span>
      <span>50 story ideas</span>
      <span>Lokalt, exportbart, testbart</span>
    </div>
  );
}

async function fileToAttachment(file: File, link: { expenseId?: string; supplierId?: string }): Promise<Omit<Attachment, "id" | "contextId" | "createdAt" | "blobRef"> | undefined> {
  if (!allowedFileTypes.includes(file.type) || file.size > maxFileSize) {
    alert("Tillåtna filer: PNG, JPG, WebP eller PDF upp till 10 MB.");
    return undefined;
  }
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  return { ...link, fileName: file.name, mimeType: file.type, size: file.size, dataUrl };
}
