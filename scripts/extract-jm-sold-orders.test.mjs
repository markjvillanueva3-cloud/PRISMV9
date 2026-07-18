/**
 * Tests for extract-jm-sold-orders.mjs — VENDOR-NETWORK-MS0/U-VDN-JM-ORDERS.
 * Real-value assertions on PO/price parsing + confidence scoring against the
 * actual JMD Orders Closed text structure (noisy OCR).
 * Run: node --test scripts/extract-jm-sold-orders.test.mjs < /dev/null
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parsePoNumber,
  parseQuoteRef,
  parsePriceFigures,
  parseLineItems,
  scoreOrderConfidence,
  buildSoldOrderProfile,
} from "./extract-jm-sold-orders.mjs";

// a realistic (noisy) order text, modeled on the real M59007 sample
const ORDER = `John Hassail, LLC
JH PO Number
M 59007
P.O. Date 10/20/2017
J.M. Die Co. 1299 Beeline Drive Bensenville, IL 60106
VENDOR ID FT083  TERMS Net 30
QUANTITY PART NUMBER UNIT PRICE EXT. PRICE
THIS IS FOR THE TOOLROOM quote#10/18/17 53 WEEKS ARO
6.00 BWM-312 10.00 60.00
12.00 OAX-100 5.50 66.00`;

test("parsePoNumber: 'M 59007' (spaced) → normalized M59007", () => {
  assert.equal(parsePoNumber(ORDER), "M59007");
  assert.equal(parsePoNumber("P12345 something"), "P12345");
  assert.equal(parsePoNumber("no po here"), null);
  assert.equal(parsePoNumber(""), null);
  assert.equal(parsePoNumber(null), null);
});

test("parseQuoteRef: pulls quote# reference", () => {
  assert.equal(parseQuoteRef(ORDER), "10/18/17");
  assert.equal(parseQuoteRef("blah quote # AB-99 end"), "AB-99");
  assert.equal(parseQuoteRef("no ref"), null);
});

test("parsePriceFigures: extracts all positive money figures", () => {
  const f = parsePriceFigures("6.00 BWM 10.00 60.00 and $1,250.50");
  assert.ok(f.includes(60) && f.includes(10) && f.includes(1250.5));
  assert.deepEqual(parsePriceFigures("no numbers"), []);
  assert.deepEqual(parsePriceFigures(null), []);
});

test("parseLineItems: qty×unit≈ext rows accepted, mismatches rejected", () => {
  const items = parseLineItems(ORDER);
  // 6.00 × 10.00 = 60.00 ✓ ; 12.00 × 5.50 = 66.00 ✓
  assert.equal(items.length, 2, `expected 2 verified rows, got ${JSON.stringify(items)}`);
  assert.deepEqual(items[0], { qty: 6, unit_price: 10, ext_price: 60 });
  assert.deepEqual(items[1], { qty: 12, unit_price: 5.5, ext_price: 66 });
  // a row where ext != qty*unit must be rejected (OCR noise guard)
  assert.equal(parseLineItems("5.00 PART 10.00 999.00").length, 0, "5×10≠999 → rejected");
  assert.equal(parseLineItems("HEADER ROW NO QTY 1.00 2.00").length, 0, "no leading qty → skipped");
});

test("scoreOrderConfidence: high needs PO + verified line-item; tiers degrade honestly", () => {
  assert.equal(scoreOrderConfidence({ poNumber: "M59007", lineItems: [{ qty: 6 }], hasPriceTable: true }), "high");
  assert.equal(scoreOrderConfidence({ poNumber: null, lineItems: [], priceFigures: [10, 20], hasPriceTable: true }), "medium");
  assert.equal(scoreOrderConfidence({ poNumber: "M1", lineItems: [], priceFigures: [], hasPriceTable: false }), "low");
  assert.equal(scoreOrderConfidence({ poNumber: null, lineItems: [], priceFigures: [], hasPriceTable: false }), "none");
});

test("buildSoldOrderProfile: aggregates confidence + confirmed revenue; caveat present (R12)", () => {
  const rows = [
    { file: "ord1.pdf", text: ORDER },                                   // high: PO + 2 verified line-items
    { file: "ord2.pdf", text: "QUANTITY UNIT PRICE EXT. PRICE\n$500.00 stuff $250.00" }, // medium: price table + figures
    { file: "ord3.pdf", text: "blank scan no data" },                    // none
  ];
  const p = buildSoldOrderProfile(rows);
  assert.equal(p.ordersProcessed, 3);
  assert.equal(p.byConfidence.high, 1);
  assert.equal(p.byConfidence.none, 1);
  assert.equal(p.ordersWithVerifiedLineItems, 1);
  assert.equal(p.confirmedExtRevenue, 126, "ord1 verified ext = 60+66");
  assert.equal(p.records[0].po_number, "M59007", "highest ext-total sorts first");
  assert.ok(p.advisoryOnly && p.mustHumanVerify && /OCR/i.test(p.caveat), "honest caveat present");
});

test("buildSoldOrderProfile: defensive on empty/garbage", () => {
  assert.equal(buildSoldOrderProfile(null).ordersProcessed, 0);
  assert.equal(buildSoldOrderProfile([{ no: "text" }]).ordersProcessed, 0);
});
