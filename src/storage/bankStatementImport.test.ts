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
});
