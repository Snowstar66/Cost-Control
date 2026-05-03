import { describe, expect, it } from "vitest";
import { createInitialState } from "../domain/seed";
import { buildExportPayload, buildHandoffHtml, importAsNewContext, validateImportPayload } from "./exportImport";

describe("context export/import", () => {
  it("validerar exportformat", () => {
    const state = createInitialState();
    const payload = buildExportPayload(state, true);

    expect(validateImportPayload(payload).ok).toBe(true);
    expect(validateImportPayload({}).ok).toBe(false);
  });

  it("importerar som ny isolerad kontext och remappar relationer", () => {
    const state = createInitialState();
    const payload = buildExportPayload(state, true);
    const next = importAsNewContext(state, payload);
    const importedContext = next.contexts.find((context) => context.id === next.activeContextId)!;
    const importedExpenses = next.expenses.filter((expense) => expense.contextId === importedContext.id);

    expect(next.contexts).toHaveLength(2);
    expect(importedExpenses.length).toBe(payload.expenses.length);
    expect(importedExpenses[0].id).not.toBe(payload.expenses[0].id);
    expect(next.expenses.filter((expense) => expense.contextId === state.activeContextId)).toHaveLength(payload.expenses.length);
  });

  it("skapar en handoff-fil som pekar mot webbappen", () => {
    const state = createInitialState();
    const html = buildHandoffHtml(state, "https://cost-control-beige.vercel.app/");

    expect(html).toContain("https://cost-control-beige.vercel.app/");
    expect(html).toContain("cost-control-handoff");
    expect(html).toContain("cost-control-app-state");
  });
});
