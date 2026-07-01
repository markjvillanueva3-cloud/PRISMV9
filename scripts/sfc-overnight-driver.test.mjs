/**
 * R9 tests for the pure helpers of sfc-overnight-driver.mjs (U-OSC-OVERNIGHT-SWEEP).
 * Importing the module does NOT run main() (it is guarded by `process.argv[1] === SELF`), so the
 * exported pure functions can be unit-tested in isolation. Run: node scripts/sfc-overnight-driver.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDriverArgs, gridSchedule, mergeShardSummaries, renderSummaryMd } from "./sfc-overnight-driver.mjs";

test("gridSchedule parses, dedupes, sorts ascending, drops <2 and non-int", () => {
  assert.deepEqual(gridSchedule("16,24,36"), [16, 24, 36]);
  assert.deepEqual(gridSchedule("36,16,24,16"), [16, 24, 36]); // dedupe + sort
  assert.deepEqual(gridSchedule("1,2,3,x,"), [2, 3]); // drop <2 and non-int
  assert.deepEqual(gridSchedule("6"), [6]);
});

test("parseDriverArgs: --smoke shrinks the run and disables vendor/dataset", () => {
  const a = parseDriverArgs(["--smoke"]);
  assert.equal(a.smoke, true);
  assert.equal(a.shards, 2);
  assert.deepEqual(a.grids, [6]);
  assert.equal(a.maxPerShard, 400);
  assert.equal(a.vendor, false); // smoke disables the heavy vendor compare
  assert.equal(a.dataset, false);
});

test("parseDriverArgs: explicit flags override defaults", () => {
  const a = parseDriverArgs(["--shards", "12", "--grids", "8,16", "--max-per-shard", "5000", "--no-vendor"]);
  assert.equal(a.shards, 12);
  assert.deepEqual(a.grids, [8, 16]);
  assert.equal(a.maxPerShard, 5000);
  assert.equal(a.vendor, false);
  assert.equal(a.dataset, true); // not disabled
});

test("parseDriverArgs: a full (non-smoke) run enables vendor + dataset and scales shards to the CPU", () => {
  const a = parseDriverArgs([]);
  assert.equal(a.smoke, false);
  assert.equal(a.vendor, true);
  assert.equal(a.dataset, true);
  assert.ok(a.shards >= 2, "shards scale to >= 2");
  assert.ok(a.grids.length >= 5 && a.grids[0] < a.grids[a.grids.length - 1], "escalating grid schedule");
});

test("mergeShardSummaries sums counts/totalProbed, computes defects+suspects, merges oracle", () => {
  const s0 = {
    totalProbed: 400, capped: false,
    counts: { ok: 390, blocked: 5, DEFECT_negative: 2, SUSPECT_vc_band: 3, THROW: 0 },
    breaks: [{ class: "DEFECT_negative", material: "1045", tool_diameter: 10, number_of_teeth: 4, operation: "milling", depth: 1, width: 2, detail: "power_kW=-1" }],
    oracle: { perCellHits: 1, crossCellHits: 0, byKind: { hss_not_slower_than_carbide: 1 }, perCellBreaks: [{ x: 1 }], crossCellBreaks: [] },
  };
  const s1 = {
    totalProbed: 400, capped: true,
    counts: { ok: 398, blocked: 2, DEFECT_negative: 0, SUSPECT_vc_band: 0 },
    breaks: [],
    oracle: { perCellHits: 0, crossCellHits: 2, byKind: { speed_ordering: 2 }, perCellBreaks: [], crossCellBreaks: [{ y: 2 }] },
  };
  const m = mergeShardSummaries([s0, s1]);
  assert.equal(m.shardsOk, 2);
  assert.equal(m.totalProbed, 800);
  assert.equal(m.ok, 788);
  assert.equal(m.blocked, 7);
  assert.equal(m.defects, 2); // DEFECT_negative(2) + THROW(0)
  assert.equal(m.suspects, 3); // SUSPECT_vc_band(3+0)
  assert.equal(m.capped, true); // any shard capped
  assert.equal(m.oracle.perCellHits, 1);
  assert.equal(m.oracle.crossCellHits, 2);
  assert.deepEqual(m.oracle.byKind, { hss_not_slower_than_carbide: 1, speed_ordering: 2 });
  assert.equal(m.breaks.length, 1);
});

test("mergeShardSummaries tolerates missing/garbage shard summaries (partial round)", () => {
  const m = mergeShardSummaries([null, undefined, { totalProbed: 10, counts: { ok: 10 } }]);
  assert.equal(m.shardsOk, 1);
  assert.equal(m.totalProbed, 10);
  assert.equal(m.ok, 10);
  assert.equal(m.defects, 0);
});

test("renderSummaryMd marks a clean round CLEAN and a defective round with the defect line", () => {
  const base = { startedAt: "T0", updatedAt: "T1", args: { shards: 2, grids: [6], maxPerShard: 400 }, vendor: { skipped: true }, dataset: { skipped: true } };
  const clean = renderSummaryMd({ ...base, rounds: [{ grid: 6, complete: true, merged: { totalProbed: 800, ok: 800, blocked: 0, defects: 0, suspects: 0, oracle: { perCellHits: 0, crossCellHits: 0, byKind: {} }, breaks: [] } }] });
  assert.match(clean, /SFC Overnight Combination Sweep/);
  assert.match(clean, /CLEAN/);
  assert.match(clean, /G-Wizard \+ HSMAdvisor \+ traditional/);
  const defective = renderSummaryMd({ ...base, rounds: [{ grid: 6, complete: true, merged: { totalProbed: 800, ok: 790, blocked: 0, defects: 5, suspects: 5, oracle: { perCellHits: 0, crossCellHits: 0, byKind: {} }, breaks: [] } }] });
  assert.match(defective, /DEFECTS.*5/);
  assert.doesNotMatch(defective, /\bCLEAN\b/);
});
