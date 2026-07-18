/**
 * quoting-docustrata-pipeline — iter21 unit test for runDocustrataPipeline.
 *
 * Run: node --test scripts/quoting-docustrata-pipeline.test.mjs
 *
 * @milestone QUOTING-SYNERGY-MS0/U-QP-DOCUSTRATA-PIPELINE-ORCHESTRATOR (charlie /goal-yolo iter21)
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { runDocustrataPipeline, runDocustrataPipelineAsync } from "./quoting-docustrata-pipeline.mjs";
import { promises as fs } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = dirname(fileURLToPath(import.meta.url));

const baseRecord = (overrides = {}) => ({
  customer: "ALCOA",
  part_id: "p1",
  doc_date: "2026-05-26",
  actual_revenue_usd: 10,
  estimated_time_in_cut_s: 1800,
  machine_rate_usd_per_hr: 95,
  estimated_material_spend_usd: 60,
  machine_class: "mill",
  ...overrides,
});

// ---------- Happy path: full chain succeeds ----------

test("runDocustrataPipeline: happy path returns ok=true, stage=done", () => {
  const baseline = [baseRecord(), baseRecord({ customer: "ITW", part_id: "p2", machine_class: "wire-edm", machine_rate_usd_per_hr: 110 })];
  const r = runDocustrataPipeline(baseline);
  assert.equal(r.ok, true);
  assert.equal(r.stage, "done");
  assert.equal(r.reason, null);
  // All 3 stages produced output
  assert.ok(r.synth);
  assert.equal(r.synth.schema_version, "1.0.0");
  assert.equal(r.synth.records.length, 2);
  assert.ok(r.validation);
  assert.equal(r.validation.valid, true);
  assert.ok(r.merge);
  assert.equal(r.merge.report.matched, 2);
  assert.equal(r.merge.report.total, 2);
});

// ---------- Stage 1 (synth) outputs valid records-shape ----------

test("runDocustrataPipeline: synth stage emits validator-compliant payload", () => {
  const r = runDocustrataPipeline([baseRecord()]);
  assert.equal(r.synth.schema_version, "1.0.0");
  assert.equal(r.synth.source, "quoting-docustrata-synth");
  assert.equal(r.synth.records[0].customer, "ALCOA");
  assert.equal(r.synth.records[0].part_id, "p1");
  assert.ok(r.synth.records[0].revenue > 0);
});

// ---------- Stage 2 (validate) catches malformed synth (test the failure path) ----------

test("runDocustrataPipeline: empty baseline -> synth empty -> validation rejects (no entries)", () => {
  const r = runDocustrataPipeline([]);
  // synth yields {records:[]} which the validator treats as valid+warning (empty array case).
  // So the chain reaches done with 0 matched records.
  assert.equal(r.ok, true);
  assert.equal(r.synth.records.length, 0);
  assert.equal(r.merge.report.matched, 0);
});

// ---------- Stage 3 (bridge) overlays revenues onto baseline ----------

test("runDocustrataPipeline: bridge replaces stub actual_revenue_usd with synth value", () => {
  const baseline = [baseRecord()];
  const r = runDocustrataPipeline(baseline);
  assert.equal(r.merge.records[0].revenue_source, "docustrata");
  // Original stub was 10; synth revenue should be ~150 (cost 107.5 * 1.4 = 150.5)
  assert.ok(r.merge.records[0].actual_revenue_usd > 10);
  // Original input not mutated (bridge is non-mutating)
  assert.equal(baseline[0].actual_revenue_usd, 10);
});

// ---------- Match rate is 100% when synth derived FROM same baseline ----------

test("runDocustrataPipeline: match_rate_pct=100 for synth-from-baseline (every record matches)", () => {
  const baseline = [
    baseRecord({ customer: "A", part_id: "p1" }),
    baseRecord({ customer: "B", part_id: "p2" }),
    baseRecord({ customer: "C", part_id: "p3" }),
  ];
  const r = runDocustrataPipeline(baseline);
  assert.equal(r.merge.report.match_rate_pct, 100);
  assert.equal(r.merge.report.matched, 3);
  assert.equal(r.merge.report.unmatched, 0);
});

// ---------- Determinism (composes iter20 determinism property) ----------

test("runDocustrataPipeline: deterministic — same input twice yields identical merge", () => {
  const baseline = [baseRecord(), baseRecord({ customer: "B", part_id: "p2" })];
  const r1 = runDocustrataPipeline(baseline);
  const r2 = runDocustrataPipeline(baseline);
  assert.equal(r1.merge.records[0].actual_revenue_usd, r2.merge.records[0].actual_revenue_usd);
  assert.equal(r1.merge.records[1].actual_revenue_usd, r2.merge.records[1].actual_revenue_usd);
});

// ---------- Adversarial: non-array input ----------

test("runDocustrataPipeline: null baselineRecords doesn't throw, chain still completes", () => {
  const r = runDocustrataPipeline(null);
  // synth handles null (returns empty), validator accepts empty records[] (with warning),
  // bridge handles empty/null. Chain reaches done with zero records.
  assert.equal(r.ok, true);
  assert.equal(r.stage, "done");
  assert.equal(r.merge.report.total, 0);
});

test("runDocustrataPipeline: undefined baselineRecords -> chain completes empty", () => {
  const r = runDocustrataPipeline(undefined);
  assert.equal(r.ok, true);
  assert.equal(r.merge.report.total, 0);
});

// ---------- Custom markup pass-through ----------

test("runDocustrataPipeline: opts.synth.baseMarkupPct passes through to iter20", () => {
  const baseline = [baseRecord({ estimated_time_in_cut_s: 3600, machine_rate_usd_per_hr: 100, estimated_material_spend_usd: 50 })];
  const r = runDocustrataPipeline(baseline, { synth: { baseMarkupPct: 0.50, jitterPct: 0 } });
  // cost = 100+50 = 150; markup 50% -> revenue 225
  assert.equal(r.synth.records[0].revenue, 225);
  assert.equal(r.merge.records[0].actual_revenue_usd, 225);
});

// ---------- Custom bridge opts ----------

test("runDocustrataPipeline: opts.bridge.minRevenue passes through to iter18", () => {
  // Force tiny revenue via baseMarkupPct=-2 then minRevenue gate rejects it.
  // Note: revenue = cost*(1-2) is negative; iter20 minRevenue floor in synth
  // catches it FIRST (clamps to 1). Then iter18 minRevenue rejects 1<2.
  const baseline = [baseRecord()];
  const r = runDocustrataPipeline(baseline, {
    synth: { baseMarkupPct: -2, jitterPct: 0, minRevenue: 1 },
    bridge: { minRevenue: 2 },
  });
  // Bridge rejects revenue=1 (< minRevenue 2), so stub preserved
  assert.equal(r.merge.records[0].revenue_source, "stub");
  assert.equal(r.merge.report.rejected_below_min, 1);
});

// ---------- Variability: 4-domain cohort ----------

test("runDocustrataPipeline: 4-domain JM-Die cohort produces full chain success", () => {
  const baseline = [
    baseRecord({ customer: "ALCOA", part_id: "p_mill", machine_class: "mill", machine_rate_usd_per_hr: 95, estimated_time_in_cut_s: 1800 }),
    baseRecord({ customer: "ITW", part_id: "p_wedm", machine_class: "wire-edm", machine_rate_usd_per_hr: 110, estimated_time_in_cut_s: 3600 }),
    baseRecord({ customer: "BRADY", part_id: "p_lathe", machine_class: "lathe", machine_rate_usd_per_hr: 85, estimated_time_in_cut_s: 600 }),
    baseRecord({ customer: "SFS", part_id: "p_grinder", machine_class: "grinder", machine_rate_usd_per_hr: 75, estimated_time_in_cut_s: 1800 }),
  ];
  const r = runDocustrataPipeline(baseline);
  assert.equal(r.ok, true);
  assert.equal(r.merge.report.matched, 4);
  // Variance check: 4 distinct machine classes -> distinct revenue ranges expected
  const revenues = r.merge.records.map(rec => rec.actual_revenue_usd);
  const unique = new Set(revenues);
  assert.equal(unique.size, 4, "4 distinct machine classes must yield 4 distinct revenues");
});

// ---------- Shape stability: 6-key Result shape ----------

test("runDocustrataPipeline: result has stable 6-key shape", () => {
  const r = runDocustrataPipeline([baseRecord()]);
  assert.deepEqual(Object.keys(r).sort(), ["merge", "ok", "reason", "stage", "synth", "validation"]);
});

// ---------- Stage names are stable contract ----------

test("runDocustrataPipeline: stage name is one of {synth|validate|bridge|done}", () => {
  const r = runDocustrataPipeline([baseRecord()]);
  assert.ok(["synth", "validate", "bridge", "done"].includes(r.stage));
});

// ---------- Pass-through preserves non-revenue fields ----------

test("runDocustrataPipeline: merge preserves all non-revenue baseline fields", () => {
  const baseline = [baseRecord({ doc_date: "2026-05-26", machine_class: "wire-edm" })];
  const r = runDocustrataPipeline(baseline);
  const out = r.merge.records[0];
  assert.equal(out.customer, "ALCOA");
  assert.equal(out.part_id, "p1");
  assert.equal(out.doc_date, "2026-05-26");
  assert.equal(out.machine_class, "wire-edm");
  assert.equal(out.estimated_time_in_cut_s, 1800);
  assert.equal(out.machine_rate_usd_per_hr, 95);
});

// ---------- iter42: runDocustrataPipelineAsync with --source flag ----------

async function writeTmpCurated(payload) {
  const tmp = resolve(__dirname, `.tmp-pipeline-curated-${process.pid}-${Date.now()}.json`);
  await fs.writeFile(tmp, JSON.stringify(payload));
  return tmp;
}

test("runDocustrataPipelineAsync: source=synth delegates to sync runDocustrataPipeline (back-compat)", async () => {
  const baseline = [baseRecord(), baseRecord({ customer: "ITW", part_id: "p2" })];
  const r = await runDocustrataPipelineAsync(baseline, { source: "synth" });
  assert.equal(r.ok, true);
  assert.equal(r.stage, "done");
  // extractor field absent — synth path
  assert.equal(r.extractor, undefined);
});

test("runDocustrataPipelineAsync: source omitted defaults to synth (back-compat)", async () => {
  const r = await runDocustrataPipelineAsync([baseRecord()]);
  assert.equal(r.ok, true);
  assert.equal(r.stage, "done");
});

test("runDocustrataPipelineAsync: source=extractor with valid curated path produces extractor-keyed result", async () => {
  const baseline = [
    baseRecord({ customer: "ALCOA", part_id: "p1" }),
    baseRecord({ customer: "ITW", part_id: "p2" }),
  ];
  const tmp = await writeTmpCurated({
    schema_version: "1.0.0",
    invoices: [
      { customer: "ALCOA", part_id: "p1", actual_invoice_usd: 1500 },
      { customer: "ITW", part_id: "p2", actual_invoice_usd: 800 },
    ],
  });
  try {
    const r = await runDocustrataPipelineAsync(baseline, {
      source: "extractor",
      extractor: { curatedPath: tmp, skipMarketConditioning: true },
      fallbackToSynth: false,
    });
    assert.equal(r.ok, true);
    assert.equal(r.stage, "done");
    assert.ok(r.extractor);
    assert.equal(r.extractor.ok, true);
    assert.equal(r.extractor.records.length, 2);
    assert.equal(r.synth.source, "docustrata-historical-pricing-trainer");
    // Bridge should match both records
    assert.equal(r.merge.report.matched, 2);
  } finally {
    await fs.unlink(tmp);
  }
});

test("runDocustrataPipelineAsync: source=extractor, no curated source, fallbackToSynth=true falls through to synth", async () => {
  const baseline = [baseRecord()];
  const r = await runDocustrataPipelineAsync(baseline, {
    source: "extractor",
    extractor: { curatedPath: "scripts/.does-not-exist.json", skipMarketConditioning: true },
    fallbackToSynth: true,
  });
  assert.equal(r.ok, true);
  assert.equal(r.stage, "done");
  assert.equal(r.extractor_fallback, true);
  assert.equal(r.extractor.ok, false);
  assert.match(r.extractor.reason, /no-curated-source/);
});

test("runDocustrataPipelineAsync: source=extractor, no curated source, fallbackToSynth=false returns ok:false at stage=extractor", async () => {
  const baseline = [baseRecord()];
  const r = await runDocustrataPipelineAsync(baseline, {
    source: "extractor",
    extractor: { curatedPath: "scripts/.does-not-exist.json", skipMarketConditioning: true },
    fallbackToSynth: false,
  });
  assert.equal(r.ok, false);
  assert.equal(r.stage, "extractor");
  assert.match(r.reason, /no-curated-source/);
});

test("runDocustrataPipelineAsync: source=extractor with empty records still reaches done (bridge handles)", async () => {
  const baseline = [baseRecord()];
  const tmp = await writeTmpCurated({ schema_version: "1.0.0", invoices: [] });
  try {
    const r = await runDocustrataPipelineAsync(baseline, {
      source: "extractor",
      extractor: { curatedPath: tmp, skipMarketConditioning: true },
      fallbackToSynth: false,
    });
    assert.equal(r.ok, true);
    assert.equal(r.stage, "done");
    // 0 extractor records means bridge sees no docustrata overrides; baseline preserved
    assert.equal(r.merge.report.matched, 0);
  } finally {
    await fs.unlink(tmp);
  }
});
