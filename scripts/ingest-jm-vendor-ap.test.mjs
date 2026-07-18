/**
 * Tests for ingest-jm-vendor-ap.mjs — real-value assertions on actual rows from
 * Report_from_J.M._Tool__Die_LLC.pdf (880-page QuickBooks A/P). Run:
 *   node --test scripts/ingest-jm-vendor-ap.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isColumnHeader, isTotalLine, matchTxnType, isVendorHeader,
  parseTrailingQtyCost, classifySpend, parseLedger, buildVendorCostIndex, renderCostIndexMd,
} from "./ingest-jm-vendor-ap.mjs";

test("isColumnHeader / isTotalLine: page furniture", () => {
  assert.equal(isColumnHeader("Type Date Num Memo Name Item Qty Cost Price"), true);
  assert.equal(isTotalLine("Total A-SPECIAL ELECTRIC SERVICE 15"), true);
  assert.equal(isTotalLine("TOTAL 20736"), true);
  assert.equal(isColumnHeader("Bill 10/06/2014 139644 FLA ..."), false);
  assert.equal(isTotalLine("ABILITY WELDING SERVICE, INC."), false);
});

test("matchTxnType: longest-first, date-anchored", () => {
  assert.equal(matchTxnType("Bill 10/06/2014 139644 FLA 1 1 AMP FUSE ... MISC. 3 11.03"), "Bill");
  assert.equal(matchTxnType("Credit Card Charge 04/02/2024 42340 Calibration ... 1 30.00"), "Credit Card Charge");
  assert.equal(matchTxnType("Item Receipt 04/29/2026 7407 APP-30148S-1P ... 4 ..."), "Item Receipt");
  assert.equal(matchTxnType("Credit 05/01/2020 999 RETURN ... 1 -50.00"), "Credit");
  // a memo that merely starts with "Bill" but has no date is NOT a txn row
  assert.equal(matchTxnType("Bill of materials note for the shop"), null);
  assert.equal(matchTxnType("ABILITY WELDING SERVICE, INC."), null);
});

test("isVendorHeader: section headers vs rows/totals/furniture", () => {
  assert.equal(isVendorHeader("ABILITY WELDING SERVICE, INC."), true);
  assert.equal(isVendorHeader("A&G MECHANICAL"), true);
  assert.equal(isVendorHeader("ACCESS ONE"), true);
  assert.equal(isVendorHeader("Bill 10/06/2014 139644 FLA ... MISC. 3 11.03"), false, "txn row");
  assert.equal(isVendorHeader("Total ACCESS ONE 6"), false, "total");
  assert.equal(isVendorHeader("Type Date Num Memo Name Item Qty Cost Price"), false, "col header");
  assert.equal(isVendorHeader("10/06/2014"), false, "bare date");
  assert.equal(isVendorHeader(""), false);
  assert.equal(isVendorHeader("   "), false);
});

test("parseTrailingQtyCost: last two numerics = qty + unit cost", () => {
  const a = parseTrailingQtyCost("FLA 1 1 AMP FUSE A-SPECIAL ELECTRIC... MISC. 3 11.03");
  assert.equal(a.qty, 3);
  assert.equal(a.unitCost, 11.03);
  assert.ok(a.descr.includes("AMP FUSE"));
  // comma-grouped cost
  const b = parseTrailingQtyCost("599-766 BNS-27034-B ( PIOTR) AMERICAN CALIBRAT... EQUIP RE... 1 1,104.00");
  assert.equal(b.qty, 1);
  assert.equal(b.unitCost, 1104);
  // truncated cost ("...") → null cost, qty still recovered
  const c = parseTrailingQtyCost("APP-30148S-1P ARMOR COATED TEC... COAT-TiL... 4 ...");
  assert.equal(c.qty, 4);
  assert.equal(c.unitCost, null);
  // negative (credit/refund)
  const d = parseTrailingQtyCost("RETURN OF DEFECTIVE STOCK 1 -50.00");
  assert.equal(d.unitCost, -50);
  // HIGH-PRECISION per-unit material cost (ALRO STEEL D-2/H-13 bar: $/inch, 4-5 decimals).
  // This is the bug that nulled 4,585 real material rows when COST_RE demanded exactly 2 decimals.
  const e = parseTrailingQtyCost("1LNG 1-5/8 RD D-2 DCF ALRO STEEL STEEL 100 1.7125");
  assert.equal(e.qty, 100);
  assert.equal(e.unitCost, 1.7125);
  const f = parseTrailingQtyCost("2LNG 1X1-3/4 H-13 DCF ALRO STEEL STEEL 133 4.24098");
  assert.equal(f.qty, 133);
  assert.equal(f.unitCost, 4.24098);
});

test("classifySpend: real memos → correct cost category", () => {
  assert.equal(classifySpend("LARGE CARBIDE PARTS SILVER SOLDERED ABILITY WELDING SERVICE"), "outside-process");
  assert.equal(classifySpend("H13 PART WELDED"), "outside-process", "weld service beats material");
  assert.equal(classifySpend("APP-30148S-1P ARMOR COATED TEC COAT-TiCN"), "outside-process", "coating");
  assert.equal(classifySpend("Calibration of a Caliper AMERICAN CALIBRATION"), "inspection-quality");
  assert.equal(classifySpend("TOOL BITS AR-6 PCD ACCU-CUT"), "tooling-consumable");
  assert.equal(classifySpend("TELEPHONE PAYMENT ACCESS ONE"), "overhead-utility");
  assert.equal(classifySpend("UPS GROUND SHIPMENT"), "freight-shipping");
  assert.equal(classifySpend("4140 HR ROUND BAR STOCK"), "material");
  assert.equal(classifySpend("SCIENTIFIC METAL TREATING heat lot"), "outside-process", "metal-treating = heat treat");
  assert.equal(classifySpend("GRAPHITE EDM ELECTRODE BLANK"), "tooling-consumable", "EDM electrodes are consumable tooling");
  assert.equal(classifySpend("something with no keyword"), "misc");
});

test("parseLedger: vendor carried from section header; rows attributed; furniture skipped", () => {
  const raw = [
    "Type Date Num Memo Name Item Qty Cost Price",
    "ABILITY WELDING SERVICE, INC.",
    "Bill 07/16/2014 76541 LARGE CARBIDE PARTS SILVER SOLDERED ABILITY WELDING SE... MISC. 54 4.25",
    "Bill 07/30/2014 76611 H13 PART WELDED ABILITY WELDING SE... MISC. 1 60.00",
    "Total ABILITY WELDING SERVICE, INC. 2",
    "ACCESS ONE",
    "Bill 05/02/2014 1471433 TELEPHONE PAYMENT ACCESS ONE MISC. 1 529.03",
  ].join("\n");
  const { records, stats } = parseLedger(raw);
  assert.equal(records.length, 3);
  assert.equal(stats.vendors, 2);
  assert.equal(records[0].vendor, "ABILITY WELDING SERVICE, INC.");
  assert.equal(records[0].qty, 54);
  assert.equal(records[0].unit_cost, 4.25);
  assert.equal(records[0].line_amount, 229.5, "qty × unit_cost");
  assert.equal(records[0].category, "outside-process");
  assert.equal(records[2].vendor, "ACCESS ONE");
  assert.equal(records[2].category, "overhead-utility");
});

test("parseLedger: Item-Receipt null cost recorded + counted, not dropped (R12)", () => {
  const raw = [
    "ARMOR COATED TECHNOLOGY",
    "Item Receipt 04/29/2026 7407 APP-30148S-1P ARMOR COATED TEC... COAT-TiL... 4 ...",
    "Bill 04/29/2026 7407 APP-30148S-1P COATING SERVICE ARMOR COATED TEC... COAT-TiCN 4 12.50",
  ].join("\n");
  const { records, stats } = parseLedger(raw);
  assert.equal(records.length, 2);
  assert.equal(stats.nullCost, 1, "the receipt is counted, not silently dropped");
  assert.equal(records[0].unit_cost, null);
  assert.equal(records[0].line_amount, null);
  assert.equal(records[1].unit_cost, 12.5);
});

test("buildVendorCostIndex: credits subtract; unit-cost stats; category rollups", () => {
  const recs = [
    { vendor: "WELDCO", type: "Bill", date: "2014-01", description: "weld", qty: 10, unit_cost: 4, line_amount: 40, is_credit: false, category: "outside-process" },
    { vendor: "WELDCO", type: "Bill", date: "2014-02", description: "weld", qty: 1, unit_cost: 6, line_amount: 6, is_credit: false, category: "outside-process" },
    { vendor: "WELDCO", type: "Credit", date: "2014-03", description: "weld refund", qty: 1, unit_cost: 10, line_amount: 10, is_credit: true, category: "outside-process" },
  ];
  const idx = buildVendorCostIndex(recs);
  assert.equal(idx.totals.records, 3);
  assert.equal(idx.totals.grossSpend, 46);
  assert.equal(idx.totals.creditTotal, 10);
  assert.equal(idx.totals.netSpend, 36, "gross 46 - credits 10");
  assert.ok(idx.totals.netSpend <= idx.totals.grossSpend, "net must never exceed gross (credit-sign guard)");
  assert.equal(idx.totals.vendorCount, 1);
  const c = idx.categories["outside-process"];
  assert.equal(c.count, 3);
  assert.equal(c.unitCost.min, 4, "credits excluded from unit-cost sample");
  assert.equal(c.unitCost.max, 6);
  assert.equal(c.unitCost.n, 2);
});

test("buildVendorCostIndex: defensive on null / non-array", () => {
  assert.equal(buildVendorCostIndex(null).totals.records, 0);
  assert.equal(buildVendorCostIndex(42).totals.records, 0);
});

test("renderCostIndexMd: stable digest shape", () => {
  const idx = buildVendorCostIndex([
    { vendor: "WELDCO", type: "Bill", date: "2014-01", description: "weld", qty: 10, unit_cost: 4, line_amount: 40, is_credit: false, category: "outside-process" },
  ]);
  const md = renderCostIndexMd(idx, "2026-05-29");
  assert.ok(md.includes("JM-VENDOR-COST-INDEX"));
  assert.ok(md.includes("Spend by category"));
  assert.ok(md.includes("outside-process"));
  assert.ok(md.includes("quoting_secondary_ops_price"), "names the consuming action");
});
