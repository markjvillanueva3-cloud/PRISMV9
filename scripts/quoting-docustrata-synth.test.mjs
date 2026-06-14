/**
 * quoting-docustrata-synth — iter20 unit test.
 *
 * Run: node --test scripts/quoting-docustrata-synth.test.mjs
 *
 * @milestone QUOTING-SYNERGY-MS0/U-QP-DOCUSTRATA-SYNTH (charlie /goal-yolo iter20)
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  deterministicHashUnit,
  generateSyntheticRevenueRecords,
} from "./quoting-docustrata-synth.mjs";
import { validateDocustrataPayload } from "./quoting-docustrata-format.mjs";
import { mergeDocustrataRevenue, buildRevenueKey } from "./quoting-docustrata-bridge.mjs";

// ---------- deterministicHashUnit ----------

test("deterministicHashUnit: returns value in [0,1)", () => {
  for (const s of ["ALCOA|p1", "ITW|p2", "BRADY|p3", "test"]) {
    const u = deterministicHashUnit(s);
    assert.ok(u >= 0 && u < 1, `${s} -> ${u} must be in [0,1)`);
  }
});

test("deterministicHashUnit: same string -> same hash (determinism)", () => {
  assert.equal(deterministicHashUnit("ALCOA|p1"), deterministicHashUnit("ALCOA|p1"));
  assert.equal(deterministicHashUnit("ITW|p2"), deterministicHashUnit("ITW|p2"));
});

test("deterministicHashUnit: different strings -> different hashes (collisions rare)", () => {
  const a = deterministicHashUnit("ALCOA|p1");
  const b = deterministicHashUnit("ALCOA|p2");
  const c = deterministicHashUnit("ITW|p1");
  assert.notEqual(a, b);
  assert.notEqual(a, c);
  assert.notEqual(b, c);
});

test("deterministicHashUnit: empty/non-string -> 0", () => {
  assert.equal(deterministicHashUnit(""), 0);
  assert.equal(deterministicHashUnit(null), 0);
  assert.equal(deterministicHashUnit(undefined), 0);
  assert.equal(deterministicHashUnit(42), 0);
});

// ---------- generateSyntheticRevenueRecords happy path ----------

test("generate: produces validator-compliant records-shape payload", () => {
  const baseline = [
    { customer: "ALCOA", part_id: "p1", estimated_time_in_cut_s: 1800, machine_rate_usd_per_hr: 95, estimated_material_spend_usd: 60 },
  ];
  const p = generateSyntheticRevenueRecords(baseline);
  assert.equal(p.schema_version, "1.0.0");
  assert.equal(p.source, "quoting-docustrata-synth");
  assert.equal(p.records.length, 1);
  // cost = (1800/3600)*95 + 60 = 47.5+60 = 107.5; markup ~ 0.40 ± 0.20 -> revenue ~ 129-150
  assert.ok(p.records[0].revenue > 100);
  assert.ok(p.records[0].revenue < 200);
});

// ---------- Revenue math correctness ----------

test("generate: revenue computed correctly with zero jitter", () => {
  const baseline = [
    { customer: "A", part_id: "p1", estimated_time_in_cut_s: 3600, machine_rate_usd_per_hr: 100, estimated_material_spend_usd: 50 },
  ];
  const p = generateSyntheticRevenueRecords(baseline, { baseMarkupPct: 0.50, jitterPct: 0 });
  // cost = (3600/3600)*100 + 50 = 150; markup 50% -> revenue = 225
  assert.equal(p.records[0].revenue, 225);
});

// ---------- Determinism: same input -> same output ----------

test("generate: deterministic (same input -> identical revenue)", () => {
  const baseline = [
    { customer: "ALCOA", part_id: "p1", estimated_time_in_cut_s: 1800, machine_rate_usd_per_hr: 95, estimated_material_spend_usd: 60 },
    { customer: "ITW", part_id: "p2", estimated_time_in_cut_s: 3600, machine_rate_usd_per_hr: 110, estimated_material_spend_usd: 35 },
  ];
  const p1 = generateSyntheticRevenueRecords(baseline);
  const p2 = generateSyntheticRevenueRecords(baseline);
  assert.equal(p1.records[0].revenue, p2.records[0].revenue);
  assert.equal(p1.records[1].revenue, p2.records[1].revenue);
});

// ---------- Variance: different customers/parts -> different revenues ----------

test("generate: 5-cohort produces revenue variance (variance test)", () => {
  const baseline = [
    { customer: "A", part_id: "p1", estimated_time_in_cut_s: 1800, machine_rate_usd_per_hr: 95, estimated_material_spend_usd: 60 },
    { customer: "B", part_id: "p2", estimated_time_in_cut_s: 1800, machine_rate_usd_per_hr: 95, estimated_material_spend_usd: 60 },
    { customer: "C", part_id: "p3", estimated_time_in_cut_s: 1800, machine_rate_usd_per_hr: 95, estimated_material_spend_usd: 60 },
    { customer: "D", part_id: "p4", estimated_time_in_cut_s: 1800, machine_rate_usd_per_hr: 95, estimated_material_spend_usd: 60 },
    { customer: "E", part_id: "p5", estimated_time_in_cut_s: 1800, machine_rate_usd_per_hr: 95, estimated_material_spend_usd: 60 },
  ];
  const p = generateSyntheticRevenueRecords(baseline);
  const revenues = p.records.map(r => r.revenue);
  const uniqueRevenues = new Set(revenues);
  // Same cost, different customer -> jitter splits them. Need >=3 distinct.
  assert.ok(uniqueRevenues.size >= 3, `must have >=3 distinct revenues across 5 cohort, got ${uniqueRevenues.size}`);
});

// ---------- Variance: distinct machine classes diverge ----------

test("generate: distinct machine_class cohorts -> distinct revenue ranges", () => {
  const baseline = [
    // mill: cost = 30min*95 + 60 = 107.5
    { customer: "A", part_id: "mill", estimated_time_in_cut_s: 1800, machine_rate_usd_per_hr: 95, estimated_material_spend_usd: 60 },
    // wire-edm: cost = 30min*110 + 35 = 90
    { customer: "A", part_id: "wedm", estimated_time_in_cut_s: 1800, machine_rate_usd_per_hr: 110, estimated_material_spend_usd: 35 },
    // 5-axis huge: cost = 120min*100 + 60 = 260
    { customer: "A", part_id: "5ax", estimated_time_in_cut_s: 7200, machine_rate_usd_per_hr: 100, estimated_material_spend_usd: 60 },
  ];
  const p = generateSyntheticRevenueRecords(baseline, { jitterPct: 0 });
  // 5-axis revenue should be >> wedm revenue
  const fiveAx = p.records.find(r => r.part_id === "5ax").revenue;
  const wedm = p.records.find(r => r.part_id === "wedm").revenue;
  assert.ok(fiveAx > wedm * 2, `5-axis ${fiveAx} should be >2x wedm ${wedm}`);
});

// ---------- Adversarial ----------

test("generate: empty baseline yields empty records[]", () => {
  const p = generateSyntheticRevenueRecords([]);
  assert.equal(p.records.length, 0);
  assert.equal(p.schema_version, "1.0.0");
});

test("generate: non-array input yields empty records[]", () => {
  for (const bad of [null, undefined, "not an array", 42, {}]) {
    const p = generateSyntheticRevenueRecords(bad);
    assert.equal(p.records.length, 0);
  }
});

test("generate: non-object rows skipped", () => {
  const baseline = [
    { customer: "A", part_id: "p1", estimated_time_in_cut_s: 1800, machine_rate_usd_per_hr: 95, estimated_material_spend_usd: 60 },
    null,
    "string",
    { customer: "B", part_id: "p2" },  // missing the rest -> uses defaults
  ];
  const p = generateSyntheticRevenueRecords(baseline);
  assert.equal(p.records.length, 2); // null + string dropped, defaults used for B
});

test("generate: missing customer/part_id rows dropped", () => {
  const baseline = [
    { customer: null, part_id: "p1" },
    { customer: "A", part_id: null },
    { customer: "B", part_id: "p2", estimated_time_in_cut_s: 1800, machine_rate_usd_per_hr: 95, estimated_material_spend_usd: 60 },
  ];
  const p = generateSyntheticRevenueRecords(baseline);
  assert.equal(p.records.length, 1);
  assert.equal(p.records[0].customer, "B");
});

test("generate: negative/NaN cycle time falls to default 1800s", () => {
  const baseline = [
    { customer: "A", part_id: "p1", estimated_time_in_cut_s: -100, machine_rate_usd_per_hr: 95, estimated_material_spend_usd: 60 },
    { customer: "B", part_id: "p2", estimated_time_in_cut_s: NaN, machine_rate_usd_per_hr: 95, estimated_material_spend_usd: 60 },
  ];
  const p = generateSyntheticRevenueRecords(baseline, { jitterPct: 0 });
  // Both fall to 1800s default, so revenue should be same modulo jitter (which is 0)
  // Default cost = 1800/3600 * 95 + 60 = 107.5; markup 40% -> 150.5
  assert.equal(p.records[0].revenue, 150.5);
  assert.equal(p.records[1].revenue, 150.5);
});

test("generate: minRevenue floor prevents tiny revenues", () => {
  const baseline = [{ customer: "A", part_id: "p1", estimated_time_in_cut_s: 0, machine_rate_usd_per_hr: 0, estimated_material_spend_usd: 0 }];
  // With all-zero cost AND zero markup adjustment, revenue would be 0; floor=1 ensures >=1
  const p = generateSyntheticRevenueRecords(baseline, { baseMarkupPct: 0, jitterPct: 0, minRevenue: 1 });
  assert.ok(p.records[0].revenue >= 1);
});

// ---------- INTEGRATION: synth -> validator (round-trip iter19 contract) ----------

test("integration: synth output PASSES iter19 validator", () => {
  const baseline = [
    { customer: "ALCOA", part_id: "p1", estimated_time_in_cut_s: 1800, machine_rate_usd_per_hr: 95, estimated_material_spend_usd: 60 },
    { customer: "ITW", part_id: "p2", estimated_time_in_cut_s: 3600, machine_rate_usd_per_hr: 110, estimated_material_spend_usd: 35 },
    { customer: "BRADY", part_id: "p3", estimated_time_in_cut_s: 7200, machine_rate_usd_per_hr: 85, estimated_material_spend_usd: 40 },
  ];
  const payload = generateSyntheticRevenueRecords(baseline);
  const v = validateDocustrataPayload(payload);
  assert.equal(v.valid, true, `validator must accept synth output. Errors: ${v.errors.join("; ")}`);
  assert.equal(v.normalized.size, 3);
});

// ---------- INTEGRATION: synth -> validator -> bridge (full chain) ----------

test("integration: synth -> validator -> bridge full chain matches all records", () => {
  const baseline = [
    { customer: "ALCOA", part_id: "p1", actual_revenue_usd: 10, estimated_time_in_cut_s: 1800, machine_rate_usd_per_hr: 95, estimated_material_spend_usd: 60, machine_class: "mill" },
    { customer: "ITW", part_id: "p2", actual_revenue_usd: 20, estimated_time_in_cut_s: 3600, machine_rate_usd_per_hr: 110, estimated_material_spend_usd: 35, machine_class: "wire-edm" },
  ];
  // 1. Generate synthetic revenues
  const synth = generateSyntheticRevenueRecords(baseline);
  // 2. Validate (normalizes to Map)
  const v = validateDocustrataPayload(synth);
  assert.equal(v.valid, true);
  // 3. Bridge applies override to baseline records
  const { records: merged, report } = mergeDocustrataRevenue(baseline, v.normalized);
  assert.equal(report.matched, 2, "all baseline records should match (synth derived FROM them)");
  assert.equal(report.unmatched, 0);
  for (const m of merged) {
    assert.equal(m.revenue_source, "docustrata");
    assert.ok(m.actual_revenue_usd > 10, "override should replace size-byte stub with synthetic revenue");
  }
});

// ---------- Custom markup + jitter overrides ----------

test("generate: opts.baseMarkupPct=0.10 yields tighter margin", () => {
  const baseline = [{ customer: "A", part_id: "p1", estimated_time_in_cut_s: 3600, machine_rate_usd_per_hr: 100, estimated_material_spend_usd: 50 }];
  const p = generateSyntheticRevenueRecords(baseline, { baseMarkupPct: 0.10, jitterPct: 0 });
  // cost=150, markup=10% -> revenue=165
  assert.equal(p.records[0].revenue, 165);
});

test("generate: opts.tsIso override stamps the payload", () => {
  const p = generateSyntheticRevenueRecords([], { tsIso: "2026-05-26T07:00:00.000Z" });
  assert.equal(p.generated_iso, "2026-05-26T07:00:00.000Z");
});

// ---------- Shape stability ----------

test("generate: payload has stable 4-key shape", () => {
  const p = generateSyntheticRevenueRecords([]);
  assert.deepEqual(Object.keys(p).sort(), ["generated_iso", "records", "schema_version", "source"]);
});

test("generate: each record has exact 3-key shape", () => {
  const p = generateSyntheticRevenueRecords([
    { customer: "A", part_id: "p1", estimated_time_in_cut_s: 1800, machine_rate_usd_per_hr: 95, estimated_material_spend_usd: 60 },
  ]);
  assert.deepEqual(Object.keys(p.records[0]).sort(), ["customer", "part_id", "revenue"]);
});
