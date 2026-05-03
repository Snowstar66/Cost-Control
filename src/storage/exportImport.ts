import JSZip from "jszip";
import { jsPDF } from "jspdf";
import { byContext, currentContext, formatMoney, getVisibleTimelineMonths, monthlyTotals } from "../domain/calculations";
import type { AppState, ExportPayload } from "../domain/types";
import { buildDataFilePayload } from "./dataFile";

type ShareNavigator = Navigator & {
  canShare?: (data: { files?: File[] }) => boolean;
  share?: (data: { title?: string; text?: string; files?: File[] }) => Promise<void>;
};

export function buildExportPayload(state: AppState, includeFiles: boolean): ExportPayload {
  const context = currentContext(state);
  return {
    kind: "cost-control-context-export",
    version: state.version,
    exportedAt: new Date().toISOString(),
    context,
    people: byContext(state.people, context.id),
    suppliers: byContext(state.suppliers, context.id),
    categories: byContext(state.categories, context.id),
    expenses: byContext(state.expenses, context.id),
    costPeriods: state.costPeriods.filter((period) => byContext(state.expenses, context.id).some((expense) => expense.id === period.expenseId)),
    attachments: includeFiles ? byContext(state.attachments, context.id) : [],
    reminders: byContext(state.reminders, context.id),
    transactions: byContext(state.transactions, context.id),
    merchantRules: byContext(state.merchantRules, context.id)
  };
}

export function validateImportPayload(value: unknown): { ok: true; payload: ExportPayload } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const payload = value as Partial<ExportPayload>;
  if (!payload || typeof payload !== "object") errors.push("Filen är inte ett giltigt JSON-objekt.");
  if (payload.kind !== "cost-control-context-export") errors.push("Exporttypen saknas eller är fel.");
  if (!payload.context?.name) errors.push("Kontext saknas.");
  for (const key of ["people", "suppliers", "categories", "expenses", "costPeriods", "attachments", "reminders"] as const) {
    if (!Array.isArray(payload[key])) errors.push(`${key} måste vara en lista.`);
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, payload: payload as ExportPayload };
}

export function importAsNewContext(state: AppState, payload: ExportPayload): AppState {
  const suffix = new Date().toLocaleString("sv-SE", { dateStyle: "short", timeStyle: "short" });
  const context = {
    ...payload.context,
    id: crypto.randomUUID(),
    name: `${payload.context.name} (import ${suffix})`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const contextId = context.id;
  const personMap = new Map(payload.people.map((item) => [item.id, crypto.randomUUID()]));
  const supplierMap = new Map(payload.suppliers.map((item) => [item.id, crypto.randomUUID()]));
  const categoryMap = new Map(payload.categories.map((item) => [item.id, crypto.randomUUID()]));
  const expenseMap = new Map(payload.expenses.map((item) => [item.id, crypto.randomUUID()]));
  const attachmentMap = new Map(payload.attachments.map((item) => [item.id, crypto.randomUUID()]));
  const transactions = payload.transactions ?? [];
  const merchantRules = payload.merchantRules ?? [];
  return {
    ...state,
    activeContextId: contextId,
    contexts: [...state.contexts, context],
    people: [...state.people, ...payload.people.map((item) => ({ ...item, id: personMap.get(item.id)!, contextId }))],
    suppliers: [...state.suppliers, ...payload.suppliers.map((item) => ({ ...item, id: supplierMap.get(item.id)!, contextId, logoFileId: item.logoFileId ? attachmentMap.get(item.logoFileId) : undefined }))],
    categories: [...state.categories, ...payload.categories.map((item) => ({ ...item, id: categoryMap.get(item.id)!, contextId, parentCategoryId: item.parentCategoryId ? categoryMap.get(item.parentCategoryId) : undefined }))],
    expenses: [
      ...state.expenses,
      ...payload.expenses.map((item) => ({
        ...item,
        id: expenseMap.get(item.id)!,
        contextId,
        supplierId: item.supplierId ? supplierMap.get(item.supplierId) : undefined,
        categoryId: item.categoryId ? categoryMap.get(item.categoryId) : undefined,
        payerPersonId: item.payerPersonId ? personMap.get(item.payerPersonId) : undefined
      }))
    ],
    costPeriods: [...state.costPeriods, ...payload.costPeriods.map((item) => ({ ...item, id: crypto.randomUUID(), expenseId: expenseMap.get(item.expenseId) ?? item.expenseId }))],
    attachments: [
      ...state.attachments,
      ...payload.attachments.map((item) => ({
        ...item,
        id: attachmentMap.get(item.id)!,
        contextId,
        expenseId: item.expenseId ? expenseMap.get(item.expenseId) : undefined,
        supplierId: item.supplierId ? supplierMap.get(item.supplierId) : undefined
      }))
    ],
    reminders: [...state.reminders, ...payload.reminders.map((item) => ({ ...item, id: crypto.randomUUID(), contextId, expenseId: expenseMap.get(item.expenseId) ?? item.expenseId }))],
    transactions: [
      ...state.transactions,
      ...transactions.map((item) => ({
        ...item,
        id: crypto.randomUUID(),
        contextId,
        categoryId: item.categoryId ? categoryMap.get(item.categoryId) : undefined,
        supplierId: item.supplierId ? supplierMap.get(item.supplierId) : undefined,
        recurringExpenseId: item.recurringExpenseId ? expenseMap.get(item.recurringExpenseId) : undefined
      }))
    ],
    merchantRules: [
      ...state.merchantRules,
      ...merchantRules.map((item) => ({
        ...item,
        id: crypto.randomUUID(),
        contextId,
        categoryId: item.categoryId ? categoryMap.get(item.categoryId) : undefined,
        supplierId: item.supplierId ? supplierMap.get(item.supplierId) : undefined
      }))
    ]
  };
}

export function download(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function exportJson(state: AppState, includeFiles: boolean): Promise<void> {
  const payload = buildExportPayload(state, includeFiles);
  download(`${payload.context.name.toLowerCase().replaceAll(" ", "-")}.json`, new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
}

export async function shareDataFile(state: AppState): Promise<void> {
  const filename = "MinaUtgifter.json";
  const file = new File([JSON.stringify(buildDataFilePayload(state), null, 2)], filename, { type: "application/json" });
  const shareNavigator = navigator as ShareNavigator;
  if (shareNavigator.share && (!shareNavigator.canShare || shareNavigator.canShare({ files: [file] }))) {
    await shareNavigator.share({
      title: "Mina Utgifter datafil",
      text: "Datafil för Mina Utgifter. Importera eller öppna filen på den andra enheten.",
      files: [file]
    });
    return;
  }
  download(filename, file);
}

export async function exportZip(state: AppState, includeFiles: boolean): Promise<void> {
  const payload = buildExportPayload(state, includeFiles);
  const zip = new JSZip();
  zip.file("context.json", JSON.stringify(payload, null, 2));
  if (includeFiles) {
    for (const attachment of payload.attachments) {
      zip.file(`attachments/${attachment.fileName}`, attachment.dataUrl.split(",")[1] ?? "", { base64: true });
    }
  }
  const blob = await zip.generateAsync({ type: "blob" });
  download(`${payload.context.name.toLowerCase().replaceAll(" ", "-")}.zip`, blob);
}

export function exportCsv(state: AppState): void {
  const context = currentContext(state);
  const expenses = byContext(state.expenses, context.id);
  const suppliers = byContext(state.suppliers, context.id);
  const categories = byContext(state.categories, context.id);
  const people = byContext(state.people, context.id);
  const rows = [
    ["Kontext", "Utgift", "Leverantör", "Kategori", "Betalare", "Flagga", "Status", "Belopp", "Period", "Dras dag"],
    ...expenses.flatMap((expense) =>
      state.costPeriods
        .filter((period) => period.expenseId === expense.id)
        .map((period) => [
          context.name,
          expense.name,
          suppliers.find((supplier) => supplier.id === expense.supplierId)?.name ?? "",
          categories.find((category) => category.id === expense.categoryId)?.name ?? "",
          people.find((person) => person.id === expense.payerPersonId) ? `${people.find((person) => person.id === expense.payerPersonId)?.firstName} ${people.find((person) => person.id === expense.payerPersonId)?.lastName}` : "",
          expense.necessityLevel,
          expense.status,
          String(period.amount),
          period.recurrence,
          period.chargeDay ? String(period.chargeDay) : ""
        ])
    ),
    ["", "", "", "", "", "", "", "", "", ""],
    ["Köp", "Handlare", "Kategori", "Datum", "Bokfört", "Belopp", "Valuta", "Källa", "Typ", "Ort"],
    ...byContext(state.transactions, context.id).map((transaction) => [
      context.name,
      transaction.merchantRaw,
      categories.find((category) => category.id === transaction.categoryId)?.name ?? "",
      transaction.date,
      transaction.bookedDate ?? "",
      String(transaction.amount),
      transaction.currency,
      transaction.source,
      transaction.type,
      transaction.location ?? ""
    ])
  ];
  const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
  download(`${context.name.toLowerCase().replaceAll(" ", "-")}-utgifter.csv`, new Blob([csv], { type: "text/csv;charset=utf-8" }));
}

export function exportPdf(state: AppState): void {
  const context = currentContext(state);
  const months = getVisibleTimelineMonths(context, state.hidePastMonths);
  const expenses = byContext(state.expenses, context.id);
  const totals = monthlyTotals(expenses, state.costPeriods, months);
  const pdf = new jsPDF();
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text(`Utgiftsrapport: ${context.name}`, 14, 18);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(`Exporterad ${new Date().toLocaleString("sv-SE")}`, 14, 26);
  let y = 38;
  for (const month of months) {
    pdf.text(`${month.label}: ${formatMoney(totals[month.key] ?? 0, context.currency)}`, 14, y);
    y += 7;
    if (y > 280) {
      pdf.addPage();
      y = 20;
    }
  }
  pdf.save(`${context.name.toLowerCase().replaceAll(" ", "-")}-rapport.pdf`);
}

export function exportRemindersIcs(state: AppState): void {
  const context = currentContext(state);
  const reminders = byContext(state.reminders, context.id).filter((reminder) => !reminder.done);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const escapeIcs = (value: string) => value.replaceAll("\\", "\\\\").replaceAll(";", "\\;").replaceAll(",", "\\,").replaceAll("\n", "\\n");
  const dateValue = (value: string) => value.replaceAll("-", "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mina Utgifter//Reminders//SV",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...reminders.flatMap((reminder) => [
      "BEGIN:VEVENT",
      `UID:${reminder.id}@mina-utgifter.local`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${dateValue(reminder.date)}`,
      `SUMMARY:${escapeIcs(reminder.title)}`,
      `DESCRIPTION:${escapeIcs(`Påminnelse från ${context.name}.`)}`,
      "BEGIN:VALARM",
      "TRIGGER:-P1D",
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeIcs(reminder.title)}`,
      "END:VALARM",
      "END:VEVENT"
    ]),
    "END:VCALENDAR"
  ];
  download(`${context.name.toLowerCase().replaceAll(" ", "-")}-paminnelser.ics`, new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" }));
}
