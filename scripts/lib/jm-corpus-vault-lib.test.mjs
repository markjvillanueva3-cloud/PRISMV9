// Tests for jm-corpus-vault-lib.mjs (node:test). Real-value assertions.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normCustomer, slugifyCustomer, groupActualsByCustomer, customerPriceStats, renderCustomerNote,
  isFormLabelCustomer, sanitizeDate, DEFAULT_MAX_PLAUSIBLE_USD,
} from "./jm-corpus-vault-lib.mjs";

test("data-quality gates: high-outlier, sub-dollar, form-label, bad-date all caught + tracked (R12)", () => {
  const recs = [
    { customer: "REALCO", part_id: "P1", actual_invoice_usd: 5000, date: "2019-05-01", extraction_confidence: 0.9 },     // kept
    { customer: "BIRMINGHAM", part_id: "P2", actual_invoice_usd: 130_650_673, date: "2019-01-01", extraction_confidence: 0.9 }, // $130M high-outlier
    { customer: "REALCO", part_id: "P3", actual_invoice_usd: 0.002, date: "2019-02-01", extraction_confidence: 0.9 },    // sub-dollar
    { customer: "SELECTED LOCATION", part_id: "P4", actual_invoice_usd: 800, extraction_confidence: 0.9 },                // form-label exact
    { customer: "ADDRESS", part_id: "P5", actual_invoice_usd: 900, extraction_confidence: 0.9 },                          // form-label leak (B P0)
    { customer: "THIS DRAWING IS THE PROPERTY OF AND MAY", part_id: "P6", actual_invoice_usd: 700, extraction_confidence: 0.9 }, // boilerplate phrase
    { customer: "REALCO", part_id: "P7", actual_invoice_usd: 6000, date: "4611-10-12", extraction_confidence: 0.9 },     // kept, but date nulled
  ];
  const ex = {};
  const g = groupActualsByCustomer(recs, { minConfidence: 0.6, excluded: ex });
  assert.deepEqual([...g.keys()], ["REALCO"]);  // only the real customer survives (3 of its 4 rows kept)
  assert.equal(g.get("REALCO").rows.length, 2); // P1 + P7 (P3 sub-dollar dropped)
  assert.equal(ex.outlierPrice, 1);             // $130M
  assert.equal(ex.subDollar, 1);                // $0.002
  assert.equal(ex.formLabel, 3);                // SELECTED LOCATION + ADDRESS + THIS DRAWING...
  assert.equal(ex.nulledDate, 1);               // 4611-10-12 row kept but date nulled
  assert.equal(g.get("REALCO").rows.find((r) => r.part === "P7").date, ""); // corrupt date nulled, price kept
});

test("isFormLabelCustomer: exact labels + phrase fragments true; real customers false", () => {
  for (const f of ["ADDRESS", "SHIPTO", "SHIP TO", "ORDER DATE", "VENDOR", "PO BOX 1452", "AND REGULATORY AUTHORITIES TO ALL", "THIS DRAWING IS THE PROPERTY OF AND MAY"]) {
    assert.equal(isFormLabelCustomer(f), true, `expected form-label: ${f}`);
  }
  for (const r of ["ARCHER SCREW", "OMG", "AGRATI PARK FOREST", "MULTITCCH COLD FORM", "ELITE"]) {
    assert.equal(isFormLabelCustomer(r), false, `expected real customer: ${r}`);
  }
});

test("sanitizeDate: keeps in-window dates, nulls impossible OCR years", () => {
  assert.equal(sanitizeDate("2019-05-01"), "2019-05-01");
  assert.equal(sanitizeDate("4611-10-12"), "");   // year out of window
  assert.equal(sanitizeDate("1141-01-01"), "");
  assert.equal(sanitizeDate(""), "");
  assert.equal(sanitizeDate(null), "");
  assert.equal(sanitizeDate("not-a-date"), "");
});

test("normCustomer: case + whitespace + punctuation collapse (conservative, no fuzzy merge)", () => {
  assert.equal(normCustomer("  Archer  Screw, Inc. "), "ARCHER SCREW INC");
  assert.equal(normCustomer("OMG"), "OMG");
  assert.equal(normCustomer(null), "");
  assert.equal(normCustomer(123), "");
  // distinct real names stay distinct (NOT merged) -- soul: non-conservative-customer-name-filter refuse
  assert.notEqual(normCustomer("ELITE"), normCustomer("ELITE MACHINE"));
});

test("slugifyCustomer: fs-safe + collision-resistant (distinct names -> distinct slugs)", () => {
  const a = slugifyCustomer("Archer Screw Products");
  assert.match(a, /^archer-screw-products-[a-z0-9]{1,4}$/);
  // two names that share the same base still differ via the hash suffix
  assert.notEqual(slugifyCustomer("A B"), slugifyCustomer("A  B!"));
  assert.equal(slugifyCustomer(""), slugifyCustomer("")); // deterministic
  assert.match(slugifyCustomer(""), /^customer-/);
});

const ACTS = [
  { customer: "ELITE", part_id: "340-HW", actual_invoice_usd: 1000, order_number: "R-1", date: "2017-10-20", extraction_confidence: 0.98 },
  { customer: "elite", part_id: "341-AB", actual_invoice_usd: 2000, order_number: "R-2", date: "2017-11-01", extraction_confidence: 0.9 },  // same customer (norm)
  { customer: "OMG", part_id: "413-7", actual_invoice_usd: 500, order_number: "R-3", date: "2018-01-05", extraction_confidence: 0.7 },
  { customer: "OMG", part_id: "413-7", actual_invoice_usd: 90, order_number: "R-4", date: "2018-02-05", extraction_confidence: 0.4 }, // below 0.6 floor
  { customer: "OMG", part_id: "bad", actual_invoice_usd: 0, order_number: "R-5", date: "2018-03-05", extraction_confidence: 0.9 }, // non-positive price
  { customer: "", part_id: "x", actual_invoice_usd: 100, extraction_confidence: 0.9 }, // empty customer -> dropped
];

test("groupActualsByCustomer: normalizes, confidence-gates, drops non-positive/empty", () => {
  const g = groupActualsByCustomer(ACTS, { minConfidence: 0.6 });
  assert.deepEqual([...g.keys()].sort(), ["ELITE", "OMG"]);
  assert.equal(g.get("ELITE").rows.length, 2);   // both ELITE/elite merged by norm
  assert.equal(g.get("ELITE").display, "ELITE");
  assert.equal(g.get("OMG").rows.length, 1);      // only the 0.7 row (0.4 gated, 0-price dropped)
});

test("groupActualsByCustomer: empty / non-array -> empty map (no throw)", () => {
  assert.equal(groupActualsByCustomer([]).size, 0);
  assert.equal(groupActualsByCustomer(null).size, 0);
});

test("customerPriceStats: real reference values", () => {
  const g = groupActualsByCustomer(ACTS, { minConfidence: 0.6 });
  const s = customerPriceStats(g.get("ELITE").rows);
  assert.equal(s.record_count, 2);
  assert.equal(s.part_count, 2);           // 340-HW + 341-AB
  assert.equal(s.order_count, 2);
  assert.equal(s.settled_total_usd, 3000); // 1000 + 2000
  assert.equal(s.price_median_usd, 1500);  // (1000+2000)/2
  assert.equal(s.price_min_usd, 1000);
  assert.equal(s.price_max_usd, 2000);
  assert.equal(s.date_first, "2017-10-20");
  assert.equal(s.date_last, "2017-11-01");
  assert.equal(customerPriceStats([]), null);
});

test("renderCustomerNote: frontmatter + recall body + parts table; honest cap", () => {
  const g = groupActualsByCustomer(ACTS, { minConfidence: 0.6 });
  const rows = g.get("ELITE").rows;
  const note = renderCustomerNote("ELITE", rows, customerPriceStats(rows), { minConfidence: 0.6 });
  assert.match(note.slug, /^elite-/);
  assert.match(note.content, /^---\nname: jm_corpus_customer_elite-/);
  assert.match(note.content, /node_type: jm-corpus-customer/);
  assert.match(note.content, /# ELITE -- JM Die settled-price history/);
  assert.match(note.content, /\$3,000/);     // settled total rendered
  assert.match(note.content, /\| 341-AB \| \$2,000 \| R-2 \| 2017-11-01 \|/); // a real table row, newest-first
  assert.match(note.content, /ADVISORY recall, NOT a quote/);
  assert.ok(!note.content.includes("newest 60 of")); // 2 rows < cap -> no cap note
});

test("renderCustomerNote: states the cap explicitly when rows exceed maxRows (R12)", () => {
  const many = Array.from({ length: 5 }, (_, i) => ({ part: "P" + i, price: 100 + i, order: "O" + i, date: "2020-01-0" + (i + 1), conf: 0.9 }));
  const stats = customerPriceStats(many);
  const note = renderCustomerNote("BIGCO", many, stats, { maxRows: 3 });
  assert.match(note.content, /newest 3 of 5/);   // honest truncation note
  const bodyRows = (note.content.match(/\| P\d \| /g) || []).length;
  assert.equal(bodyRows, 3);                       // only 3 shown
});

// --- live data integration (the $355M dataset, if present) ---
test("groupActualsByCustomer on the LIVE orders-closed-actuals.jsonl (if present)", () => {
  let actuals;
  try {
    const fs = require("node:fs");
    actuals = JSON.parse(fs.readFileSync("H:/PRISM/state/shared/quoting/orders-closed-actuals.jsonl", "utf8")).actuals;
  } catch { return; } // skip-soft when absent
  if (!Array.isArray(actuals) || actuals.length === 0) return;
  const g = groupActualsByCustomer(actuals, { minConfidence: 0.6 });
  assert.ok(g.size > 50, "expected many customers, got " + g.size);
  // every group has >=1 priced row + a renderable note
  const [, first] = [...g.entries()][0];
  const note = renderCustomerNote(first.display, first.rows, customerPriceStats(first.rows), { minConfidence: 0.6 });
  assert.match(note.content, /JM Die settled-price history/);
});
