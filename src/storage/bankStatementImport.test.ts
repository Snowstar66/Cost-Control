import { describe, expect, it } from "vitest";
import { parseBankStatementFile } from "./bankStatementImport";

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
});
