import JSZip from "jszip";
import type { UpsertTransactionInput } from "../app/actions";

type SheetRow = string[];

const worksheetNamespace = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";

export type BankStatementImportResult = {
  transactions: UpsertTransactionInput[];
  ignoredRows: number;
};

export async function parseBankStatementFile(file: File): Promise<BankStatementImportResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx")) return parseXlsx(file);
  return parseDelimited(await file.text(), file.name);
}

async function parseXlsx(file: File): Promise<BankStatementImportResult> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const shared = await readSharedStrings(zip);
  const sheetNames = Object.keys(zip.files).filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name));
  const rows: SheetRow[] = [];
  for (const sheetName of sheetNames) {
    const sheet = zip.file(sheetName);
    if (!sheet) continue;
    rows.push(...readSheetRows(await sheet.async("text"), shared));
  }
  return transactionsFromRows(rows, file.name);
}

function parseDelimited(text: string, fileName: string): BankStatementImportResult {
  const delimiter = text.includes(";") ? ";" : ",";
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, "")))
    .filter((row) => row.some(Boolean));
  return transactionsFromRows(rows, fileName);
}

async function readSharedStrings(zip: JSZip): Promise<string[]> {
  const file = zip.file("xl/sharedStrings.xml");
  if (!file) return [];
  const doc = new DOMParser().parseFromString(await file.async("text"), "application/xml");
  return [...doc.getElementsByTagNameNS(worksheetNamespace, "si")].map((item) => [...item.getElementsByTagNameNS(worksheetNamespace, "t")].map((node) => node.textContent ?? "").join(""));
}

function readSheetRows(xml: string, shared: string[]): SheetRow[] {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  return [...doc.getElementsByTagNameNS(worksheetNamespace, "row")].map((row) => {
    const cells: string[] = [];
    for (const cell of [...row.getElementsByTagNameNS(worksheetNamespace, "c")]) {
      const index = columnIndexFromCellRef(cell.getAttribute("r")) ?? cells.length;
      cells[index] = readCellValue(cell, shared);
    }
    return Array.from({ length: cells.length }, (_, index) => cells[index] ?? "");
  });
}

function readCellValue(cell: Element, shared: string[]): string {
  const type = cell.getAttribute("t");
  if (type === "inlineStr") {
    return [...cell.getElementsByTagNameNS(worksheetNamespace, "t")].map((node) => node.textContent ?? "").join("");
  }
  const value = cell.getElementsByTagNameNS(worksheetNamespace, "v")[0]?.textContent ?? "";
  if (type === "s") return shared[Number(value)] ?? "";
  return value;
}

function columnIndexFromCellRef(ref: string | null): number | undefined {
  const letters = ref?.match(/^[A-Z]+/i)?.[0];
  if (!letters) return undefined;
  return [...letters.toUpperCase()].reduce((index, letter) => index * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function transactionsFromRows(rows: SheetRow[], fileName: string): BankStatementImportResult {
  let header: Record<string, number> | undefined;
  let ignoredRows = 0;
  const transactions: UpsertTransactionInput[] = [];
  const importId = `${fileName}-${Date.now()}`;
  const statementMonth = findStatementMonth(rows, fileName);

  for (const row of rows) {
    const normalized = row.map(normalizeHeader);
    if (normalized.includes("datum") && normalized.includes("specifikation") && normalized.includes("belopp")) {
      header = Object.fromEntries(normalized.map((name, index) => [name, index]));
      continue;
    }
    if (!header) {
      ignoredRows += 1;
      continue;
    }
    const date = normalizeDate(row[header.datum]);
    const merchantRaw = (row[header.specifikation] ?? "").trim();
    const amount = parseAmount(row[header.belopp]);
    if (!date || !merchantRaw || amount === undefined || amount <= 0 || isSummaryRow(merchantRaw)) {
      ignoredRows += 1;
      continue;
    }
    transactions.push({
      date,
      statementMonth,
      bookedDate: normalizeDate(row[header["bokfort"] ?? header["bokfört"]]),
      merchantRaw,
      merchantNormalized: normalizeMerchant(merchantRaw),
      description: merchantRaw,
      location: row[header.ort] || undefined,
      currency: row[header.valuta] || "SEK",
      amount,
      source: "import",
      importId,
      type: "one-off"
    });
  }

  return { transactions, ignoredRows };
}

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

function findStatementMonth(rows: SheetRow[], fileName: string): string | undefined {
  const topRows = rows.slice(0, 30);
  const labelledRows = topRows.filter((row) => row.map(normalizeHeader).some((cell) => /^(manad|period|kontoutdrag)$/.test(cell)));
  const fromLabelledRows = labelledRows
    .map((row) => row.join(" "))
    .map((value) => monthKeyFromText(value, true))
    .find(Boolean);
  const fromFileName = monthKeyFromText(fileName, true);
  const fromMonthNameRows = topRows
    .map((row) => row.join(" "))
    .map((value) => monthKeyFromText(value, false))
    .find(Boolean);
  return fromLabelledRows ?? fromFileName ?? fromMonthNameRows;
}

function monthKeyFromText(value: string, allowIso: boolean): string | undefined {
  const normalized = value.trim().toLowerCase();
  for (const [month, monthNumber] of Object.entries(swedishMonths)) {
    const match = normalized.match(new RegExp(`\\b${month}\\s+(20\\d{2})\\b`));
    if (match) return `${match[1]}-${monthNumber}`;
  }
  if (!allowIso) return undefined;
  const iso = normalized.match(/\b(20\d{2})[-_ ]?(0[1-9]|1[0-2])\b/);
  if (iso) return `${iso[1]}-${iso[2]}`;
  return undefined;
}

function normalizeHeader(value: string): string {
  return foldText(value);
}

function normalizeDate(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const swe = trimmed.match(/^(\d{4})-(\d{2})$/);
  if (swe) return `${swe[1]}-${swe[2]}-01`;
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const date = new Date(Date.UTC(1899, 11, 30 + Number(trimmed)));
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  }
  return undefined;
}

function parseAmount(value?: string): number | undefined {
  if (!value) return undefined;
  const amount = Number(value.replace(/\s/g, "").replace("\u2212", "-").replace(",", "."));
  return Number.isFinite(amount) ? amount : undefined;
}

function normalizeMerchant(value: string): string {
  return value.trim().replace(/\s+/g, " ").replace(/[-_]/g, " ").toUpperCase();
}

function isSummaryRow(value: string): boolean {
  const normalized = foldText(value);
  return /saldo|summa|totalt|inbetalning|avg|average|medel|snitt|genomsnitt|ar\s*\/\s*man|man\s*\/\s*ar/i.test(normalized);
}

function foldText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/Ã¥|ÃƒÂ¥/g, "å")
    .replace(/Ã¤|ÃƒÂ¤/g, "ä")
    .replace(/Ã¶|ÃƒÂ¶/g, "ö")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
