// Tests for docustrata-outcome-extract-lib.mjs (node:test). Real-value assertions.
// Centers on U-QP-CLOSEDORDER-ROUTING-FIX: CLOSED_ORDER is an ACTUAL source, not a quote.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyRow,
  pairQuotesToActuals,
  parseUsd,
  parseDate,
  normalizeCustomer,
  mineDollarAmounts,
  mineOrderNumber,
  mineOrderTotal,
  minePartNumber,
  collectStandaloneActuals,
} from "./docustrata-outcome-extract-lib.mjs";

// Minimal helpers to build realistic text-extracted rows.
const row = (role, text, conf = 0.9, id = "doc-" + Math.round(text.length)) => ({
  id, inferred_role: role, role_confidence: conf, extracted: { text },
});
const QUOTE_TXT = "BILL TO: ACME FASTENERS\nPART #: WIDGET-7\nDATE 03/04/2026\nQUOTE TOTAL: $1,250.00\n.....................";
const CLOSED_TXT = "SOLD TO: ACME FASTENERS\nPART #: WIDGET-7\nDATE 03/20/2026\nGRAND TOTAL: $1,400.00\n.....................";
const INVOICE_TXT = "BILL TO: BETA CORP\nPART #: GEAR-3\nDATE 05/10/2026\nINVOICE TOTAL: $880.00\n.....................";
const SALESORD_TXT = "SHIP TO: GAMMA LLC\nJOB #: PLATE-9\nDATE 02/02/2026\nSUBTOTAL: $300.00\n.....................";

// --- classifyRow: the routing fix ------------------------------------------
test("classifyRow: CLOSED_ORDER with $ -> ACTUAL bucket (the fix), actual_source=closed_order", () => {
  const r = classifyRow(row("CLOSED_ORDER", CLOSED_TXT));
  assert.equal(r.ok, true);
  assert.equal(r.bucket, "actual");          // NOT "quote" -- this is the bug fix
  assert.equal(r.entry.actual_invoice_usd, 1400);
  assert.equal(r.entry.predicted_quote_usd, undefined);
  assert.equal(r.entry.actual_source, "closed_order");
});

test("classifyRow: INVOICE with $ -> ACTUAL bucket, actual_source=invoice", () => {
  const r = classifyRow(row("INVOICE", INVOICE_TXT));
  assert.equal(r.ok, true);
  assert.equal(r.bucket, "actual");
  assert.equal(r.entry.actual_invoice_usd, 880);
  assert.equal(r.entry.actual_source, "invoice");
});

test("classifyRow: QUOTE with $ -> QUOTE bucket (predicted), unchanged", () => {
  const r = classifyRow(row("QUOTE", QUOTE_TXT));
  assert.equal(r.ok, true);
  assert.equal(r.bucket, "quote");
  assert.equal(r.entry.predicted_quote_usd, 1250);
  assert.equal(r.entry.actual_invoice_usd, undefined);
});

test("classifyRow: SALES_ORDER with $ -> QUOTE bucket (current behavior preserved)", () => {
  const r = classifyRow(row("SALES_ORDER", SALESORD_TXT));
  assert.equal(r.ok, true);
  assert.equal(r.bucket, "quote");
  assert.equal(r.entry.predicted_quote_usd, 300);
});

// --- classifyRow: failure modes --------------------------------------------
test("classifyRow: below role-confidence floor -> ok:false", () => {
  assert.equal(classifyRow(row("CLOSED_ORDER", CLOSED_TXT, 0.3)).ok, false);
  assert.equal(classifyRow(row("CLOSED_ORDER", CLOSED_TXT, 0.3)).reason, "low-role-confidence");
});

test("classifyRow: empty / too-short text -> ok:false no-text", () => {
  assert.equal(classifyRow(row("QUOTE", "")).reason, "no-text");
  assert.equal(classifyRow(row("QUOTE", "short")).reason, "no-text");
});

test("classifyRow: priceable role but NO $ in text -> ok:false no-amount", () => {
  const noMoney = "BILL TO: DELTA INC\nPART #: NUT-1\nDATE 01/01/2026\n(no totals here at all).............";
  assert.equal(classifyRow(row("CLOSED_ORDER", noMoney)).reason, "no-amount");
});

test("classifyRow: non-targeted role -> ok:false role-not-targeted", () => {
  assert.equal(classifyRow(row("PACKING_SLIP", QUOTE_TXT)).reason, "role-not-targeted");
});

// --- classifyRow: adversarial ----------------------------------------------
test("classifyRow: null/garbage record never throws", () => {
  for (const v of [null, undefined, {}, { inferred_role: 123 }, { inferred_role: "QUOTE" }]) {
    const r = classifyRow(v);
    assert.equal(r.ok, false);
  }
});

// --- pairQuotesToActuals: the fix end-to-end -------------------------------
function bucketize(rows) {
  const quotesByKey = new Map(), actualsByKey = new Map();
  for (const rec of rows) {
    const c = classifyRow(rec);
    if (!c.ok) continue;
    const m = c.bucket === "quote" ? quotesByKey : actualsByKey;
    const list = m.get(c.key) ?? [];
    list.push(c.entry);
    m.set(c.key, list);
  }
  return { quotesByKey, actualsByKey };
}

test("pair: QUOTE + CLOSED_ORDER (same customer|part, within window) -> 1 pair (THE FIX, end-to-end)", () => {
  const { quotesByKey, actualsByKey } = bucketize([row("QUOTE", QUOTE_TXT), row("CLOSED_ORDER", CLOSED_TXT)]);
  const pairs = pairQuotesToActuals(quotesByKey, actualsByKey);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].predicted_quote_usd, 1250);
  assert.equal(pairs[0].actual_invoice_usd, 1400);
  assert.equal(pairs[0].actual_source, "closed_order");
  assert.equal(pairs[0].days_to_invoice, 16); // 03/04 -> 03/20
});

test("pair: QUOTE + INVOICE still pairs (actual_source=invoice)", () => {
  const q = "BILL TO: BETA CORP\nPART #: GEAR-3\nDATE 04/01/2026\nQUOTE TOTAL: $800.00\n.................";
  const { quotesByKey, actualsByKey } = bucketize([row("QUOTE", q), row("INVOICE", INVOICE_TXT)]);
  const pairs = pairQuotesToActuals(quotesByKey, actualsByKey);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].actual_source, "invoice");
});

test("pair: actual BEFORE quote -> no pair (actual must follow)", () => {
  const lateQuote = "BILL TO: ACME FASTENERS\nPART #: WIDGET-7\nDATE 04/01/2026\nQUOTE TOTAL: $1,250.00\n........";
  const { quotesByKey, actualsByKey } = bucketize([row("QUOTE", lateQuote), row("CLOSED_ORDER", CLOSED_TXT)]); // closed 03/20 < quote 04/01
  assert.equal(pairQuotesToActuals(quotesByKey, actualsByKey).length, 0);
});

test("pair: outside the 60-day window -> no pair", () => {
  const farClosed = "SOLD TO: ACME FASTENERS\nPART #: WIDGET-7\nDATE 09/01/2026\nGRAND TOTAL: $1,400.00\n........";
  const { quotesByKey, actualsByKey } = bucketize([row("QUOTE", QUOTE_TXT), row("CLOSED_ORDER", farClosed)]);
  assert.equal(pairQuotesToActuals(quotesByKey, actualsByKey, { windowDays: 60 }).length, 0);
});

test("pair: picks the CLOSEST-in-time actual when several exist", () => {
  const closeClosed = "SOLD TO: ACME FASTENERS\nPART #: WIDGET-7\nDATE 03/10/2026\nGRAND TOTAL: $1,300.00\n......"; // +6d
  const farClosed = "SOLD TO: ACME FASTENERS\nPART #: WIDGET-7\nDATE 03/30/2026\nGRAND TOTAL: $1,500.00\n......"; // +26d
  const { quotesByKey, actualsByKey } = bucketize([row("QUOTE", QUOTE_TXT), row("CLOSED_ORDER", closeClosed), row("CLOSED_ORDER", farClosed)]);
  const pairs = pairQuotesToActuals(quotesByKey, actualsByKey);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].actual_invoice_usd, 1300); // the +6d one
});

// --- fail-on-revert: the bug must never come back --------------------------
test("FAIL-ON-REVERT: a lone CLOSED_ORDER is NEVER misfiled into the quote bucket", () => {
  const c = classifyRow(row("CLOSED_ORDER", CLOSED_TXT));
  assert.notEqual(c.bucket, "quote", "CLOSED_ORDER misrouted to quote bucket = the original pair-killing bug");
  assert.equal(c.bucket, "actual");
  // And a lone CLOSED_ORDER with no quote produces no spurious pair (it is a terminal actual).
  const { quotesByKey, actualsByKey } = bucketize([row("CLOSED_ORDER", CLOSED_TXT)]);
  assert.equal(quotesByKey.size, 0);
  assert.equal(actualsByKey.size, 1);
  assert.equal(pairQuotesToActuals(quotesByKey, actualsByKey).length, 0);
});

test("pair: adversarial -- bad/NaN dates never throw, never false-pair", () => {
  const quotesByKey = new Map([["A|B", [{ date: "not-a-date", predicted_quote_usd: 100, confidence: 0.8, source_id: "q1", customer: "A", part_id: "B" }]]]);
  const actualsByKey = new Map([["A|B", [{ date: null, actual_invoice_usd: 120, confidence: 0.8, source_id: "a1", actual_source: "closed_order" }]]]);
  assert.equal(pairQuotesToActuals(quotesByKey, actualsByKey).length, 0);
});

// --- helper unit checks -----------------------------------------------------
test("parseUsd: commas/$ stripped, non-positive rejected", () => {
  assert.equal(parseUsd("$1,250.00"), 1250);
  assert.equal(parseUsd("0"), null);
  assert.equal(parseUsd("-5"), null);
  assert.equal(parseUsd(""), null);
  assert.equal(parseUsd(null), null);
});

test("parseDate: ISO + US + 2-digit-year pivot", () => {
  assert.equal(parseDate("DATE 2026-03-04"), "2026-03-04");
  assert.equal(parseDate("DATE 3/4/2026"), "2026-03-04");
  assert.equal(parseDate("DATE 3/4/26"), "2026-03-04");
  assert.equal(parseDate("DATE 3/4/99"), "1999-03-04");
  assert.equal(parseDate("no date"), null);
});

test("normalizeCustomer: case/suffix/punct stripped", () => {
  assert.equal(normalizeCustomer("Acme Fasteners, Inc."), "ACME");
  assert.equal(normalizeCustomer(null), null);
});

// --- U-QP-DOCTYPE-FIELD-MINING: PO/order format miners (real-data grounded) --
test("mineDollarAmounts: extracts + sorts descending; handles 5-decimal unit costs", () => {
  assert.deepEqual(mineDollarAmounts("Unit Cost $6.95000 EA  Amount $347.50  $173.75"), [347.5, 173.75, 6.95]);
  assert.deepEqual(mineDollarAmounts("no money here"), []);
  assert.deepEqual(mineDollarAmounts(null), []);
});

test("mineOrderNumber: PO/Order/Job number variants", () => {
  assert.equal(mineOrderNumber("Order Number:28469 Ship Via:Vendor"), "28469"); // real Elite Fasteners PO
  assert.equal(mineOrderNumber("PO Number: 134368"), "134368");                 // real Elgin PO
  assert.equal(mineOrderNumber("Purchase Order No. A-7741"), "A-7741");
  assert.equal(mineOrderNumber("JOB #: 96261"), "96261");
  assert.equal(mineOrderNumber("no order ref"), null);
});

test("mineOrderTotal: labeled total wins; else max-dollar; null when no $", () => {
  const labeled = mineOrderTotal("subtotal $300.00  GRAND TOTAL: $1,400.00");
  assert.equal(labeled.amount, 1400);
  assert.equal(labeled.method, "labeled-total");
  const poLines = mineOrderTotal("Unit Cost $6.95000 EA  Amount $347.50  $173.75"); // no labeled total
  assert.equal(poLines.amount, 347.5);          // max = the order total
  assert.equal(poLines.method, "max-dollar");
  assert.equal(poLines.confidence, 0.6);        // >=2 amounts -> medium
  assert.equal(mineOrderTotal("Amount $99.00").confidence, 0.4); // single $ -> lower
  assert.equal(mineOrderTotal("no dollars"), null);
});

// Real Elite Fasteners PO (#28469) text -- the structure the OLD regex missed entirely.
const REAL_PO_TXT = [
  "Purchase Order",
  "To: JM Tool & Die. LLC",
  "Order Number:28469 Ship Via:Vendor Delivery",
  "Order Date:09/20/17 Terms:Net 30 Days",
  "Vendor Code:JM DIE",
  "Quantity Part Number",
  "250-360LZBCAP  1/4 LZB Cap",
  "Unit Cost Unit",
  "$6.95000 EA",
  "Amount",
  "$347.50",
  "$173.75",
].join("\n");

test("classifyRow: REAL Orders-Closed PO -> ACTUAL bucket with extracted $ + order# (the doctype fix)", () => {
  const r = classifyRow({ id: "po-28469", inferred_role: "CLOSED_ORDER", role_confidence: 1.0, extracted: { text: REAL_PO_TXT } });
  assert.equal(r.ok, true);
  assert.equal(r.bucket, "actual");
  assert.equal(r.entry.actual_invoice_usd, 347.5);          // max line amount = order total
  assert.equal(r.entry.actual_price_method, "max-dollar");
  assert.equal(r.entry.order_number, "28469");              // precise join key now captured
  assert.equal(r.entry.actual_source, "closed_order");
  assert.equal(r.entry.date, "2017-09-20");                 // Order Date parsed
});

test("classifyRow: REAL PO with a labeled total prefers the label over max line", () => {
  const withTotal = REAL_PO_TXT + "\nORDER TOTAL: $521.25";
  const r = classifyRow({ id: "po-x", inferred_role: "CLOSED_ORDER", role_confidence: 1.0, extracted: { text: withTotal } });
  assert.equal(r.entry.actual_invoice_usd, 521.25);
  assert.equal(r.entry.actual_price_method, "labeled-total");
});

test("minePartNumber: PO label-on-own-line + NNN-XXXX inline + rejects word-noise", () => {
  assert.equal(minePartNumber("Quantity Part Number\n250-360LZBCAP  1/4 LZB Cap"), "250-360LZBCAP"); // label then next line
  assert.equal(minePartNumber("PART #: WIDGET-7"), "WIDGET-7");        // same-line labeled
  assert.equal(minePartNumber("line 1  250-100CAP  M2 Tool Steel"), "250-100CAP"); // inline NNN-XXXX
  assert.equal(minePartNumber("P/N 96261"), "96261");                 // bare P/N
  assert.equal(minePartNumber("please use this form"), null);         // word-noise rejected (no digit)
  assert.equal(minePartNumber("no part at all here"), null);
  // Phone numbers (NNN-NNN-NNNN, all digits) must NOT be mistaken for a part code --
  // found polluting 6,718 real actuals at scale (letterhead phone leaked as part_id).
  assert.equal(minePartNumber("Tel 815-397-8848 Fax 815-397-8335"), null);
  assert.equal(minePartNumber("call 630-616-7776 today"), null);
  // ...but a real NNN-XXXX part with a letter suffix still matches.
  assert.equal(minePartNumber("250-360LZBCAP rush"), "250-360LZBCAP");
});

// --- U-QP-EMIT-STANDALONE-ACTUALS: real actuals must not be discarded -------
test("collectStandaloneActuals: flattens the actuals map, sorted by confidence, with provenance", () => {
  const actualsByKey = new Map([
    ["ACME|W7", [{ customer: "ACME", part_id: "W7", date: "2026-03-20", actual_invoice_usd: 1400, actual_source: "closed_order", actual_price_method: "labeled-total", order_number: "28469", confidence: 0.9, source_id: "a1" }]],
    ["BETA|G3", [{ customer: "BETA", part_id: "G3", date: "2026-05-10", actual_invoice_usd: 880, actual_source: "invoice", confidence: 0.6, source_id: "a2" }]],
  ]);
  const out = collectStandaloneActuals(actualsByKey);
  assert.equal(out.length, 2);
  assert.equal(out[0].actual_invoice_usd, 1400);      // confidence 0.9 leads
  assert.equal(out[0].order_number, "28469");
  assert.equal(out[0].actual_source, "closed_order");
  assert.equal(out[0].join_key, "ACME|W7");
  assert.equal(out[1].extraction_confidence, 0.6);
});

test("collectStandaloneActuals: empty / malformed map is safe (never throws)", () => {
  assert.deepEqual(collectStandaloneActuals(new Map()), []);
  assert.deepEqual(collectStandaloneActuals(new Map([["k", null]])), []);
});

test("standalone actuals are emitted EVEN WHEN no pairs form (the real-world case)", () => {
  // Two Orders-Closed actuals, no quotes -> 0 pairs but 2 standalone actuals preserved.
  const co1 = { id: "c1", inferred_role: "CLOSED_ORDER", role_confidence: 1.0, extracted: { text: CLOSED_TXT } };
  const co2 = { id: "c2", inferred_role: "CLOSED_ORDER", role_confidence: 1.0, extracted: { text: REAL_PO_TXT } };
  const actualsByKey = new Map();
  for (const rec of [co1, co2]) {
    const c = classifyRow(rec);
    if (c.ok && c.bucket === "actual") {
      const l = actualsByKey.get(c.key) ?? []; l.push(c.entry); actualsByKey.set(c.key, l);
    }
  }
  assert.equal(pairQuotesToActuals(new Map(), actualsByKey).length, 0); // no quotes -> no pairs
  assert.equal(collectStandaloneActuals(actualsByKey).length, 2);       // but actuals preserved
});
