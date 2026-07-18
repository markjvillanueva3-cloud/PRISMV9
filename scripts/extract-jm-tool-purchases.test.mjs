/**
 * Tests for extract-jm-tool-purchases.mjs — VENDOR-NETWORK-MS0/U-VDN-JM-TOOLS.
 * Real-value assertions on tool-type classification + purchase aggregation.
 * Run: node --test scripts/extract-jm-tool-purchases.test.mjs < /dev/null
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyToolType,
  normalizeToolVendorId,
  aggregateToolPurchases,
  renderToolProfileMd,
  TOOL_TYPE_RULES,
} from "./extract-jm-tool-purchases.mjs";

test("classifyToolType: maps real JM A/P descriptions to cutting-tool types", () => {
  assert.equal(classifyToolType("1/2 4FL CARBIDE END MILL"), "end-mill");
  assert.equal(classifyToolType("BALL NOSE EM .250"), "end-mill");
  assert.equal(classifyToolType("#7 JOBBER DRILL HSS"), "drill");
  assert.equal(classifyToolType("M6 X 1.0 SPIRAL TAP"), "tap");
  assert.equal(classifyToolType('1/4" CHUCKING REAMER'), "reamer");
  assert.equal(classifyToolType("CNMG 432 INSERT IC907"), "insert");
  assert.equal(classifyToolType("THREAD MILL .5-13 UN"), "thread-mill");
  assert.equal(classifyToolType("TOOL BITS AR-6 PCD ACCU-CUT"), "tool-bit");
  assert.equal(classifyToolType("CBN GRINDING WHEEL 7in"), "grinding-wheel");
  assert.equal(classifyToolType("82DEG COUNTERSINK"), "countersink");
  assert.equal(classifyToolType("SOMETHING UNRECOGNIZED XYZ"), "misc-tooling");
  assert.equal(classifyToolType(""), "misc-tooling");
  assert.equal(classifyToolType(null), "misc-tooling");
});

test("classifyToolType: carbide BLANK / die-stock (JM die-shop reality) separated from cutting tools", () => {
  // real JM A/P carbide-blank descriptions — die MATERIAL, not catalog cutting tools
  assert.equal(classifyToolType("MC20 1.365X080X3.000 MICHIGAN CARBIDE CARBIDE"), "carbide-blank");
  assert.equal(classifyToolType("CENTERLESS GROUND CARBIDE 1.500X0.0800X1.0"), "carbide-blank");
  assert.equal(classifyToolType("CARBIDE CREATIVE CARBIDE CARBIDE"), "carbide-blank");
  assert.equal(classifyToolType("5#45 BROWN SYNTHETIC DIAMOND COMPOUND"), "carbide-blank");
  // but a real cutting tool made OF carbide still classifies by its tool type (ordering guard)
  assert.equal(classifyToolType("1/2 CARBIDE END MILL 4FL"), "end-mill");
  assert.equal(classifyToolType("CARBIDE JOBBER DRILL"), "drill");
});

test("classifyToolType: thread-mill beats tap+mill, tap beats end-mill (ordering)", () => {
  // a description with both "thread" and "mill" must be thread-mill, not end-mill
  assert.equal(classifyToolType("THREADMILL CARBIDE"), "thread-mill");
  // "tapping" should be tap even if other words present
  assert.equal(classifyToolType("TAPPING HEAD COLLET"), "tap");
});

test("normalizeToolVendorId: UPPERCASE A/P name -> kebab id matching directory", () => {
  assert.equal(normalizeToolVendorId("ACCU-CUT"), "accu-cut");
  assert.equal(normalizeToolVendorId("KENNAMETAL"), "kennametal");
  assert.equal(normalizeToolVendorId("M.A. FORD & CO"), "m-a-ford-and-co");
  assert.equal(normalizeToolVendorId("  OSG  "), "osg");
  assert.equal(normalizeToolVendorId(""), "unknown");
  assert.equal(normalizeToolVendorId(null), "unknown");
});

test("aggregateToolPurchases: filters to tooling, sums spend, groups by type+vendor", () => {
  const records = [
    { vendor: "GARR TOOL", description: "1/2 4FL CARBIDE END MILL", qty: 5, unit_cost: 40, is_credit: false },
    { vendor: "GARR TOOL", description: "#7 JOBBER DRILL", qty: 10, unit_cost: 8, is_credit: false },
    { vendor: "OSG", description: "M6 SPIRAL TAP", qty: 4, unit_cost: 12, is_credit: false },
    { vendor: "ALRO STEEL", description: "4140 STEEL BAR 2IN", qty: 1, unit_cost: 500, is_credit: false }, // material → excluded
    { vendor: "FEDEX", description: "FREIGHT", qty: 1, unit_cost: 30, is_credit: false }, // not a tool → excluded
  ];
  const p = aggregateToolPurchases(records);
  assert.equal(p.totalToolLineItems, 3, "only the 3 cutting-tool rows counted");
  assert.equal(p.totalToolSpend, 5 * 40 + 10 * 8 + 4 * 12, "spend = 200+80+48 = 328");
  assert.equal(p.byType["end-mill"].count, 1);
  assert.equal(p.byType["end-mill"].spend, 200);
  assert.equal(p.byType["drill"].spend, 80);
  assert.equal(p.byType["tap"].spend, 48);
  const garr = p.topVendorsBySpend.find((v) => v.vendor_id === "garr-tool");
  assert.equal(garr.spend, 280, "Garr = endmill 200 + drill 80");
  assert.equal(garr.count, 2);
  assert.equal(p.topVendorsBySpend[0].vendor_id, "garr-tool", "highest-spend vendor sorts first");
  assert.ok(p.jm_tool_vendors.includes("garr-tool") && p.jm_tool_vendors.includes("osg"));
  assert.ok(!p.jm_tool_vendors.includes("alro-steel"), "material vendor not a tool vendor");
});

test("aggregateToolPurchases: catalog_tool_spend separates real cutting tools from carbide-blank/die material (R12)", () => {
  const records = [
    { vendor: "GARR TOOL", description: "1/2 CARBIDE END MILL", qty: 5, unit_cost: 40, is_credit: false }, // catalog tool
    { vendor: "MICHIGAN CARBIDE", description: "MC20 1.000X060X3.000", qty: 5, unit_cost: 100, is_credit: false }, // die blank
    { vendor: "MICHIGAN CARBIDE", description: "CENTERLESS GROUND CARBIDE 1.5X0.08X2.0", qty: 2, unit_cost: 50, is_credit: false }, // die blank
  ];
  const p = aggregateToolPurchases(records);
  const garr = p.topVendorsBySpend.find((v) => v.vendor_id === "garr-tool");
  assert.equal(garr.catalog_tool_spend, 200, "Garr end mill = catalog cutting-tool spend");
  const mich = p.topVendorsBySpend.find((v) => v.vendor_id === "michigan-carbide");
  assert.ok(mich.spend > 0, "Michigan Carbide has tool-bucket spend (the 'carbide' token)");
  assert.equal(mich.catalog_tool_spend, 0, "but ZERO catalog cutting-tool spend — it's a die-blank supplier, no S/F");
});

test("aggregateToolPurchases: credits subtract from spend; qty defaults to 1", () => {
  const records = [
    { vendor: "OSG", description: "TAP", qty: 10, unit_cost: 10, is_credit: false },
    { vendor: "OSG", description: "TAP RETURN", qty: 2, unit_cost: 10, is_credit: true },
    { vendor: "OSG", description: "REAMER", qty: null, unit_cost: 25, is_credit: false }, // qty null → counts as 1
  ];
  const p = aggregateToolPurchases(records);
  // 100 (10x10) - 20 (credit 2x10) + 25 (reamer x1) = 105
  assert.equal(p.totalToolSpend, 105);
  assert.equal(p.totalQty, 10, "credits + null-qty excluded from qty total");
});

test("aggregateToolPurchases: defensive on empty/null/garbage", () => {
  assert.equal(aggregateToolPurchases(null).totalToolLineItems, 0);
  assert.equal(aggregateToolPurchases([]).totalToolSpend, 0);
  assert.equal(aggregateToolPurchases([{ junk: 1 }]).totalToolLineItems, 0);
});

test("renderToolProfileMd + TOOL_TYPE_RULES: real digest + catch-all last", () => {
  // the final rule must be the catch-all so every description classifies
  assert.equal(TOOL_TYPE_RULES[TOOL_TYPE_RULES.length - 1][0], "misc-tooling");
  const p = aggregateToolPurchases([{ vendor: "GARR TOOL", description: "END MILL", qty: 1, unit_cost: 50, is_credit: false }]);
  const md = renderToolProfileMd(p, "2026-05-29");
  assert.ok(md.includes("JM-TOOL-PURCHASES"));
  assert.ok(md.includes("Tool spend by TYPE"));
  assert.ok(md.includes("SFC extraction priority order"));
  assert.ok(md.includes("GARR TOOL"));
});
