/**
 * quoting-docustrata-bridge — iter18 unit test.
 *
 * Run: node --test scripts/quoting-docustrata-bridge.test.mjs
 *
 * @milestone QUOTING-SYNERGY-MS0/U-QP-DOCUSTRATA-BRIDGE-SHIM (charlie /goal-yolo iter18)
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRevenueKey, mergeDocustrataRevenue } from "./quoting-docustrata-bridge.mjs";

// ---------- buildRevenueKey ----------

test("buildRevenueKey: happy path uppercases + delimits", () => {
  assert.equal(buildRevenueKey("ALCOA", "p1"), "ALCOA|P1");
});

test("buildRevenueKey: case-insensitive normalize", () => {
  assert.equal(buildRevenueKey("Alcoa", "P1"), "ALCOA|P1");
  assert.equal(buildRevenueKey("alcoa", "p1"), "ALCOA|P1");
});

test("buildRevenueKey: trims whitespace", () => {
  assert.equal(buildRevenueKey("  ALCOA  ", "  p1  "), "ALCOA|P1");
});

test("buildRevenueKey: rejects non-string", () => {
  assert.equal(buildRevenueKey(null, "p1"), null);
  assert.equal(buildRevenueKey("ALCOA", null), null);
  assert.equal(buildRevenueKey(undefined, undefined), null);
  assert.equal(buildRevenueKey(42, "p1"), null);
  assert.equal(buildRevenueKey({}, []), null);
});

test("buildRevenueKey: rejects empty/whitespace-only", () => {
  assert.equal(buildRevenueKey("", "p1"), null);
  assert.equal(buildRevenueKey("ALCOA", ""), null);
  assert.equal(buildRevenueKey("  ", "p1"), null);
});

// ---------- mergeDocustrataRevenue: happy path ----------

test("mergeDocustrataRevenue: matched records get override + flag", () => {
  const records = [
    { customer: "ALCOA", part_id: "p1", actual_revenue_usd: 10 },
    { customer: "ITW", part_id: "p2", actual_revenue_usd: 20 },
  ];
  const revenueMap = new Map([
    ["ALCOA|P1", 1500],
    ["ITW|P2", 2300],
  ]);
  const { records: out, report } = mergeDocustrataRevenue(records, revenueMap);
  assert.equal(out[0].actual_revenue_usd, 1500);
  assert.equal(out[0].revenue_source, "docustrata");
  assert.equal(out[1].actual_revenue_usd, 2300);
  assert.equal(out[1].revenue_source, "docustrata");
  assert.equal(report.matched, 2);
  assert.equal(report.match_rate_pct, 100);
  assert.equal(report.override_min, 1500);
  assert.equal(report.override_max, 2300);
});

// ---------- partial match (mixed cohort) ----------

test("mergeDocustrataRevenue: mixed cohort yields partial match", () => {
  const records = [
    { customer: "ALCOA", part_id: "p1", actual_revenue_usd: 10 },
    { customer: "ITW", part_id: "p2", actual_revenue_usd: 20 },
    { customer: "BRADY", part_id: "p3", actual_revenue_usd: 30 },
  ];
  const map = new Map([["ALCOA|P1", 1500]]);
  const { records: out, report } = mergeDocustrataRevenue(records, map);
  assert.equal(out[0].actual_revenue_usd, 1500);
  assert.equal(out[0].revenue_source, "docustrata");
  assert.equal(out[1].actual_revenue_usd, 20);  // stub preserved
  assert.equal(out[1].revenue_source, "stub");
  assert.equal(out[2].revenue_source, "stub");
  assert.equal(report.matched, 1);
  assert.equal(report.unmatched, 2);
  assert.equal(report.stub_preserved_count, 2);
  assert.ok(Math.abs(report.match_rate_pct - 33.3) < 0.5);
});

// ---------- failure mode 1: revenue map as plain object ----------

test("mergeDocustrataRevenue: accepts plain object as revenueMap (auto-coerce)", () => {
  const records = [{ customer: "ALCOA", part_id: "p1", actual_revenue_usd: 10 }];
  const { records: out, report } = mergeDocustrataRevenue(records, { "ALCOA|P1": 999 });
  assert.equal(out[0].actual_revenue_usd, 999);
  assert.equal(report.matched, 1);
});

// ---------- failure mode 2: case-insensitive key matching ----------

test("mergeDocustrataRevenue: case-insensitive key match (record case != map case)", () => {
  const records = [{ customer: "Alcoa", part_id: "p1", actual_revenue_usd: 10 }];
  const map = new Map([["ALCOA|P1", 555]]); // pre-uppercased
  const { records: out } = mergeDocustrataRevenue(records, map);
  assert.equal(out[0].actual_revenue_usd, 555);
});

// ---------- failure mode 3: minRevenue floor rejects zero/negative ----------

test("mergeDocustrataRevenue: minRevenue floor rejects below-threshold candidates", () => {
  const records = [
    { customer: "A", part_id: "p1", actual_revenue_usd: 10 },
    { customer: "B", part_id: "p2", actual_revenue_usd: 20 },
  ];
  const map = new Map([["A|P1", 0], ["B|P2", 500]]); // A=0 should be rejected
  const { records: out, report } = mergeDocustrataRevenue(records, map, { minRevenue: 1 });
  assert.equal(out[0].actual_revenue_usd, 10); // stub preserved
  assert.equal(out[0].revenue_source, "stub");
  assert.equal(out[1].actual_revenue_usd, 500);
  assert.equal(report.rejected_below_min, 1);
});

test("mergeDocustrataRevenue: negative revenue rejected by default floor (1)", () => {
  const records = [{ customer: "A", part_id: "p1", actual_revenue_usd: 10 }];
  const map = new Map([["A|P1", -100]]);
  const { records: out, report } = mergeDocustrataRevenue(records, map);
  assert.equal(out[0].actual_revenue_usd, 10);
  assert.equal(report.rejected_below_min, 1);
});

// ---------- adversarial 1: NaN/Infinity revenue ignored ----------

test("mergeDocustrataRevenue: NaN/Infinity revenue ignored (not Number.isFinite)", () => {
  const records = [
    { customer: "A", part_id: "p1", actual_revenue_usd: 10 },
    { customer: "B", part_id: "p2", actual_revenue_usd: 20 },
  ];
  const map = new Map([["A|P1", NaN], ["B|P2", Infinity]]);
  const { records: out, report } = mergeDocustrataRevenue(records, map);
  assert.equal(out[0].actual_revenue_usd, 10);
  assert.equal(out[1].actual_revenue_usd, 20);
  assert.equal(report.matched, 0);
});

// ---------- adversarial 2: non-array records / null map ----------

test("mergeDocustrataRevenue: non-array records yields empty", () => {
  const { records: out, report } = mergeDocustrataRevenue(null, new Map());
  assert.deepEqual(out, []);
  assert.equal(report.total, 0);
  assert.equal(report.match_rate_pct, 0);
});

test("mergeDocustrataRevenue: null revenueMap yields all-stub", () => {
  const records = [{ customer: "A", part_id: "p1", actual_revenue_usd: 10 }];
  const { records: out, report } = mergeDocustrataRevenue(records, null);
  assert.equal(out[0].revenue_source, "stub");
  assert.equal(report.matched, 0);
});

test("mergeDocustrataRevenue: non-object record entries pass through unchanged", () => {
  const records = [null, undefined, "string", 42, { customer: "A", part_id: "p1", actual_revenue_usd: 10 }];
  const { records: out, report } = mergeDocustrataRevenue(records, new Map());
  assert.equal(out.length, 5);
  assert.equal(report.total, 5);
});

// ---------- adversarial 3: bad customer/part_id values ----------

test("mergeDocustrataRevenue: record with null customer falls to stub", () => {
  const records = [{ customer: null, part_id: "p1", actual_revenue_usd: 10 }];
  const { records: out, report } = mergeDocustrataRevenue(records, new Map([["NULL|P1", 500]]));
  assert.equal(out[0].revenue_source, "stub");
  assert.equal(report.unmatched, 1);
});

// ---------- non-mutation: original input unchanged ----------

test("mergeDocustrataRevenue: does NOT mutate input records", () => {
  const records = [{ customer: "A", part_id: "p1", actual_revenue_usd: 10 }];
  const original = JSON.stringify(records);
  mergeDocustrataRevenue(records, new Map([["A|P1", 999]]));
  assert.equal(JSON.stringify(records), original);
});

// ---------- variability: 3+ scenarios in one assert ----------

test("mergeDocustrataRevenue: realistic variability — match/stub/rejected coexist", () => {
  const records = [
    { customer: "ALCOA", part_id: "p1", actual_revenue_usd: 10, machine_class: "mill" },
    { customer: "ITW", part_id: "p2", actual_revenue_usd: 20, machine_class: "wire-edm" },
    { customer: "BRADY", part_id: "p3", actual_revenue_usd: 30, machine_class: "lathe" },
    { customer: "SFS", part_id: "p4", actual_revenue_usd: 40, machine_class: "mill" },
    { customer: "HOLO-KROME", part_id: "p5", actual_revenue_usd: 50, machine_class: "grinder" },
  ];
  const map = new Map([
    ["ALCOA|P1", 2500],
    ["ITW|P2", 0.5],        // below default minRevenue=1, rejected
    ["BRADY|P3", 1800],
    // SFS p4 + HOLO-KROME p5 missing -> stub
  ]);
  const { records: out, report } = mergeDocustrataRevenue(records, map);
  assert.equal(report.matched, 2);          // ALCOA + BRADY
  assert.equal(report.unmatched, 3);         // ITW (rejected) + SFS + HOLO-KROME
  assert.equal(report.rejected_below_min, 1); // ITW
  assert.equal(report.stub_preserved_count, 3);
  assert.equal(report.override_min, 1800);
  assert.equal(report.override_max, 2500);
  assert.ok(report.match_rate_pct > 39 && report.match_rate_pct < 41); // 40%
});

// ---------- shape stability ----------

test("mergeDocustrataRevenue: report has stable 9-key shape", () => {
  const { report } = mergeDocustrataRevenue([], new Map());
  assert.deepEqual(Object.keys(report).sort(), [
    "match_rate_pct",
    "matched",
    "min_revenue_threshold",
    "override_max",
    "override_min",
    "rejected_below_min",
    "stub_preserved_count",
    "total",
    "unmatched",
  ]);
});

// ---------- override flag preserves other fields ----------

test("mergeDocustrataRevenue: matched record preserves all non-revenue fields", () => {
  const r = {
    customer: "A",
    part_id: "p1",
    doc_date: "2026-05-26",
    actual_revenue_usd: 10,
    estimated_time_in_cut_s: 3600,
    machine_rate_usd_per_hr: 110,
    estimated_material_spend_usd: 35,
    machine_class: "wire-edm",
  };
  const { records: out } = mergeDocustrataRevenue([r], new Map([["A|P1", 999]]));
  assert.equal(out[0].actual_revenue_usd, 999);
  assert.equal(out[0].revenue_source, "docustrata");
  // All other fields preserved:
  assert.equal(out[0].estimated_time_in_cut_s, 3600);
  assert.equal(out[0].machine_rate_usd_per_hr, 110);
  assert.equal(out[0].machine_class, "wire-edm");
  assert.equal(out[0].doc_date, "2026-05-26");
});
