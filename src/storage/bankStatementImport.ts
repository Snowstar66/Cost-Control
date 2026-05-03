import JSZip from "jszip";
import type { UpsertTransactionInput } from "../app/actions";

type SheetRow = string[];
type PdfTextItem = { x: number; y: number; text: string };
type PdfToken = { type: "number"; value: number } | { type: "string"; value: string } | { type: "operator"; value: string };

const worksheetNamespace = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const pdfTransactionNoiseWords = new Set([
  "ER",
  "TILLGODO",
  "BETALNINGSUPPGIFTER",
  "Lägsta",
  "belopp",
  "att",
  "3%",
  "av",
  "utnyttjat",
  "kreditutrymme,",
  "min",
  "150,00",
  "kr"
]);

export type BankStatementImportResult = {
  transactions: UpsertTransactionInput[];
  ignoredRows: number;
};

export async function parseBankStatementFile(file: File): Promise<BankStatementImportResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") return parsePdf(file);
  if (name.endsWith(".xlsx")) return parseXlsx(file);
  return parseDelimited(await file.text(), file.name);
}

async function parsePdf(file: File): Promise<BankStatementImportResult> {
  const rows = await readPdfRows(new Uint8Array(await file.arrayBuffer()));
  return transactionsFromRows(rows, file.name);
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

async function readPdfRows(bytes: Uint8Array): Promise<SheetRow[]> {
  const pdf = binaryStringFromBytes(bytes);
  const rows: SheetRow[] = [];
  const streamPattern = /(\d+\s+\d+\s+obj\s*<<[\s\S]*?>>\s*stream\r?\n)([\s\S]*?)\r?\nendstream/g;
  for (const match of pdf.matchAll(streamPattern)) {
    const dictionary = match[1];
    const streamBytes = bytesFromBinaryString(match[2]);
    const contentBytes = dictionary.includes("/FlateDecode") ? await inflatePdfStream(streamBytes) : streamBytes;
    const content = binaryStringFromBytes(contentBytes);
    if (!content.includes(" Tj")) continue;
    rows.push(...pdfTextItemsToRows(readPdfTextItems(content)));
  }
  return rows;
}

async function inflatePdfStream(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("PDF-import kräver stöd för komprimerade PDF-strömmar i webbläsaren.");
  }
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function readPdfTextItems(content: string): PdfTextItem[] {
  const items: PdfTextItem[] = [];
  const stack: PdfToken[] = [];
  let x = 0;
  let y = 0;
  for (const token of tokenizePdfContent(content)) {
    if (token.type !== "operator") {
      stack.push(token);
      continue;
    }
    if (token.value === "Tm") {
      const numbers = stack.filter((item): item is Extract<PdfToken, { type: "number" }> => item.type === "number").slice(-6);
      if (numbers.length === 6) {
        x = numbers[4].value;
        y = numbers[5].value;
      }
      stack.length = 0;
      continue;
    }
    if (token.value === "Td") {
      const numbers = stack.filter((item): item is Extract<PdfToken, { type: "number" }> => item.type === "number").slice(-2);
      if (numbers.length === 2) {
        x += numbers[0].value;
        y += numbers[1].value;
      }
      stack.length = 0;
      continue;
    }
    if (token.value === "Tj") {
      const value = stack.at(-1);
      if (value?.type === "string") items.push({ x: roundPdfCoordinate(x), y: roundPdfCoordinate(y), text: value.value });
      stack.length = 0;
      continue;
    }
    if (!token.value.startsWith("/")) stack.length = 0;
  }
  return items;
}

function pdfTextItemsToRows(items: PdfTextItem[]): SheetRow[] {
  const grouped: Array<{ y: number; items: PdfTextItem[] }> = [];
  for (const item of items) {
    const group = grouped.find((row) => Math.abs(row.y - item.y) < 1);
    if (group) group.items.push(item);
    else grouped.push({ y: item.y, items: [item] });
  }
  const statementDate = items.find((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.text))?.text;
  const rows: SheetRow[] = statementDate ? [["Kontoutdrag", statementDate], ["Datum", "Bokfört", "Specifikation", "Ort", "Valuta", "Utl. belopp", "Belopp"]] : [["Datum", "Bokfört", "Specifikation", "Ort", "Valuta", "Utl. belopp", "Belopp"]];
  for (const group of grouped.sort((a, b) => b.y - a.y)) {
    const sorted = group.items.sort((a, b) => a.x - b.x);
    const date = sorted.find((item) => item.x >= 50 && item.x <= 65 && /^\d{6}$/.test(item.text))?.text;
    if (!date) continue;
    const bookedDate = sorted.find((item) => item.x >= 430 && item.x <= 460 && /^\d{6}$/.test(item.text))?.text;
    const currency = sorted.find((item) => item.x >= 310 && item.x <= 330 && /^[A-Z]{3}$/.test(item.text))?.text;
    const amount = sorted.find((item) => item.x >= 500 && /^-?\d+([,.]\d{2})$/.test(item.text))?.text;
    const merchant = sorted
      .filter((item) => item.x >= 88 && item.x < 240 && !pdfTransactionNoiseWords.has(item.text) && !/^-?\d+([,.]\d{2})$/.test(item.text))
      .map((item) => item.text)
      .join(" ")
      .trim();
    const location = sorted
      .filter((item) => item.x >= 240 && item.x < 305 && !pdfTransactionNoiseWords.has(item.text))
      .map((item) => item.text)
      .join(" ")
      .trim();
    if (!bookedDate || !currency || !amount || !merchant || isSummaryRow(merchant)) continue;
    rows.push([date, bookedDate, merchant, location, currency, "", amount]);
  }
  return rows;
}

function* tokenizePdfContent(content: string): Generator<PdfToken> {
  let index = 0;
  while (index < content.length) {
    if (/\s/.test(content[index])) {
      index += 1;
      continue;
    }
    if (content[index] === "(") {
      const [value, nextIndex] = readPdfLiteralString(content, index);
      yield { type: "string", value };
      index = nextIndex;
      continue;
    }
    let end = index;
    while (end < content.length && !/\s/.test(content[end]) && !"()[]<>".includes(content[end])) end += 1;
    if (end === index) {
      index += 1;
      continue;
    }
    const value = content.slice(index, end);
    const number = Number(value);
    yield Number.isFinite(number) && /^[-+]?\d*\.?\d+$/.test(value) ? { type: "number", value: number } : { type: "operator", value };
    index = end;
  }
}

function readPdfLiteralString(content: string, start: number): [string, number] {
  let index = start + 1;
  let depth = 1;
  let value = "";
  while (index < content.length && depth > 0) {
    const char = content[index];
    if (char === "\\") {
      const next = content[index + 1] ?? "";
      const mapped = { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", "(": "(", ")": ")", "\\": "\\" }[next] ?? next;
      value += mapped;
      index += 2;
      continue;
    }
    if (char === "(") depth += 1;
    if (char === ")") {
      depth -= 1;
      if (depth === 0) {
        index += 1;
        break;
      }
    }
    value += char;
    index += 1;
  }
  return [value, index];
}

function binaryStringFromBytes(bytes: Uint8Array): string {
  let value = "";
  for (let index = 0; index < bytes.length; index += 8192) {
    value += String.fromCharCode(...bytes.slice(index, index + 8192));
  }
  return value;
}

function bytesFromBinaryString(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length);
  for (let index = 0; index < value.length; index += 1) bytes[index] = value.charCodeAt(index) & 0xff;
  return bytes;
}

function roundPdfCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
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
  const fromTopIsoDate = topRows
    .map((row) => row.join(" "))
    .map((value) => monthKeyFromText(value, true))
    .find(Boolean);
  return fromLabelledRows ?? fromFileName ?? fromMonthNameRows ?? fromTopIsoDate;
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
  const compact = trimmed.match(/^(\d{2})(\d{2})(\d{2})$/);
  if (compact) return `20${compact[1]}-${compact[2]}-${compact[3]}`;
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
