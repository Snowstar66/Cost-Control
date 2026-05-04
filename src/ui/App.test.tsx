import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppState, PurchaseFlag } from "../domain/types";
import { toIsoDate } from "../domain/date";
import { App } from "./App";

const storageKey = "cost-control.state.v1";

function stateWithCarWash(): AppState {
  return {
    version: 1,
    activeContextId: "ctx-1",
    contexts: [
      {
        id: "ctx-1",
        name: "Pontus",
        currency: "SEK",
        monthsBack: 3,
        monthsForward: 4,
        plan: "free",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      }
    ],
    people: [],
    suppliers: [{ id: "sup-1", contextId: "ctx-1", name: "OK Q8", color: "#f7c86b", icon: "car" }],
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
    costPeriods: [{ id: "cost-1", expenseId: "exp-1", amount: 299, recurrence: "monthly", startDate: "2026-02-01", chargeDay: 25 }],
    attachments: [],
    reminders: [],
    transactions: [],
    merchantRules: [],
    onboardingComplete: true,
    hidePastMonths: false,
    purchasesEnabled: true,
    filters: { categoryIds: [], payerIds: [], necessityLevels: [], purchaseFlags: [], search: "", simulationExcludedExpenseIds: [] }
  };
}

function stateWithSinglePerson(): AppState {
  const state = stateWithCarWash();
  return {
    ...state,
    people: [{ id: "person-1", contextId: "ctx-1", firstName: "Pontus", lastName: "Hellgren", active: true }]
  };
}

function stateWithMixedNecessity(): AppState {
  const state = stateWithCarWash();
  return {
    ...state,
    suppliers: [...state.suppliers, { id: "sup-2", contextId: "ctx-1", name: "Vattenfall", color: "#2f6fdf", icon: "zap" }],
    categories: [...state.categories, { id: "cat-2", contextId: "ctx-1", name: "Boende", color: "#2f6fdf", icon: "home" }],
    expenses: [
      ...state.expenses,
      {
        id: "exp-2",
        contextId: "ctx-1",
        supplierId: "sup-2",
        categoryId: "cat-2",
        name: "El",
        necessityLevel: "necessary",
        startDate: "2026-02-01",
        status: "active",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      }
    ],
    costPeriods: [...state.costPeriods, { id: "cost-2", expenseId: "exp-2", amount: 1200, recurrence: "monthly", startDate: "2026-02-01", chargeDay: 28 }]
  };
}

function stateWithPurchaseCategoryRows(): AppState {
  const state = stateWithCarWash();
  return {
    ...state,
    transactions: [
      {
        id: "txn-1",
        contextId: "ctx-1",
        date: "2026-02-10",
        bookedDate: "2026-02-11",
        importId: "februari 2026.xlsx-123",
        amount: 125,
        currency: "SEK",
        merchantRaw: "ICA",
        merchantNormalized: "ICA",
        categoryId: "cat-1",
        source: "manual",
        type: "one-off",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      }
    ]
  };
}

function stateWithManyPurchaseRows(): AppState {
  const state = stateWithPurchaseCategoryRows();
  return {
    ...state,
    transactions: Array.from({ length: 8 }, (_, index) => ({
      ...state.transactions[0],
      id: `txn-${index + 1}`,
      merchantRaw: `ICA ${index + 1}`,
      merchantNormalized: `ICA ${index + 1}`,
      amount: 10 + index,
      date: `2026-02-${String(10 + index).padStart(2, "0")}`,
      bookedDate: `2026-02-${String(11 + index).padStart(2, "0")}`
    }))
  };
}

function stateWithHistoricalPurchaseRows(): AppState {
  const state = stateWithPurchaseCategoryRows();
  return {
    ...state,
    transactions: [
      {
        ...state.transactions[0],
        id: "txn-april",
        date: "2026-04-18",
        bookedDate: "2026-04-19",
        importId: "april 2026.xlsx-123",
        amount: 777
      }
    ]
  };
}

function stateWithStatementOffsetPurchaseRows(): AppState {
  const state = stateWithPurchaseCategoryRows();
  return {
    ...state,
    transactions: [
      {
        ...state.transactions[0],
        id: "txn-march-statement-april",
        date: "2026-03-30",
        bookedDate: "2026-03-31",
        statementMonth: "2026-04",
        importId: "april 2026.pdf-123",
        amount: 321
      }
    ]
  };
}

function stateWithRadarCandidateRows(): AppState {
  const state = stateWithPurchaseCategoryRows();
  const merchantRows = [
    ["ICA", 3],
    ["LIDL", 4]
  ] as const;
  return {
    ...state,
    transactions: [
      ...merchantRows.flatMap(([merchant, count], merchantIndex) =>
        Array.from({ length: count }, (_, index) => ({
          ...state.transactions[0],
          id: `txn-${merchant}-${index + 1}`,
          merchantRaw: merchant,
          merchantNormalized: merchant,
          amount: 20 + index,
          date: `2026-02-${String(10 + merchantIndex * 5 + index).padStart(2, "0")}`,
          bookedDate: `2026-02-${String(11 + merchantIndex * 5 + index).padStart(2, "0")}`
        }))
      ),
      {
        ...state.transactions[0],
        id: "txn-single",
        merchantRaw: "PRESSBYRAN",
        merchantNormalized: "PRESSBYRAN",
        amount: 49,
        date: "2026-02-24",
        bookedDate: "2026-02-25"
      }
    ]
  };
}

function stateWithBusinessPurchaseRows(): AppState {
  const state = stateWithPurchaseCategoryRows();
  return {
    ...state,
    transactions: [
      ...state.transactions.map((transaction) => ({ ...transaction, date: "2026-05-10", bookedDate: "2026-05-11", importId: "maj 2026.xlsx-123", flags: ["business" as PurchaseFlag] })),
      {
        ...state.transactions[0],
        id: "txn-2",
        date: "2026-05-12",
        bookedDate: "2026-05-13",
        importId: "maj 2026.xlsx-456",
        merchantRaw: "PRESSBYRAN",
        merchantNormalized: "PRESSBYRAN",
        amount: 49,
        flags: ["review" as PurchaseFlag]
      }
    ]
  };
}

function stateWithoutContext(): AppState {
  return {
    ...stateWithCarWash(),
    activeContextId: "",
    contexts: [],
    people: [],
    suppliers: [],
    categories: [],
    expenses: [],
    costPeriods: [],
    attachments: [],
    reminders: [],
    transactions: [],
    merchantRules: [],
    onboardingComplete: false
  };
}

describe("App", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it("renderar huvudytan utan att krascha", () => {
    render(<App />);

    expect(screen.getAllByText("Mina Utgifter")[0]).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ny utgift/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Ny utgift/i }));
    expect(screen.getByRole("form", { name: /L.gg till utgift/i })).toBeInTheDocument();
  });

  it("anvander kopssignaler for aterkommande utgifter utan granska", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /Ny utgift/i }));

    const signal = screen.getByLabelText(/^Signal$/i);
    expect(within(signal).getByRole("option", { name: "Värt det" })).toBeInTheDocument();
    expect(within(signal).getByRole("option", { name: "Återkommande" })).toBeInTheDocument();
    expect(within(signal).getByRole("option", { name: "Business" })).toBeInTheDocument();
    expect(within(signal).getByRole("option", { name: "Onödigt" })).toBeInTheDocument();
    expect(within(signal).queryByRole("option", { name: "Granska" })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Dras dag/i)).toHaveValue(27);
  });

  it("forvaljer enda personen pa nya utgifter och enskilda kop", () => {
    localStorage.setItem(storageKey, JSON.stringify(stateWithSinglePerson()));
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /Ny utgift/i }));
    const expenseForm = screen.getByRole("form", { name: /L.gg till utgift/i });
    expect(within(expenseForm).getByLabelText("Betalas av")).toHaveValue("person-1");
    fireEvent.change(within(expenseForm).getByLabelText(/Tj.nst\/utgift/i), { target: { value: "Netflix" } });
    fireEvent.change(within(expenseForm).getByLabelText(/^Belopp$/i), { target: { value: "179" } });
    fireEvent.change(within(expenseForm).getByLabelText(/Leverant.r/i), { target: { value: "sup-1" } });
    fireEvent.change(within(expenseForm).getByLabelText(/^Kategori$/i), { target: { value: "cat-1" } });
    fireEvent.click(within(expenseForm).getByRole("button", { name: /Spara/i }));

    fireEvent.click(screen.getByRole("button", { name: /^Ink.p$/i }));
    fireEvent.click(screen.getByRole("button", { name: /Fler nya val/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Enskilt k.p/i }));
    const purchaseForm = screen.getByRole("form", { name: /L.gg till enskilt k.p/i });
    expect(within(purchaseForm).getByLabelText("Betalas av")).toHaveValue("person-1");

    fireEvent.change(within(purchaseForm).getByLabelText(/^Handlare$/i), { target: { value: "ICA" } });
    fireEvent.change(within(purchaseForm).getByLabelText(/^Belopp$/i), { target: { value: "89" } });
    fireEvent.click(within(purchaseForm).getByRole("button", { name: /Spara/i }));

    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}") as AppState;
    expect(saved.expenses.at(-1)?.payerPersonId).toBe("person-1");
    expect(saved.transactions.at(-1)?.payerPersonId).toBe("person-1");
  });

  it("fragar om ny planbok nar ingen planbok finns", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    localStorage.setItem(storageKey, JSON.stringify(stateWithoutContext()));
    render(<App />);

    expect(screen.getByRole("heading", { name: /Vill du starta en ny plånbok/i })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Namn på ny plånbok/i), { target: { value: "Tom start" } });
    fireEvent.click(screen.getByRole("button", { name: /Starta ny plånbok/i }));

    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("standardföretag"));
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}") as AppState;
    expect(saved.contexts).toHaveLength(1);
    expect(saved.contexts[0].name).toBe("Tom start");
    expect(saved.activeContextId).toBe(saved.contexts[0].id);
    expect(saved.suppliers.some((supplier) => supplier.name === "Netflix")).toBe(true);
    expect(saved.categories.some((category) => category.name === "Nöje")).toBe(true);
  });

  it("kan rensa all data och borja om utan planbok", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    localStorage.setItem(storageKey, JSON.stringify(stateWithCarWash()));
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /Data/i }));
    fireEvent.click(screen.getByText("Säkerhet & integritet"));
    fireEvent.click(screen.getByRole("button", { name: /Rensa all data och börja om/i }));

    expect(confirm).toHaveBeenCalledTimes(2);
    expect(await screen.findByRole("heading", { name: /Vill du starta en ny plånbok/i })).toBeInTheDocument();
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}") as AppState;
      expect(saved.contexts).toHaveLength(0);
      expect(saved.activeContextId).toBe("");
    });
  });

  it("visar tydlig fallback for datafil nar ansluten fil inte stods", () => {
    localStorage.setItem(storageKey, JSON.stringify(stateWithCarWash()));
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /Data/i }));

    expect(screen.getByText("Aktivt nu")).toBeInTheDocument();
    expect(screen.getByText("Sparas automatiskt i webbläsaren")).toBeInTheDocument();
    expect(screen.getByText("Klickbara åtgärder")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ladda ner backupfil/i })).toBeEnabled();
  });

  it("visar hjalpvyn fran navigationen", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /^Hjälp$/i }));

    expect(screen.getByText("Om Mina Utgifter")).toBeInTheDocument();
    expect(screen.getByText("Rekommenderat arbetssätt")).toBeInTheDocument();
    expect(screen.getByText("Undvik dubbelräkning")).toBeInTheDocument();
    expect(screen.getByText(/köpsignaler som granska/i)).toBeInTheDocument();
    expect(screen.getByText(/Klicka på en köpkategori/i)).toBeInTheDocument();
    expect(screen.getByText(/egna sektioner, delsummor och en totalsumma/i)).toBeInTheDocument();
    expect(screen.getByText(/När du importerar kontoutdrag/i)).toBeInTheDocument();
    expect(screen.getByText(/Att kontrollera efter import/i)).toBeInTheDocument();
    expect(screen.getByText(/Rensa all data och börja om/i)).toBeInTheDocument();
  });

  it("uppdaterar oversikten nar startdatum andras", () => {
    localStorage.setItem(storageKey, JSON.stringify(stateWithCarWash()));
    render(<App />);

    const row = screen.getAllByRole("button", { name: /BiltvattOK Q8/i })[0];
    expect(screen.getByRole("button", { name: /Biltvatt feb 2026: 299/i })).toBeInTheDocument();
    fireEvent.click(row);
    fireEvent.click(screen.getByRole("button", { name: /Redigera/i }));
    fireEvent.change(screen.getByLabelText(/Startdatum/i), { target: { value: "2026-03-01" } });
    fireEvent.click(screen.getByRole("button", { name: /Uppdatera/i }));

    expect(screen.getByRole("button", { name: /Biltvatt feb 2026: ingen utgift/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Biltvatt mars 2026: 299/i })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(storageKey) ?? "{}")).toMatchObject({
      expenses: [{ startDate: "2026-03-01" }],
      costPeriods: [{ startDate: "2026-03-01" }]
    });
  });

  it("stanger sidopanelen nar samma rad klickas igen", () => {
    localStorage.setItem(storageKey, JSON.stringify(stateWithCarWash()));
    render(<App />);

    const row = screen.getAllByRole("button", { name: /BiltvattOK Q8/i })[0];
    fireEvent.click(row);
    expect(screen.getByRole("button", { name: /Redigera/i })).toBeInTheDocument();
    fireEvent.click(row);

    expect(screen.queryByRole("button", { name: /Redigera/i })).not.toBeInTheDocument();
  });

  it("filtrerar oversikten nar en kopssignal valjs", () => {
    localStorage.setItem(storageKey, JSON.stringify(stateWithBusinessPurchaseRows()));
    render(<App />);

    expect(screen.getByRole("button", { name: /Transport maj 2026: 174/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Granska: 49/i }));

    expect(screen.getByRole("button", { name: /Transport maj 2026: 49/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Transport maj 2026: 174/i })).not.toBeInTheDocument();
  });

  it("visar enstaka kop som kategorirader i oversikten", () => {
    localStorage.setItem(storageKey, JSON.stringify(stateWithPurchaseCategoryRows()));
    render(<App />);

    expect(screen.getAllByText(/Återkommande utgifter/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Summa återkommande/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Enskilda köp")[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Summa enskilda k.p/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Totalt per m.nad/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Transport")[0]).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Transport feb 2026: 125/i }));
    expect(screen.getByText("ICA")).toBeInTheDocument();
    expect(screen.getAllByText(/424/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole("button", { name: /Visa köp ICA/i })[0]);
    expect(screen.getByRole("form", { name: /Uppdatera enskilt köp/i })).toBeInTheDocument();
  });

  it("kan expandera alla kop i en kategori och fortfarande valja en enskild manad", () => {
    const state = stateWithPurchaseCategoryRows();
    localStorage.setItem(storageKey, JSON.stringify({
      ...state,
      transactions: [
        {
          ...state.transactions[0],
          id: "txn-feb",
          merchantRaw: "ICA FEB",
          merchantNormalized: "ICA FEB",
          date: "2026-02-10",
          bookedDate: "2026-02-11",
          amount: 125
        },
        {
          ...state.transactions[0],
          id: "txn-mar",
          merchantRaw: "ICA MARS",
          merchantNormalized: "ICA MARS",
          date: "2026-03-12",
          bookedDate: "2026-03-13",
          amount: 225
        }
      ]
    }));
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /Visa alla köp i Transport/i }));

    expect(screen.getByText("ICA FEB")).toBeInTheDocument();
    expect(screen.getByText("ICA MARS")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Transport feb 2026: 125/i }));

    expect(screen.getByText("ICA FEB")).toBeInTheDocument();
    expect(screen.queryByText("ICA MARS")).not.toBeInTheDocument();
  });

  it("visar tom aterkommande sektion nar oversikten bara har kop", () => {
    const state = stateWithPurchaseCategoryRows();
    localStorage.setItem(storageKey, JSON.stringify({ ...state, expenses: [], costPeriods: [] }));
    render(<App />);

    expect(screen.getAllByText(/Inga .terkommande utgifter .nnu/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Enskilda köp").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Totalt per m.nad/i).length).toBeGreaterThan(0);
  });

  it("visar alla kop nar en kategorirad expanderas i mobiloversikten", () => {
    localStorage.setItem(storageKey, JSON.stringify(stateWithManyPurchaseRows()));
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /Transport\. 8 enskilda köp/i }));

    expect(screen.getByText("ICA 1")).toBeInTheDocument();
    expect(screen.getByText("ICA 8")).toBeInTheDocument();
  });

  it("visar periodsumma pa inkopskategori nar aktuell manad saknar kop", () => {
    localStorage.setItem(storageKey, JSON.stringify(stateWithHistoricalPurchaseRows()));
    const { container } = render(<App />);

    const transportCard = [...container.querySelectorAll(".purchaseAggregateMobile")].find((card) => card.textContent?.includes("Transport"));

    expect(transportCard).toBeTruthy();
    expect(transportCard?.querySelector(".mobileExpenseAmount")).toHaveTextContent("777 kr");
  });

  it("placerar importerade kop pa kopdatumets manad i oversikten", () => {
    localStorage.setItem(storageKey, JSON.stringify(stateWithStatementOffsetPurchaseRows()));
    render(<App />);

    expect(screen.getByRole("button", { name: /Transport mars 2026: 321/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Transport apr 2026: 321/i })).not.toBeInTheDocument();
  });

  it("visar businesskop i oversikten och kopradarn", () => {
    localStorage.setItem(storageKey, JSON.stringify(stateWithBusinessPurchaseRows()));
    render(<App />);

    expect(screen.getAllByText("Business").length).toBeGreaterThan(0);
    const businessSummary = screen.getByRole("button", { name: /Business: 125.*vald period/i });
    expect(businessSummary).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Transport maj 2026: 174/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Business maj 2026: 125/i })).not.toBeInTheDocument();
    fireEvent.click(businessSummary);
    expect(businessSummary).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Transport maj 2026: 125/i })).toBeInTheDocument();
    expect(screen.queryAllByRole("button", { name: /BiltvattOK Q8/i })).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: /Transport maj 2026: 125/i }));
    expect(screen.getByLabelText(/Signaler: Business/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Inköp$/i }));

    expect(screen.getAllByText("Business").length).toBeGreaterThan(0);
    expect(screen.getAllByText("125 kr").length).toBeGreaterThan(0);
  });

  it("kan dopa om business-signalen for enskilda kop", () => {
    localStorage.setItem(storageKey, JSON.stringify(stateWithBusinessPurchaseRows()));
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /^Data$/i }));
    fireEvent.change(screen.getByLabelText("Köpsignal business"), { target: { value: "Utlägg" } });
    fireEvent.click(screen.getByRole("button", { name: /^Inköp$/i }));

    expect(screen.getAllByText("Utlägg").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Utlägg: ICA/i })).toBeInTheDocument();
  });

  it("visar finansiell kopstatistik per handlare", () => {
    localStorage.setItem(storageKey, JSON.stringify(stateWithPurchaseCategoryRows()));
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /Statistik/i }));

    expect(screen.getByText("Var pengarna går")).toBeInTheDocument();
    expect(screen.getAllByText("Mest pengar").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Flest transaktioner").length).toBeGreaterThan(0);
    expect(screen.getByText("Köpintelligens")).toBeInTheDocument();
    expect(screen.getAllByText("ICA").length).toBeGreaterThan(0);
    expect(screen.getByText(/Medelköp/i)).toBeInTheDocument();
  });

  it("visar kopvanor som antal kop och filtrerar fram traffarna", () => {
    localStorage.setItem(storageKey, JSON.stringify(stateWithRadarCandidateRows()));
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /^Ink.p$/i }));

    expect(screen.getByRole("heading", { name: /K.pradar/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /K.plista/i })).toBeInTheDocument();
    expect(screen.queryByText(/St.rsta handlare/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/St.rsta kategori/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/.terkommande handlare/i)).not.toBeInTheDocument();

    const habitCard = screen.getByRole("button", { name: /Återkommande7.*2 handlare/i });
    expect(habitCard).toBeInTheDocument();
    expect(screen.getAllByText("PRESSBYRAN").length).toBeGreaterThan(0);

    fireEvent.click(habitCard);

    expect(screen.getByText(/7 tr.ffar/i)).toBeInTheDocument();
    expect(screen.queryByText("PRESSBYRAN")).not.toBeInTheDocument();
    expect(screen.getAllByText("ICA").length).toBeGreaterThan(0);
    expect(screen.getAllByText("LIDL").length).toBeGreaterThan(0);
  });

  it("kan flagga ett enstaka kop fran kassaboken", () => {
    localStorage.setItem(storageKey, JSON.stringify(stateWithPurchaseCategoryRows()));
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /^Inköp$/i }));
    fireEvent.click(screen.getByRole("button", { name: /Granska: ICA/i }));

    expect(JSON.parse(localStorage.getItem(storageKey) ?? "{}").transactions[0].flags).toContain("review");
  });

  it("kan markera ett enstaka kop som business", () => {
    localStorage.setItem(storageKey, JSON.stringify(stateWithPurchaseCategoryRows()));
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /^Inköp$/i }));
    fireEvent.click(screen.getByRole("button", { name: /Business: ICA/i }));

    expect(JSON.parse(localStorage.getItem(storageKey) ?? "{}").transactions[0].flags).toContain("business");
  });

  it("lagger till manuellt kop med dagens datum och forslag pa handlare", () => {
    localStorage.setItem(storageKey, JSON.stringify(stateWithPurchaseCategoryRows()));
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /^Inköp$/i }));
    expect(screen.queryByRole("button", { name: /^Importera kontoutdrag$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Lägg till enskilt köp$/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Fler nya val/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: /Enskilt köp/i }));

    const merchant = screen.getByLabelText(/^Handlare$/i);
    expect(merchant).not.toHaveAttribute("list");
    expect(document.querySelector('datalist#merchant-suggestions option[value="ICA"]')).not.toBeNull();
    expect(document.querySelector('datalist#merchant-suggestions option[value="OK Q8"]')).not.toBeNull();

    fireEvent.change(merchant, { target: { value: "okq8" } });
    expect(merchant).toHaveAttribute("list", "merchant-suggestions");
    fireEvent.blur(merchant);
    expect(merchant).toHaveValue("OK Q8");
    fireEvent.change(merchant, { target: { value: "ica" } });
    fireEvent.blur(merchant);
    expect(merchant).toHaveValue("ICA");
    expect(screen.getByLabelText(/^Kategori$/i)).toHaveValue("cat-1");
    fireEvent.change(screen.getByLabelText(/^Belopp$/i), { target: { value: "89" } });
    fireEvent.click(screen.getByRole("button", { name: /Spara/i }));

    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}") as AppState;
    expect(saved.transactions.at(-1)).toMatchObject({
      date: toIsoDate(new Date()),
      merchantRaw: "ICA",
      categoryId: "cat-1",
      amount: 89,
      source: "manual",
      type: "one-off"
    });
  });

  it("kan gora ett enskilt kop aterkommande med kopdatum som forsta betalning", () => {
    localStorage.setItem(storageKey, JSON.stringify(stateWithPurchaseCategoryRows()));
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /Transport feb 2026: 125/i }));
    fireEvent.click(screen.getAllByRole("button", { name: /Visa k.p ICA/i })[0]);
    fireEvent.click(screen.getByRole("button", { name: /^Skapa .terkommande$/i }));

    expect(screen.getByLabelText(/F.rsta betalningsdatum/i)).toHaveValue("2026-02-10");
    fireEvent.click(screen.getByRole("button", { name: /Skapa .terkommande k.p/i }));

    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}") as AppState;
    const createdExpense = saved.expenses.find((expense) => expense.name === "ICA");
    const createdPeriod = saved.costPeriods.find((period) => period.expenseId === createdExpense?.id);
    expect(createdExpense).toMatchObject({ categoryId: "cat-1", necessityLevel: "comfortable", startDate: "2026-02-10" });
    expect(createdPeriod).toMatchObject({ amount: 125, recurrence: "monthly", startDate: "2026-02-10", chargeDay: 10 });
    expect(saved.transactions[0]).toMatchObject({ recurringExpenseId: createdExpense?.id, type: "recurring-payment" });
  });

  it("visar hela importforhandsgranskningen innan importbeslut", async () => {
    localStorage.setItem(storageKey, JSON.stringify(stateWithCarWash()));
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /^Inköp$/i }));
    const rows = Array.from({ length: 12 }, (_, index) => `2026-03-${String(index + 1).padStart(2, "0")};HANDLARE ${index + 1};${index + 10}`);
    const csv = `Datum;Specifikation;Belopp\n${rows.join("\n")}`;
    const file = new File([csv], "many.csv", { type: "text/csv" });
    Object.defineProperty(file, "text", { value: () => Promise.resolve(csv) });
    const input = document.querySelector(".quickImportInput") as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByText("Visar 12 av 12 rader")).toBeInTheDocument();
    expect(screen.getByText("HANDLARE 1")).toBeInTheDocument();
    expect(screen.getByText("HANDLARE 12")).toBeInTheDocument();
  });

  it("kopplar importerade kop till enda personen i planboken", async () => {
    localStorage.setItem(storageKey, JSON.stringify(stateWithSinglePerson()));
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /^Ink.p$/i }));
    const csv = "Datum;Specifikation;Belopp\n2026-03-01;ICA;125";
    const file = new File([csv], "one.csv", { type: "text/csv" });
    Object.defineProperty(file, "text", { value: () => Promise.resolve(csv) });
    const input = document.querySelector(".quickImportInput") as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(await screen.findByRole("button", { name: /Importera enskilda k.p/i }));

    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}") as AppState;
    expect(saved.transactions.at(-1)?.payerPersonId).toBe("person-1");
  });

  it("fragar innan aktiv planbok raderas", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    localStorage.setItem(storageKey, JSON.stringify({
      ...stateWithCarWash(),
      contexts: [
        ...stateWithCarWash().contexts,
        { id: "ctx-2", name: "Resa", currency: "SEK", monthsBack: 1, monthsForward: 1, plan: "free", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }
      ],
      activeContextId: "ctx-2",
      categories: [...stateWithCarWash().categories, { id: "cat-2", contextId: "ctx-2", name: "Resa", color: "#7db7ee", icon: "tag" }]
    }));
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /Data/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Radera plånbok$/i }));

    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Radera plånboken "Resa"'));
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}") as AppState;
    expect(saved.activeContextId).toBe("ctx-1");
    expect(saved.contexts.map((context) => context.id)).toEqual(["ctx-1"]);
    expect(saved.categories.some((category) => category.contextId === "ctx-2")).toBe(false);
  });

  it("skapar planbok efter namnfraga", () => {
    const prompt = vi.spyOn(window, "prompt").mockReturnValue("Semester");
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    localStorage.setItem(storageKey, JSON.stringify(stateWithCarWash()));
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /Data/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Ny plånbok$/i }));

    expect(prompt).toHaveBeenCalledWith("Vad ska den nya plånboken heta?");
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("standardföretag"));
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}") as AppState;
    expect(saved.activeContextId).not.toBe("ctx-1");
    expect(saved.contexts.map((context) => context.name)).toContain("Semester");
    expect(saved.suppliers.filter((supplier) => supplier.contextId === saved.activeContextId)).toHaveLength(0);
  });

  it("sparar ikon och färg på ny leverantör", () => {
    localStorage.setItem(storageKey, JSON.stringify(stateWithCarWash()));
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /Register/i }));
    const supplierForm = screen.getByText("Leverantörer / företag").closest("form")!;
    expect(within(supplierForm).getByText(/Kategori och uppsägningstid sätts på själva utgiften/i)).toBeInTheDocument();
    expect(within(supplierForm).queryByPlaceholderText("Uppsägning")).not.toBeInTheDocument();
    fireEvent.change(within(supplierForm).getByPlaceholderText("Företagsnamn"), { target: { value: "Spotify" } });
    fireEvent.change(within(supplierForm).getByLabelText("Ikon"), { target: { value: "music" } });
    fireEvent.change(within(supplierForm).getByLabelText("Ikonfärg"), { target: { value: "#6b5ca5" } });
    fireEvent.click(within(supplierForm).getByRole("button", { name: /Lägg till leverantör/i }));

    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}") as AppState;
    expect(saved.suppliers.at(-1)).toMatchObject({ name: "Spotify", icon: "music", color: "#6b5ca5" });
    expect(within(supplierForm).getAllByText("Spotify").length).toBeGreaterThan(0);
  });

  it("väljer kategorifärg med namn i stället för hexkod", () => {
    localStorage.setItem(storageKey, JSON.stringify(stateWithCarWash()));
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /Register/i }));
    const categoryForm = screen.getByText("Kategorier").closest("form")!;
    fireEvent.change(within(categoryForm).getByPlaceholderText("Namn"), { target: { value: "Mat" } });
    fireEvent.change(within(categoryForm).getByLabelText("Etikett"), { target: { value: "home" } });
    fireEvent.change(within(categoryForm).getByLabelText("Färg"), { target: { value: "#f58e92" } });
    fireEvent.click(within(categoryForm).getByRole("button", { name: /Lägg till kategori/i }));

    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}") as AppState;
    expect(saved.categories.at(-1)).toMatchObject({ name: "Mat", color: "#f58e92", icon: "home" });
    expect(within(categoryForm).getAllByText("Rosa").length).toBeGreaterThan(0);
    expect(within(categoryForm).queryByText("F58E92")).not.toBeInTheDocument();
  });

  it("filtrerar kassaboken nar ett radarkort valjs", () => {
    const state = stateWithPurchaseCategoryRows();
    localStorage.setItem(storageKey, JSON.stringify({
      ...state,
      transactions: [
        {
          ...state.transactions[0],
          id: "txn-1",
          date: "2026-01-20",
          merchantRaw: "ICA",
          merchantNormalized: "ICA",
          amount: 125,
          flags: []
        },
        {
          ...state.transactions[0],
          id: "txn-2",
          date: "2026-01-05",
          merchantRaw: "VINTED",
          merchantNormalized: "VINTED",
          amount: 300,
          flags: ["unnecessary"]
        }
      ]
    }));
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /^Inköp$/i }));
    fireEvent.click(screen.getByTitle(/Visa köp för onödigt/i));

    const table = within(screen.getByRole("table", { name: /Köplista/i }));
    expect(table.getByText("VINTED")).toBeInTheDocument();
    expect(table.queryByText("ICA")).not.toBeInTheDocument();
  });

  it("kan uppdatera kategori for alla kop fran samma handlare", () => {
    const state = stateWithPurchaseCategoryRows();
    localStorage.setItem(storageKey, JSON.stringify({
      ...state,
      categories: [...state.categories, { id: "cat-2", contextId: "ctx-1", name: "Hälsa", color: "#a2dba6", icon: "heart" }],
      transactions: [
        {
          ...state.transactions[0],
          id: "txn-1",
          merchantRaw: "STADIUM OSTERSU",
          merchantNormalized: "STADIUM OSTERSU",
          amount: 184,
          categoryId: "cat-1"
        },
        {
          ...state.transactions[0],
          id: "txn-2",
          date: "2026-01-16",
          merchantRaw: "STADIUM OSTERSU",
          merchantNormalized: "STADIUM OSTERSU",
          amount: 430,
          categoryId: "cat-1"
        }
      ]
    }));
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /^Inköp$/i }));
    fireEvent.click(screen.getAllByRole("button", { name: /STADIUM OSTERSU/i })[0]);
    fireEvent.change(screen.getByLabelText(/^Kategori$/i), { target: { value: "cat-2" } });
    fireEvent.click(screen.getByRole("button", { name: /Uppdatera/i }));

    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}") as AppState;
    expect(saved.transactions.map((transaction) => transaction.categoryId)).toEqual(["cat-2", "cat-2"]);
  });
});
