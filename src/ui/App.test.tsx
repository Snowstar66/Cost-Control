import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppState } from "../domain/types";
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
    filters: { categoryIds: [], payerIds: [], necessityLevels: [], search: "", simulationExcludedExpenseIds: [] }
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
        date: "2026-01-10",
        bookedDate: "2026-01-11",
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

function stateWithBusinessPurchaseRows(): AppState {
  const state = stateWithPurchaseCategoryRows();
  return {
    ...state,
    transactions: state.transactions.map((transaction) => ({ ...transaction, importId: "maj 2026.xlsx-123", flags: ["business"] }))
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

  it("fragar om ny kontext nar ingen kontext finns", () => {
    localStorage.setItem(storageKey, JSON.stringify(stateWithoutContext()));
    render(<App />);

    expect(screen.getByRole("heading", { name: /Vill du starta en ny kontext/i })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Namn på ny kontext/i), { target: { value: "Tom start" } });
    fireEvent.click(screen.getByRole("button", { name: /Starta ny kontext/i }));

    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}") as AppState;
    expect(saved.contexts).toHaveLength(1);
    expect(saved.contexts[0].name).toBe("Tom start");
    expect(saved.activeContextId).toBe(saved.contexts[0].id);
  });

  it("kan rensa all data och borja om utan kontext", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    localStorage.setItem(storageKey, JSON.stringify(stateWithCarWash()));
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /Data/i }));
    fireEvent.click(screen.getByText("Säkerhet & integritet"));
    fireEvent.click(screen.getByRole("button", { name: /Rensa all data och börja om/i }));

    expect(confirm).toHaveBeenCalledTimes(2);
    expect(await screen.findByRole("heading", { name: /Vill du starta en ny kontext/i })).toBeInTheDocument();
    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}") as AppState;
      expect(saved.contexts).toHaveLength(0);
      expect(saved.activeContextId).toBe("");
    });
  });

  it("visar hjalpvyn fran navigationen", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /^Hjälp$/i }));

    expect(screen.getByText("Om Mina Utgifter")).toBeInTheDocument();
    expect(screen.getByText("Rekommenderat arbetssätt")).toBeInTheDocument();
    expect(screen.getByText("Undvik dubbelräkning")).toBeInTheDocument();
    expect(screen.getByText(/business-märkta köp/i)).toBeInTheDocument();
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

  it("filtrerar oversikten nar en summering valjs", () => {
    localStorage.setItem(storageKey, JSON.stringify(stateWithMixedNecessity()));
    render(<App />);

    expect(screen.getAllByRole("button", { name: /ElVattenfall/i }).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /Lyxigt:/i }));

    expect(screen.getAllByRole("button", { name: /BiltvattOK Q8/i }).length).toBeGreaterThan(0);
    expect(screen.queryAllByRole("button", { name: /ElVattenfall/i })).toHaveLength(0);
  });

  it("visar enstaka kop som kategorirader i oversikten", () => {
    localStorage.setItem(storageKey, JSON.stringify(stateWithPurchaseCategoryRows()));
    render(<App />);

    expect(screen.getAllByText("Enskilda köp")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Transport")[0]).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Transport feb 2026: 125/i }));
    expect(screen.getByText("ICA")).toBeInTheDocument();
    expect(screen.getAllByText(/424/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole("button", { name: /Visa köp ICA/i })[0]);
    expect(screen.getByRole("form", { name: /Uppdatera enskilt köp/i })).toBeInTheDocument();
  });

  it("visar businesskop i oversikten och kopradarn", () => {
    localStorage.setItem(storageKey, JSON.stringify(stateWithBusinessPurchaseRows()));
    render(<App />);

    expect(screen.getAllByText("Business").length).toBeGreaterThan(0);
    expect(screen.getByRole("group", { name: /Business: 125.*per månad/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Inköp$/i }));

    expect(screen.getAllByText("Business").length).toBeGreaterThan(0);
    expect(screen.getAllByText("125 kr").length).toBeGreaterThan(0);
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
    expect(merchant).toHaveAttribute("list", "merchant-suggestions");
    expect(document.querySelector('datalist#merchant-suggestions option[value="ICA"]')).not.toBeNull();
    expect(document.querySelector('datalist#merchant-suggestions option[value="OK Q8"]')).not.toBeNull();

    fireEvent.change(merchant, { target: { value: "okq8" } });
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

  it("fragar innan aktiv kontext raderas", () => {
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
    fireEvent.click(screen.getByRole("button", { name: /^Radera kontext$/i }));

    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Radera kontexten "Resa"'));
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}") as AppState;
    expect(saved.activeContextId).toBe("ctx-1");
    expect(saved.contexts.map((context) => context.id)).toEqual(["ctx-1"]);
    expect(saved.categories.some((category) => category.contextId === "ctx-2")).toBe(false);
  });

  it("skapar kontext efter namnfraga", () => {
    const prompt = vi.spyOn(window, "prompt").mockReturnValue("Semester");
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    localStorage.setItem(storageKey, JSON.stringify(stateWithCarWash()));
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /Data/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Ny kontext$/i }));

    expect(prompt).toHaveBeenCalledWith("Vad ska den nya kontexten heta?");
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

  it("sorterar kassaboken nar ett radarkort valjs", () => {
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
    fireEvent.click(screen.getByTitle("Sortera kassaboken efter onödigt"));

    const table = within(screen.getByRole("table", { name: /Köplista/i }));
    const vinted = table.getByText("VINTED");
    const ica = table.getByText("ICA");
    expect(vinted.compareDocumentPosition(ica) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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
