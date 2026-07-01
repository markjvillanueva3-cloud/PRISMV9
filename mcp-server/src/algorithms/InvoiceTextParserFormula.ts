/**
 * InvoiceTextParserFormula — post-OCR structured invoice extraction
 * (hotel iter20, 2026-05-24, U-INVOICE-TEXT-PARSER).
 *
 * Closes the PARSER half of G2 (AP-invoice OCR automation). External OCR
 * runtime (Tesseract/AWS Textract/etc.) produces raw text; this pure
 * algorithm consumes that text and extracts structured invoice fields:
 *   - invoice_number, invoice_date, due_date
 *   - vendor_name (best-guess from header lines)
 *   - line_items (description + qty + unit_price + line_total)
 *   - subtotal, tax, grand_total
 *   - financial-invariant gate: sum(line_totals) + tax ≈ grand_total
 *
 * The OCR runtime is the missing piece (G2-runtime), but PRISM can now
 * accept text from ANY OCR source. This is the right separation per R12:
 * the parser is testable in isolation with reference invoice text.
 *
 * Hotel-soul:
 *   - **R12 fail-loud** — bad inputs throw with descriptive errors
 *   - **financial-invariant gate** — surface variance between line_totals
 *     sum and grand_total; do NOT silently absorb (operator must
 *     investigate OCR misread or vendor math error)
 *   - **deterministic** — no PRNG; same text input → same parse output
 *   - **defensive** — partial extraction returns null fields rather than
 *     guessing; never fabricates data the text doesn't contain
 *
 * Reference: USC R.G. Goldsmith "Document Information Extraction" 2002;
 * APICS CSCP §4 (Purchasing & 3-way match) for invoice field expectations.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ParsedInvoiceLineItem {
  description: string;
  qty: number | null;
  unit_price: number | null;
  line_total: number;
}

export interface ParsedInvoice {
  invoice_number: string | null;
  invoice_date: string | null;       // ISO yyyy-mm-dd if parseable, else original
  due_date: string | null;
  vendor_name_guess: string | null;
  line_items: ParsedInvoiceLineItem[];
  subtotal: number | null;
  tax: number | null;
  grand_total: number | null;
  ledger_balanced: boolean;          // sum(line_totals) + tax ≈ grand_total
  ledger_variance: number;           // absolute variance in dollars
  parser_warnings: string[];
  fetched_at: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const LEDGER_TOLERANCE = 0.05;       // OCR noise → looser tolerance than direct-entry engines
const MIN_TEXT_LEN = 10;
const MAX_TEXT_LEN = 1_000_000;
const ZERO = 0;

// Regex patterns — kept liberal; multiple invoice formats supported
const INVOICE_NUMBER_RE = /(?:invoice\s*(?:#|no|number|num)?\s*[:.]?\s*)([A-Z0-9-]{3,20})/i;
const DATE_RE = /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})/i;
const INVOICE_DATE_RE = new RegExp(`(?:invoice\\s*date|date\\s*of\\s*invoice|invoiced?)\\s*[:.]?\\s*${DATE_RE.source}`, "i");
const DUE_DATE_RE = new RegExp(`(?:due\\s*date|payment\\s*due|net\\s*\\d+\\s*due)\\s*[:.]?\\s*${DATE_RE.source}`, "i");
const MONEY_RE = /\$?\s*(\d{1,7}(?:,\d{3})*\.\d{2})/;
const SUBTOTAL_RE = new RegExp(`(?:subtotal|sub-total|sub\\s*total)\\s*[:.]?\\s*${MONEY_RE.source}`, "i");
const TAX_RE = new RegExp(`(?:^|\\s)(?:tax|sales\\s*tax|vat|gst)\\s*[:.]?\\s*${MONEY_RE.source}`, "i");
// Grand-total: most-specific keywords first
const GRAND_TOTAL_KEYWORDS_RE = new RegExp(`(?:grand\\s*total|total\\s*due|amount\\s*due|invoice\\s*total|balance\\s*due)\\s*[:.]?\\s*${MONEY_RE.source}`, "i");
// Fallback bare "total" — line-by-line scan in code skips any line that contains "subtotal"
const FALLBACK_TOTAL_RE = new RegExp(`total\\s*[:.]?\\s*${MONEY_RE.source}`, "i");

// Line-item heuristic: "description ... qty x $unit ... $line_total" or "qty description $line_total"
const LINE_ITEM_RE = /^\s*(\d+)\s+(.+?)\s+\$?\s*(\d+(?:,\d{3})*\.\d{2})\s+\$?\s*(\d+(?:,\d{3})*\.\d{2})\s*$/;

const DATE_MONTH_NAMES: ReadonlyArray<string> = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];

// ─── Helpers ────────────────────────────────────────────────────────────────

function moneyToNumber(s: string): number {
  return parseFloat(s.replace(/,/g, ""));
}

function tryParseISODate(raw: string): string | null {
  const t = raw.trim();
  // ISO yyyy-mm-dd already
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    const d = new Date(t + "T00:00:00Z");
    return Number.isNaN(d.getTime()) ? null : t;
  }
  // mm/dd/yyyy or mm-dd-yyyy
  const slashMatch = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (slashMatch) {
    const [, mm, dd, yy] = slashMatch;
    const yyyy = yy.length === 2 ? "20" + yy : yy;
    const d = new Date(Date.UTC(+yyyy, +mm - 1, +dd));
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }
  // "Jan 15 2026" or "January 15, 2026"
  const monthMatch = t.match(/^([A-Za-z]+)[a-z]*\s+(\d{1,2}),?\s+(\d{4})$/);
  if (monthMatch) {
    const monthIdx = DATE_MONTH_NAMES.indexOf(monthMatch[1].toLowerCase().slice(0, 3));
    if (monthIdx < 0) return null;
    const d = new Date(Date.UTC(+monthMatch[3], monthIdx, +monthMatch[2]));
    return d.toISOString().slice(0, 10);
  }
  return null;
}

function guessVendorName(text: string): string | null {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  // First non-empty line that doesn't start with "Invoice" / numeric / bill-to
  for (const line of lines.slice(0, 5)) {
    if (/^(invoice|bill|to|from|date|page|tel|phone|email|www|http)/i.test(line)) continue;
    if (/^\d/.test(line)) continue;
    if (line.length < 3) continue;
    if (line.length > 100) continue;
    return line;
  }
  return null;
}

// ─── Main parser ───────────────────────────────────────────────────────────

/**
 * Parse OCR'd invoice text into structured ParsedInvoice. Caller-supplied
 * text comes from any OCR runtime (Tesseract/AWS Textract/Azure Form
 * Recognizer/etc.).
 *
 * @throws on text shorter than MIN_TEXT_LEN or oversize
 */
export function parseInvoiceText(text: string): ParsedInvoice {
  if (typeof text !== "string") throw new Error("text: must be a string");
  if (text.length < MIN_TEXT_LEN) throw new Error(`text: must be at least ${MIN_TEXT_LEN} chars`);
  if (text.length > MAX_TEXT_LEN) throw new Error(`text: exceeds ${MAX_TEXT_LEN} chars`);

  const warnings: string[] = [];

  // Field extraction — null on no match (no fabrication)
  const invoiceNumMatch = text.match(INVOICE_NUMBER_RE);
  // Invoice number must contain at least one digit or hyphen (rejects pure-alpha
  // English words like "fields" that match the regex's loose token class)
  const rawInvoiceNum = invoiceNumMatch?.[1] ?? null;
  const invoiceNum = rawInvoiceNum && /[\d-]/.test(rawInvoiceNum) ? rawInvoiceNum : null;
  const invoiceDateMatch = text.match(INVOICE_DATE_RE);
  const dueDateMatch = text.match(DUE_DATE_RE);
  const subtotalMatch = text.match(SUBTOTAL_RE);
  const taxMatch = text.match(TAX_RE);

  // Grand-total resolution: prefer specific keywords; fall back to bare "total"
  // line ONLY on lines that do NOT contain "subtotal"
  let grandTotalMatch: RegExpMatchArray | null = text.match(GRAND_TOTAL_KEYWORDS_RE);
  if (!grandTotalMatch) {
    for (const line of text.split(/\r?\n/)) {
      if (/subtotal/i.test(line)) continue;
      const m = line.match(FALLBACK_TOTAL_RE);
      if (m) { grandTotalMatch = m; break; }
    }
  }

  const invoiceDateRaw = invoiceDateMatch?.[1] ?? null;
  const dueDateRaw = dueDateMatch?.[1] ?? null;
  const invoiceDate = invoiceDateRaw ? tryParseISODate(invoiceDateRaw) ?? invoiceDateRaw : null;
  const dueDate = dueDateRaw ? tryParseISODate(dueDateRaw) ?? dueDateRaw : null;

  // Line items — scan line-by-line
  const lineItems: ParsedInvoiceLineItem[] = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(LINE_ITEM_RE);
    if (m) {
      const qty = parseInt(m[1], 10);
      const unitPrice = moneyToNumber(m[3]);
      const lineTotal = moneyToNumber(m[4]);
      const description = m[2].trim();
      lineItems.push({
        description,
        qty: Number.isFinite(qty) ? qty : null,
        unit_price: Number.isFinite(unitPrice) ? unitPrice : null,
        line_total: lineTotal,
      });
    }
  }

  const subtotal = subtotalMatch ? moneyToNumber(subtotalMatch[1]) : null;
  const tax = taxMatch ? moneyToNumber(taxMatch[1]) : null;
  const grandTotal = grandTotalMatch ? moneyToNumber(grandTotalMatch[1]) : null;

  // Financial-invariant gate: sum(line_totals) + (tax ?? 0) ≈ grand_total
  let ledgerBalanced = true;
  let variance = 0;
  if (lineItems.length > 0 && grandTotal !== null) {
    const lineSum = lineItems.reduce((s, li) => s + li.line_total, ZERO);
    const expectedTotal = lineSum + (tax ?? ZERO);
    variance = Math.abs(expectedTotal - grandTotal);
    if (variance > LEDGER_TOLERANCE) {
      ledgerBalanced = false;
      warnings.push(
        `ledger variance: line_sum($${lineSum.toFixed(2)}) + tax($${(tax ?? 0).toFixed(2)}) = $${expectedTotal.toFixed(2)} but grand_total = $${grandTotal.toFixed(2)} (delta $${variance.toFixed(2)})`,
      );
    }
  }

  if (!invoiceNum) warnings.push("invoice_number not found");
  if (!invoiceDate) warnings.push("invoice_date not found");
  if (!grandTotal) warnings.push("grand_total not found");
  if (lineItems.length === 0) warnings.push("no line items extracted");

  return {
    invoice_number: invoiceNum,
    invoice_date: invoiceDate,
    due_date: dueDate,
    vendor_name_guess: guessVendorName(text),
    line_items: lineItems,
    subtotal,
    tax,
    grand_total: grandTotal,
    ledger_balanced: ledgerBalanced,
    ledger_variance: Math.round(variance * 100) / 100,
    parser_warnings: warnings,
    fetched_at: new Date().toISOString(),
  };
}
