import { addMonths, toIsoDate } from "./date";
import type { AppState, Category, Context, Expense, ExpenseCostPeriod, Person, Supplier } from "./types";

const now = new Date();
const stamp = now.toISOString();

export const defaultCategoryTemplates = [
  { name: "Boende", color: "#7db7ee", icon: "home" },
  { name: "Transport", color: "#f7c86b", icon: "car" },
  { name: "Kommunikation", color: "#b58df1", icon: "wifi" },
  { name: "Hälsa", color: "#a2dba6", icon: "heart" },
  { name: "Underhållning", color: "#f58e92", icon: "sparkles" },
  { name: "Nöje", color: "#c084fc", icon: "play" },
  { name: "Ljudböcker", color: "#8fb7ff", icon: "book" },
  { name: "Nyheter", color: "#a9b2c4", icon: "newspaper" },
  { name: "Moln & mjukvara", color: "#4fc4bd", icon: "cloud" },
  { name: "Försäkring", color: "#93c5a0", icon: "shield" },
  { name: "Verktyg", color: "#4fc4bd", icon: "wrench" }
];

export const defaultSupplierTemplates: Array<Omit<Supplier, "id" | "contextId">> = [
  { name: "Netflix", serviceType: "Streaming", icon: "play", color: "#e50914", website: "https://www.netflix.com", cancellationInstructions: "Säg upp via kontoinställningar." },
  { name: "SVT Play", serviceType: "Streaming", icon: "play", color: "#1f4a8a", website: "https://www.svtplay.se" },
  { name: "TV4 Play", serviceType: "Streaming", icon: "play", color: "#2563eb", website: "https://www.tv4play.se" },
  { name: "Viaplay", serviceType: "Streaming", icon: "play", color: "#ff6b00", website: "https://viaplay.se" },
  { name: "Max", serviceType: "Streaming", icon: "play", color: "#1733ff", website: "https://www.max.com" },
  { name: "Disney+", serviceType: "Streaming", icon: "play", color: "#113ccf", website: "https://www.disneyplus.com" },
  { name: "Amazon Prime Video", serviceType: "Streaming", icon: "play", color: "#00a8e1", website: "https://www.primevideo.com" },
  { name: "YouTube Premium", serviceType: "Streaming", icon: "play", color: "#ff0033", website: "https://www.youtube.com/premium" },
  { name: "Spotify", serviceType: "Musik", icon: "music", color: "#1db954", website: "https://www.spotify.com", cancellationInstructions: "Hantera prenumeration under konto." },
  { name: "Apple Music", serviceType: "Musik", icon: "music", color: "#111827", website: "https://music.apple.com" },
  { name: "Storytel", serviceType: "Ljudböcker", icon: "book", color: "#ff5b4a", website: "https://www.storytel.com" },
  { name: "BookBeat", serviceType: "Ljudböcker", icon: "book", color: "#ef4444", website: "https://www.bookbeat.se" },
  { name: "Nextory", serviceType: "Ljudböcker", icon: "book", color: "#7c3aed", website: "https://www.nextory.se" },
  { name: "Bokus Play", serviceType: "Ljudböcker", icon: "book", color: "#0f766e", website: "https://www.bokus.com/play" },
  { name: "Audible", serviceType: "Ljudböcker", icon: "book", color: "#f59e0b", website: "https://www.audible.com" },
  { name: "Telia", serviceType: "Telefon & bredband", icon: "phone", color: "#6d28d9", website: "https://www.telia.se" },
  { name: "Tele2", serviceType: "Telefon & bredband", icon: "phone", color: "#111827", website: "https://www.tele2.se" },
  { name: "Telenor", serviceType: "Telefon & bredband", icon: "phone", color: "#0ea5e9", website: "https://www.telenor.se" },
  { name: "Tre", serviceType: "Telefon & bredband", icon: "phone", color: "#111827", website: "https://www.tre.se" },
  { name: "Comviq", serviceType: "Mobiloperatör", icon: "phone", color: "#ec4899", website: "https://www.comviq.se" },
  { name: "Hallon", serviceType: "Mobiloperatör", icon: "phone", color: "#e11d48", website: "https://www.hallon.se" },
  { name: "Vimla", serviceType: "Mobiloperatör", icon: "phone", color: "#7c3aed", website: "https://vimla.se" },
  { name: "Halebop", serviceType: "Mobiloperatör", icon: "phone", color: "#06b6d4", website: "https://www.halebop.se" },
  { name: "Fello", serviceType: "Mobiloperatör", icon: "phone", color: "#22c55e", website: "https://www.fello.se" },
  { name: "Bahnhof", serviceType: "Bredband", icon: "wifi", color: "#111827", website: "https://www.bahnhof.se" },
  { name: "Bredband2", serviceType: "Bredband", icon: "wifi", color: "#2563eb", website: "https://www.bredband2.com" },
  { name: "iCloud+", serviceType: "Moln", icon: "cloud", color: "#60a5fa", website: "https://www.icloud.com" },
  { name: "Google One", serviceType: "Moln", icon: "cloud", color: "#0f9d58", website: "https://one.google.com" },
  { name: "Microsoft 365", serviceType: "Mjukvara", icon: "cloud", color: "#2563eb", website: "https://www.microsoft.com/microsoft-365" },
  { name: "Dropbox", serviceType: "Moln", icon: "cloud", color: "#0061ff", website: "https://www.dropbox.com" },
  { name: "Adobe", serviceType: "Mjukvara", icon: "wrench", color: "#fa0f00", website: "https://www.adobe.com" },
  { name: "Dagens Nyheter", serviceType: "Nyheter", icon: "newspaper", color: "#111827", website: "https://www.dn.se" },
  { name: "Svenska Dagbladet", serviceType: "Nyheter", icon: "newspaper", color: "#334155", website: "https://www.svd.se" },
  { name: "Aftonbladet Plus", serviceType: "Nyheter", icon: "newspaper", color: "#eab308", website: "https://www.aftonbladet.se" },
  { name: "SATS", serviceType: "Träning", icon: "heart", color: "#dc2626", website: "https://www.sats.se", cancellationInstructions: "Kontrollera bindningstid och uppsägning i medlemsvillkor." },
  { name: "Friskis&Svettis", serviceType: "Träning", icon: "heart", color: "#ef4444", website: "https://www.friskissvettis.se" },
  { name: "Trygg-Hansa", serviceType: "Försäkring", icon: "shield", color: "#ef4444", website: "https://www.trygghansa.se" },
  { name: "If", serviceType: "Försäkring", icon: "shield", color: "#0f766e", website: "https://www.if.se" },
  { name: "Folksam", serviceType: "Försäkring", icon: "shield", color: "#22c55e", website: "https://www.folksam.se" },
  { name: "Vattenfall", serviceType: "El", icon: "zap", color: "#2563eb", website: "https://www.vattenfall.se" },
  { name: "Fortum", serviceType: "El", icon: "zap", color: "#22c55e", website: "https://www.fortum.se" },
  { name: "Tibber", serviceType: "El", icon: "zap", color: "#111827", website: "https://tibber.com/se" }
];

function id(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function createContext(name: string, currency = "SEK", plan: Context["plan"] = "free"): Context {
  return {
    id: id("ctx"),
    name,
    currency,
    monthsBack: 3,
    monthsForward: 9,
    plan,
    createdAt: stamp,
    updatedAt: stamp
  };
}

export function createDefaultCategories(contextId: string): Category[] {
  return defaultCategoryTemplates.map((category) => ({
    id: id("cat"),
    contextId,
    ...category
  }));
}

export function createDefaultSuppliers(contextId: string): Supplier[] {
  return defaultSupplierTemplates.map((supplier) => ({
    id: id("sup"),
    contextId,
    ...supplier
  }));
}

export function createInitialState(): AppState {
  const context = createContext("Privat ekonomi", "SEK", "premium");
  const categories = createDefaultCategories(context.id);
  const people: Person[] = [
    { id: id("per"), contextId: context.id, firstName: "Anna", lastName: "Svensson", monthlyAvailableIncome: 30000, active: true },
    { id: id("per"), contextId: context.id, firstName: "Erik", lastName: "Svensson", monthlyAvailableIncome: 28000, active: true }
  ];
  const suppliers: Supplier[] = createDefaultSuppliers(context.id);
  const cat = (name: string) => categories.find((category) => category.name === name)?.id;
  const sup = (name: string) => suppliers.find((supplier) => supplier.name === name)?.id;
  const payer = people[0].id;
  const startDate = toIsoDate(addMonths(now, -8));
  const expenses: Expense[] = [
    { id: id("exp"), contextId: context.id, supplierId: sup("Netflix"), categoryId: cat("Underhållning"), payerPersonId: payer, name: "Netflix", necessityLevel: "necessary", startDate, noticePeriodValue: 1, noticePeriodUnit: "months", status: "active", createdAt: stamp, updatedAt: stamp },
    { id: id("exp"), contextId: context.id, supplierId: sup("Gymmet"), categoryId: cat("Hälsa"), payerPersonId: people[1].id, name: "Gymmet", necessityLevel: "comfortable", startDate, noticePeriodValue: 2, noticePeriodUnit: "months", status: "active", createdAt: stamp, updatedAt: stamp },
    { id: id("exp"), contextId: context.id, supplierId: sup("Spotify"), categoryId: cat("Underhållning"), payerPersonId: payer, name: "Spotify", necessityLevel: "luxury", startDate, status: "active", createdAt: stamp, updatedAt: stamp },
    { id: id("exp"), contextId: context.id, supplierId: sup("Vattenfall"), categoryId: cat("Boende"), payerPersonId: payer, name: "El", necessityLevel: "necessary", startDate, status: "active", createdAt: stamp, updatedAt: stamp }
  ];
  const costPeriods: ExpenseCostPeriod[] = [
    { id: id("cost"), expenseId: expenses[0].id, amount: 199, recurrence: "monthly", startDate, chargeDay: 5 },
    { id: id("cost"), expenseId: expenses[1].id, amount: 299, recurrence: "monthly", startDate, chargeDay: 27 },
    { id: id("cost"), expenseId: expenses[2].id, amount: 109, recurrence: "monthly", startDate, chargeDay: 12 },
    { id: id("cost"), expenseId: expenses[3].id, amount: 1200, recurrence: "monthly", startDate, chargeDay: 28 }
  ];

  return {
    version: 1,
    activeContextId: context.id,
    contexts: [context],
    people,
    suppliers,
    categories,
    expenses,
    costPeriods,
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
      simulationExcludedExpenseIds: [],
      budgetOutcomeStartMonth: undefined
    }
  };
}

export function createEmptyState(): AppState {
  return {
    version: 1,
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
    onboardingComplete: false,
    hidePastMonths: false,
    purchasesEnabled: true,
    filters: {
      categoryIds: [],
      payerIds: [],
      necessityLevels: [],
      purchaseFlags: [],
      search: "",
      simulationExcludedExpenseIds: [],
      budgetOutcomeStartMonth: undefined
    }
  };
}

export function enrichStateWithBaselineData(state: AppState): AppState {
  let suppliers = state.suppliers.map((supplier) => {
    const template = defaultSupplierTemplates.find((item) => item.name.toLowerCase() === supplier.name.toLowerCase());
    return template ? { ...template, ...supplier, icon: supplier.icon ?? template.icon, color: supplier.color ?? template.color, serviceType: supplier.serviceType ?? template.serviceType } : supplier;
  });
  let categories = state.categories.map((category) => {
    const template = defaultCategoryTemplates.find((item) => item.name.toLowerCase() === category.name.toLowerCase());
    return template ? { ...category, icon: category.icon ?? template.icon, color: category.color ?? template.color } : category;
  });

  for (const context of state.contexts) {
    const categoryNames = new Set(categories.filter((category) => category.contextId === context.id).map((category) => category.name.toLowerCase()));
    const missingCategories = defaultCategoryTemplates
      .filter((category) => !categoryNames.has(category.name.toLowerCase()))
      .map((category) => ({ id: id("cat"), contextId: context.id, ...category }));
    categories = [...categories, ...missingCategories];
  }

  return {
    ...state,
    suppliers,
    categories,
    transactions: state.transactions ?? [],
    merchantRules: state.merchantRules ?? [],
    purchasesEnabled: state.purchasesEnabled ?? true,
    filters: {
      categoryIds: state.filters?.categoryIds ?? [],
      payerIds: state.filters?.payerIds ?? [],
      necessityLevels: state.filters?.necessityLevels ?? [],
      purchaseFlags: state.filters?.purchaseFlags ?? [],
      search: state.filters?.search ?? "",
      simulationExcludedExpenseIds: state.filters?.simulationExcludedExpenseIds ?? [],
      budgetOutcomeStartMonth: state.filters?.budgetOutcomeStartMonth
    }
  };
}

export function cloneContextTemplate(state: AppState, sourceContextId: string, name: string): AppState {
  const source = state.contexts.find((context) => context.id === sourceContextId);
  if (!source) return state;
  const context = { ...source, id: id("ctx"), name, createdAt: stamp, updatedAt: stamp };
  const supplierMap = new Map<string, string>();
  const categoryMap = new Map<string, string>();
  const peopleMap = new Map<string, string>();
  const suppliers = state.suppliers
    .filter((supplier) => supplier.contextId === sourceContextId)
    .map((supplier) => {
      const newId = id("sup");
      supplierMap.set(supplier.id, newId);
      return { ...supplier, id: newId, contextId: context.id, logoFileId: undefined };
    });
  const categories = state.categories
    .filter((category) => category.contextId === sourceContextId)
    .map((category) => {
      const newId = id("cat");
      categoryMap.set(category.id, newId);
      return { ...category, id: newId, contextId: context.id };
    });
  const people = state.people
    .filter((person) => person.contextId === sourceContextId)
    .map((person) => {
      const newId = id("per");
      peopleMap.set(person.id, newId);
      return { ...person, id: newId, contextId: context.id };
    });
  return {
    ...state,
    activeContextId: context.id,
    contexts: [...state.contexts, context],
    suppliers: [...state.suppliers, ...suppliers],
    categories: [...state.categories, ...categories],
    people: [...state.people, ...people]
  };
}
