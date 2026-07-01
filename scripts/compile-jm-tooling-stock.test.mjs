// node --test scripts/compile-jm-tooling-stock.test.mjs
// Real-value assertions on the line classifier — the load-bearing logic for the tooling/stock split.
import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyLine, extractMemo, promoteClass, parse } from "./compile-jm-tooling-stock.mjs";

test("classifyLine — steel grade + STEEL category → stock_material", () => {
  assert.equal(classifyLine("Bill 07/11/2019 G88 1 1/8 RD D-2 DCF ALRO STEEL... STEEL RO... 39 2.53"), "stock_material");
  assert.equal(classifyLine("Bill 07/31/2019 G88 1 3/8 RD D-2 DCF ALRO STEEL... STEEL RO... 80 1.74"), "stock_material");
  assert.equal(classifyLine("Bill 01/02/2020 123 H13 ROUND 2.5 OD CINCINNATI TOOL... STEEL RO... 1 5.00"), "stock_material");
});
test("classifyLine — carbide / tooling memo → tooling", () => {
  assert.equal(classifyLine("Bill 05/14/2014 76264 CARBIDE PARTS SILVER SOLDERED ABILITY... MISC. 1 114.00"), "tooling");
  assert.equal(classifyLine("Bill 03/01/2020 555 1/2 END MILL 4FL MICHIGAN CARBIDE... MISC. 6 22.00"), "tooling");
});
test("classifyLine — heat treat / maintenance → service_subcontract", () => {
  assert.equal(classifyLine("Bill 06/01/2020 999 HEAT TREAT D2 INSERTS SCIENTIFIC METAL... Subcontra... 1 50.00"), "service_subcontract");
  assert.equal(classifyLine("Bill 08/07/2014 946483 MAINTENANCE FEE A&G MECHANICAL... MISC. 1 210.00"), "service_subcontract");
});
test("classifyLine — fuse / coolant → shop_supply", () => {
  assert.equal(classifyLine("Bill 10/06/2014 139644 FLA 1 1 AMP FUSE A-SPECIAL ELECTRIC... MISC. 3 11.03"), "shop_supply");
});
test("classifyLine — unrecognized → other", () => {
  assert.equal(classifyLine("Bill 01/01/2020 100 GENERIC WIDGET XYZ VENDOR... MISC. 1 1.00"), "other");
});
test("classifyLine — steel category beats a tooling keyword (precedence)", () => {
  // a STEEL line that also says "MILL" must classify as stock_material, not tooling
  assert.equal(classifyLine("Bill 01/01/2020 100 H13 FOR MILL DIE ALRO STEEL... STEEL FL... 1 1.00"), "stock_material");
});
test("extractMemo — returns a non-empty cleaned snippet for a real bill line", () => {
  const m = extractMemo("Bill 05/14/2014 76264 CARBIDE PARTS SILVER SOLDERED ABILITY... MISC. 1 114.00");
  assert.ok(typeof m === "string");
  assert.ok(/CARBIDE/i.test(m), `expected memo to retain item desc, got: "${m}"`);
});
test("extractMemo — vendor-name-prefixed FIRST row → memo is the item desc, NOT the vendor name", () => {
  // QuickBooks prints each vendor block's first item row with the vendor name in the Type column.
  // Slicing after the date must yield the item ("MC5015 …"), never the leading vendor name.
  const m = extractMemo("GREGGA CARBIDE         08/02/2016   38993 MC5015 13PCS                GREGGA CARBIDE  STEEL  13  10.26615");
  assert.ok(/MC5015/i.test(m), `expected item desc, got: "${m}"`);
  assert.ok(!/^GREGGA/i.test(m), `vendor name leaked into memo: "${m}"`);
});
test("promoteClass — carbide house + spurious STEEL category + NO grade → tooling (recovers GREGGA-class)", () => {
  assert.equal(promoteClass({ pClass: "stock_material", steelCat: true, grade: null, vendorIsTooling: true, vendorIsService: false }), "tooling");
});
test("promoteClass — tool-named vendor WITH a real steel grade stays stock_material (no over-promote)", () => {
  assert.equal(promoteClass({ pClass: "stock_material", steelCat: true, grade: "H13", vendorIsTooling: true, vendorIsService: false }), "stock_material");
});
test("promoteClass — tooling house 'other' line → tooling", () => {
  assert.equal(promoteClass({ pClass: "other", steelCat: false, grade: null, vendorIsTooling: true, vendorIsService: false }), "tooling");
});
test("promoteClass — service house non-steel line → service_subcontract; STEEL-category line stays stock", () => {
  assert.equal(promoteClass({ pClass: "other", steelCat: false, grade: null, vendorIsTooling: false, vendorIsService: true }), "service_subcontract");
  assert.equal(promoteClass({ pClass: "stock_material", steelCat: true, grade: "D2", vendorIsTooling: false, vendorIsService: true }), "stock_material");
});
test("promoteClass — no vendor signal → class unchanged", () => {
  assert.equal(promoteClass({ pClass: "stock_material", steelCat: true, grade: "M2", vendorIsTooling: false, vendorIsService: false }), "stock_material");
  assert.equal(promoteClass({ pClass: "other", steelCat: false, grade: null, vendorIsTooling: false, vendorIsService: false }), "other");
});

// ---- parse()-level fixtures: the date-detector + flush logic (reviewer-A gap; the highest-risk new code) ----
// Mirrors the real pdftotext -layout shape: vendor-name-prefixed FIRST row, bare-date continuation rows,
// "Bill"-prefixed rows, and a `Total <vendor>` footer (which itself may carry a date on some vendors).
const FIXTURE = [
  "Accrual Basis",
  "Type        Date        Num    Memo                                  Vendor          Item      Qty   Cost",
  // single-transaction carbide house — its ONLY row is vendor-name-prefixed (the old /^Bill/ pass dropped it entirely)
  "GREGGA CARBIDE         08/02/2016   38993 MC5015 13PCS                GREGGA CARBIDE  STEEL     13    10.26",
  "     Bill",
  "Total GREGGA CARBIDE                                                  MISC.           13",
  // multi-item steel buy: first row vendor-prefixed, then bare-date continuation rows
  "GRIGGS STEEL           05/13/2014   177353  M-2 .500 DIA              GRIGGS STEEL    MISC.     40    5.79",
  "                       05/13/2014   177353  M-2 5/8 DIA               GRIGGS STEEL    STEEL",
  "     Bill              05/13/2014   177353  M-2 1-1/4 DIA             GRIGGS STEEL    STEEL     65    5.79",
  "Total GRIGGS STEEL                                                    STEEL           105",
  // a vendor whose footer carries a date (must NOT be counted as an item row)
  "Total CINTAS 769       05/02/2014                                     MISC.           1",
];

test("parse — vendor-name-prefixed first row is counted (single-txn vendor not dropped)", () => {
  const { tooling, itemLineTotal } = parse(FIXTURE.join("\n"));
  // GREGGA's one carbide row recovered → tooling (vendor-name promotion of a spurious-STEEL no-grade line)
  assert.ok(tooling.has("GREGGA CARBIDE"), "GREGGA CARBIDE must be captured as a tooling vendor");
  assert.equal(tooling.get("GREGGA CARBIDE").count, 1);
  // 4 item rows: GREGGA(1) + GRIGGS(3). The bare "Bill" line (no date) and the dated Total footer are NOT items.
  assert.equal(itemLineTotal, 4, `expected 4 item rows, got ${itemLineTotal}`);
});
test("parse — bare-date continuation rows are counted (multi-item bill not undercounted)", () => {
  const { stock } = parse(FIXTURE.join("\n"));
  // all 3 GRIGGS M-2 rows (incl. the bare-date continuation) land as M2 stock occurrences
  const m2 = [...stock.values()].find((e) => e.grade === "M2");
  assert.ok(m2, "M2 grade must be detected");
  assert.equal(m2.occurrences, 3, `expected 3 M-2 rows, got ${m2?.occurrences}`);
});
test("parse — a Total footer carrying a date is NOT double-counted as an item row", () => {
  const { vendorClass, itemLineTotal } = parse(FIXTURE.join("\n"));
  // CINTAS 769's footer has a date but contributes 0 item rows (it's a footer, matched+continue'd first)
  assert.equal(itemLineTotal, 4);
  // account-number suffix preserved (NOT merged/stripped) → distinct vendor key
  assert.ok([...vendorClass.keys()].includes("CINTAS 769"), "account-suffixed vendor name must be preserved verbatim");
});
