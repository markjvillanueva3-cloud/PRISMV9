/**
 * InvoiceTextParserFormula.test.ts — hotel iter20 / G2 close-out.
 */

import { describe, it, expect } from "vitest";
import { parseInvoiceText } from "../algorithms/InvoiceTextParserFormula.js";

const CLEAN_INVOICE_TEXT = `
MSC Industrial Direct Co.
75 Maxess Road
Melville, NY 11747

Invoice Number: INV-2026-04781
Invoice Date: 03/15/2026
Due Date: 04/14/2026

Bill To: JM Die Company

Items:
2 1/2" 4FL Carbide End Mill        35.50       71.00
4 CNMG432 Turning Insert           12.75       51.00

Subtotal: 122.00
Tax: 10.07
Grand Total: $132.07
`;

const NOISY_OCR_TEXT = `
Acme Tooling Supply
Invoice  No: ACM-9921
Date of Invoice  Feb 12, 2026
Payment Due: Mar 14 2026

3 Drill Bit 5/16"                    8.50      25.50
10 Tap M8x1.25                      14.00     140.00
2 Reamer .250                       42.00      84.00

Subtotal:  249.50
Tax:        20.59
Amount Due: $270.09
`;

describe("parseInvoiceText — clean MSC reference invoice", () => {
  it("extracts invoice_number", () => {
    const r = parseInvoiceText(CLEAN_INVOICE_TEXT);
    expect(r.invoice_number).toBe("INV-2026-04781");
  });

  it("extracts invoice_date in ISO format", () => {
    const r = parseInvoiceText(CLEAN_INVOICE_TEXT);
    expect(r.invoice_date).toBe("2026-03-15");
  });

  it("extracts due_date", () => {
    const r = parseInvoiceText(CLEAN_INVOICE_TEXT);
    expect(r.due_date).toBe("2026-04-14");
  });

  it("guesses vendor name from header lines", () => {
    const r = parseInvoiceText(CLEAN_INVOICE_TEXT);
    expect(r.vendor_name_guess).toBe("MSC Industrial Direct Co.");
  });

  it("extracts subtotal/tax/grand_total", () => {
    const r = parseInvoiceText(CLEAN_INVOICE_TEXT);
    expect(r.subtotal).toBe(122.00);
    expect(r.tax).toBe(10.07);
    expect(r.grand_total).toBe(132.07);
  });

  it("extracts line items with qty + unit_price + line_total", () => {
    const r = parseInvoiceText(CLEAN_INVOICE_TEXT);
    expect(r.line_items.length).toBe(2);
    expect(r.line_items[0].qty).toBe(2);
    expect(r.line_items[0].unit_price).toBe(35.50);
    expect(r.line_items[0].line_total).toBe(71.00);
  });

  it("HOTEL-SOUL: ledger gate — line_sum + tax == grand_total within tolerance", () => {
    const r = parseInvoiceText(CLEAN_INVOICE_TEXT);
    // 71 + 51 + 10.07 = 132.07 ✓
    expect(r.ledger_balanced).toBe(true);
    expect(r.ledger_variance).toBeLessThanOrEqual(0.05);
  });
});

describe("parseInvoiceText — noisy OCR (Acme) with extra whitespace + month-name dates", () => {
  it("still extracts invoice_number despite double-space", () => {
    const r = parseInvoiceText(NOISY_OCR_TEXT);
    expect(r.invoice_number).toBe("ACM-9921");
  });

  it("parses 'Feb 12, 2026' date format to ISO", () => {
    const r = parseInvoiceText(NOISY_OCR_TEXT);
    expect(r.invoice_date).toBe("2026-02-12");
  });

  it("3 line items extracted with totals", () => {
    const r = parseInvoiceText(NOISY_OCR_TEXT);
    expect(r.line_items.length).toBe(3);
    const total = r.line_items.reduce((s, li) => s + li.line_total, 0);
    expect(total).toBeCloseTo(249.50, 2);
  });

  it("HOTEL-SOUL: ledger gate balances on noisy OCR", () => {
    const r = parseInvoiceText(NOISY_OCR_TEXT);
    expect(r.ledger_balanced).toBe(true);
  });
});

describe("parseInvoiceText — hotel-soul ledger variance surfaces issues", () => {
  it("surfaces variance when line_total sum + tax != grand_total", () => {
    // Intentionally wrong grand total (off by $100)
    const broken = `
Acme Co
Invoice Number: BAD-001
Invoice Date: 2026-01-15
1 Widget 50.00 50.00
Tax: 5.00
Grand Total: 155.00
`;
    const r = parseInvoiceText(broken);
    expect(r.ledger_balanced).toBe(false);
    expect(r.ledger_variance).toBeGreaterThan(0.05);
    expect(r.parser_warnings.some(w => w.includes("ledger variance"))).toBe(true);
  });
});

describe("parseInvoiceText — defensive (no fabrication)", () => {
  it("returns null fields when patterns don't match (never guesses)", () => {
    const minimal = "Just some plain text with no invoice fields whatsoever.";
    const r = parseInvoiceText(minimal);
    expect(r.invoice_number).toBe(null);
    expect(r.grand_total).toBe(null);
    expect(r.line_items.length).toBe(0);
    expect(r.parser_warnings.length).toBeGreaterThan(0);
  });
});

describe("parseInvoiceText — R12 fail-loud", () => {
  it("rejects non-string input", () => {
    expect(() => parseInvoiceText(123 as unknown as string)).toThrow(/must be a string/);
  });

  it("rejects too-short text", () => {
    expect(() => parseInvoiceText("short")).toThrow(/at least/);
  });
});
