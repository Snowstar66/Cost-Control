import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { parseBankStatementFile } from "./bankStatementImport";

async function buildXlsxFile(name: string, rows: Array<Array<string | number | undefined>>): Promise<File> {
  const zip = new JSZip();
  const sharedStrings: string[] = [];
  const sharedIndex = new Map<string, number>();
  const columnName = (index: number) => {
    let value = "";
    let current = index + 1;
    while (current > 0) {
      const remainder = (current - 1) % 26;
      value = String.fromCharCode(65 + remainder) + value;
      current = Math.floor((current - 1) / 26);
    }
    return value;
  };
  const cellXml = (value: string | number, rowIndex: number, columnIndex: number) => {
    const ref = `${columnName(columnIndex)}${rowIndex + 1}`;
    if (typeof value === "number") return `<c r="${ref}" t="n"><v>${value}</v></c>`;
    let index = sharedIndex.get(value);
    if (index === undefined) {
      index = sharedStrings.length;
      sharedIndex.set(value, index);
      sharedStrings.push(value);
    }
    return `<c r="${ref}" t="s"><v>${index}</v></c>`;
  };
  const sheetRows = rows
    .map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((value, columnIndex) => (value === undefined ? "" : cellXml(value, rowIndex, columnIndex))).join("")}</row>`)
    .join("");
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>`);
  zip.file("xl/sharedStrings.xml", `<?xml version="1.0" encoding="UTF-8"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${sharedStrings.map((value) => `<si><t>${value}</t></si>`).join("")}</sst>`);
  zip.file("xl/worksheets/sheet1.xml", `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`);
  const buffer = await zip.generateAsync({ type: "arraybuffer" });
  return { name, type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", arrayBuffer: async () => buffer } as File;
}

function buildPdfFile(name: string, content: string): File {
  const pdf = ["%PDF-1.5", "1 0 obj", `<< /Length ${content.length} >>`, "stream", content, "endstream", "endobj", "%%EOF"].join("\n");
  const buffer = new TextEncoder().encode(pdf).buffer;
  return { name, type: "application/pdf", arrayBuffer: async () => buffer } as File;
}

describe("parseBankStatementFile", () => {
  it("parses statement rows and ignores summaries", async () => {
    const csv = [
      "Datum;Bokfört;Specifikation;Ort;Valuta;Utl. belopp;Belopp",
      "2026-02-01;2026-02-02;ICA SUPERMARKET;OSTERSUND;SEK;0;125,50",
      ";;;Summa köp/uttag;;;125,50",
      "2026-02-05;2026-02-05;ÅR /MÅN AVG;;SEK;0;2335",
      "2026-02-03;2026-02-04;Inbetalning;;SEK;0;-25000"
    ].join("\n");
    const file = { name: "februari 2026.csv", text: async () => csv } as File;

    const result = await parseBankStatementFile(file);

    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]).toMatchObject({
      date: "2026-02-01",
      bookedDate: "2026-02-02",
      merchantRaw: "ICA SUPERMARKET",
      statementMonth: "2026-02",
      amount: 125.5,
      type: "one-off"
    });
    expect(result.ignoredRows).toBeGreaterThan(0);
  });

  it("prioriterar kontoutdragets månad framför andra datum i filhuvudet", async () => {
    const csv = [
      "Skapad;2026-05-02",
      "Månad;december 2025",
      "Datum;Bokfört;Specifikation;Ort;Valuta;Utl. belopp;Belopp",
      "2025-12-28;2025-12-29;APOTEK HJARTAT ICA MAX;OSTERSUND;SEK;0;187"
    ].join("\n");
    const file = { name: "kontoutdrag.csv", text: async () => csv } as File;

    const result = await parseBankStatementFile(file);

    expect(result.transactions[0]).toMatchObject({
      date: "2025-12-28",
      statementMonth: "2025-12"
    });
  });

  it("läser Excel-utdrag med fakturadetaljer och tomma celler", async () => {
    const file = await buildXlsxFile("april 2026.xlsx", [
      ["Fakturadetaljer", undefined, undefined, undefined, undefined, undefined, "2026-05-03 17:04:25"],
      [],
      ["Månad", undefined, undefined, undefined, undefined, undefined, "april 2026"],
      ["Förfallodag", undefined, undefined, undefined, undefined, undefined, "2026-04-30"],
      [],
      ["Totalt övriga händelser"],
      ["Datum", "Bokfört", "Specifikation", "Ort", "Valuta", "Utl. belopp", "Belopp"],
      [undefined, undefined, "Ingående saldo", undefined, undefined, undefined, -38026.12],
      [undefined, undefined, "Summa köp/uttag", undefined, undefined, undefined, 18489.96],
      ["Totalt belopp", undefined, undefined, undefined, undefined, undefined, -19536.16],
      [],
      ["525412******4466", "Hellgren Pontus"],
      ["Köp/uttag"],
      ["Datum", "Bokfört", "Specifikation", "Ort", "Valuta", "Utl. belopp", "Belopp"],
      [46098, 46099, "ZIGNED.SE", "STOCKHOLM", "SEK", 0, 36.25],
      [46099, 46100, "SJ.SE", "STOCKHOLM", "SEK", 0, 348]
    ]);

    const result = await parseBankStatementFile(file);

    expect(result.transactions).toHaveLength(2);
    expect(result.transactions[0]).toMatchObject({
      date: "2026-03-17",
      bookedDate: "2026-03-18",
      merchantRaw: "ZIGNED.SE",
      statementMonth: "2026-04",
      amount: 36.25
    });
    expect(result.transactions[1]).toMatchObject({
      date: "2026-03-18",
      bookedDate: "2026-03-19",
      merchantRaw: "SJ.SE",
      statementMonth: "2026-04",
      amount: 348
    });
    expect(result.ignoredRows).toBeGreaterThan(0);
  });

  it("läser PDF-utdrag med samma köpformat som Excel", async () => {
    const file = buildPdfFile(
      "mc_pdf_april.pdf",
      [
        "BT",
        "/F1 9.75 Tf",
        "1 0 0 1 306.30 761.70 Tm (2026-04-20) Tj",
        "1 0 0 1 56.70 646.80 Tm (260317) Tj 36.90 0 Td (ZIGNED.SE) Tj 151.50 0 Td (STOCKHOLM) Tj 72.30 0 Td (SEK) Tj 124.80 0 Td (260318) Tj 99.60 0 Td (36,25) Tj",
        "1 0 0 1 56.70 637.80 Tm (260418) Tj 15.51 0 Td (av) Tj 21.39 0 Td (ICA) Tj 17.51 0 Td (KVANTUM) Tj 7.13 0 Td (kreditutrymme,) Tj 39.37 0 Td (LILLANGE) Tj 87.49 0 Td (OSTERSUND) Tj 72.30 0 Td (SEK) Tj 124.80 0 Td (260419) Tj 99.60 0 Td (95,85) Tj",
        "ET"
      ].join("\n")
    );

    const result = await parseBankStatementFile(file);

    expect(result.transactions).toHaveLength(2);
    expect(result.transactions[0]).toMatchObject({
      date: "2026-03-17",
      bookedDate: "2026-03-18",
      merchantRaw: "ZIGNED.SE",
      location: "STOCKHOLM",
      statementMonth: "2026-04",
      amount: 36.25
    });
    expect(result.transactions[1]).toMatchObject({
      date: "2026-04-18",
      bookedDate: "2026-04-19",
      merchantRaw: "ICA KVANTUM LILLANGE",
      location: "OSTERSUND",
      statementMonth: "2026-04",
      amount: 95.85
    });
  });
});
