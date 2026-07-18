/**
 * Tests for nn-graph-holdout-variance.mjs pure decision functions.
 * Real reference values (hand-computed) + failure + adversarial cases.
 * Run: node --test scripts/nn-graph-holdout-variance.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  summarizeMetric,
  gatePassRates,
  classifyStability,
  buildVarianceReport,
  parseArgs,
} from "./nn-graph-holdout-variance.mjs";

// --- summarizeMetric -------------------------------------------------------

test("summarizeMetric: known values -> hand-computed stats", () => {
  // auroc values 0.40, 0.60, 0.80 -> mean 0.60, range 0.40, stdev sqrt(0.0266..)=0.1633
  const rows = [{ auroc: 0.4 }, { auroc: 0.6 }, { auroc: 0.8 }];
  const s = summarizeMetric(rows, "auroc");
  assert.equal(s.n, 3);
  assert.equal(s.mean, 0.6);
  assert.equal(s.min, 0.4);
  assert.equal(s.max, 0.8);
  assert.equal(s.range, 0.4);
  assert.equal(s.stdev, 0.1633); // sqrt(((0.04)+0+(0.04))/3) rounded 4dp
});

test("summarizeMetric: skips non-finite + missing -> only finite count", () => {
  const rows = [{ auroc: 0.5 }, { auroc: null }, { auroc: NaN }, {}, { auroc: 0.7 }];
  const s = summarizeMetric(rows, "auroc");
  assert.equal(s.n, 2);
  assert.equal(s.mean, 0.6);
});

test("summarizeMetric: empty / non-array -> all null, n=0 (no throw)", () => {
  for (const input of [[], null, undefined, "nope", 42]) {
    const s = summarizeMetric(input, "auroc");
    assert.equal(s.n, 0);
    assert.equal(s.mean, null);
    assert.equal(s.range, null);
  }
});

// --- gatePassRates ---------------------------------------------------------

test("gatePassRates: counts only non-deferred rows", () => {
  const rows = [
    { gatePass: true, selectivePass: true },
    { gatePass: false, selectivePass: true },
    { deferred: true, reason: "no-vectors" }, // excluded
    { gatePass: false, selectivePass: false },
  ];
  const r = gatePassRates(rows);
  assert.equal(r.n, 3);
  assert.equal(r.fullPass, 1);
  assert.equal(r.fullRate, 0.3333);
  assert.equal(r.selectivePass, 2);
  assert.equal(r.selectiveRate, 0.6667);
});

test("gatePassRates: all deferred -> n=0, null rates", () => {
  const r = gatePassRates([{ deferred: true }, { deferred: true }]);
  assert.equal(r.n, 0);
  assert.equal(r.fullRate, null);
});

// --- classifyStability -----------------------------------------------------

test("classifyStability: tight range + unanimous pass -> stable", () => {
  const auroc = { n: 5, range: 0.03 };
  const passRates = { n: 5, fullPass: 5, fullRate: 1, selectivePass: 5, selectiveRate: 1 };
  const c = classifyStability(auroc, passRates);
  assert.equal(c.stable, true);
  assert.equal(c.verdict, "stable");
});

test("classifyStability: wide AUROC range -> unstable (split-noise-bound)", () => {
  // the real india finding: 0.808 vs 0.4286 = range 0.38
  const auroc = { n: 2, range: 0.38 };
  const passRates = { n: 2, fullPass: 0, fullRate: 0, selectivePass: 1, selectiveRate: 0.5 };
  const c = classifyStability(auroc, passRates);
  assert.equal(c.stable, false);
  assert.equal(c.verdict, "unstable");
  assert.match(c.reason, /range 0\.38 >= 0\.1/);
  assert.match(c.reason, /selective-gate verdict flips/);
});

test("classifyStability: tight range but selective verdict flips -> unstable", () => {
  const auroc = { n: 4, range: 0.02 };
  const passRates = { n: 4, fullPass: 0, fullRate: 0, selectivePass: 2, selectiveRate: 0.5 };
  const c = classifyStability(auroc, passRates);
  assert.equal(c.stable, false);
  assert.match(c.reason, /selective-gate verdict flips across seeds \(2\/4 pass\)/);
});

test("classifyStability: < 2 seeds -> insufficient-seeds (never claims stable)", () => {
  assert.equal(classifyStability({ n: 1, range: 0 }, { n: 1 }).verdict, "insufficient-seeds");
  assert.equal(classifyStability(null, {}).verdict, "insufficient-seeds");
});

test("classifyStability: custom unstableRange threshold honored", () => {
  const auroc = { n: 3, range: 0.07 };
  const passRates = { n: 3, fullPass: 0, fullRate: 0, selectivePass: 0, selectiveRate: 0 };
  assert.equal(classifyStability(auroc, passRates, 0.10).stable, true);  // 0.07 < 0.10
  assert.equal(classifyStability(auroc, passRates, 0.05).stable, false); // 0.07 >= 0.05
});

// --- buildVarianceReport ---------------------------------------------------

test("buildVarianceReport: integrates summary + passRates + stability", () => {
  const rows = [
    { seed: 1337, deferred: false, holdoutN: 62, auroc: 0.808, macroF1: 0.44, brier: 0.18, gatePass: false, selectivePass: true },
    { seed: 7, deferred: false, holdoutN: 13, auroc: 0.4286, macroF1: 0.1, brier: 0.25, gatePass: false, selectivePass: false },
  ];
  const rep = buildVarianceReport(rows, { now: "2026-06-15T00:00:00Z", mode: "direct-embed" });
  assert.equal(rep.schemaVersion, 1);
  assert.deepEqual(rep.seeds, [1337, 7]);
  assert.equal(rep.summary.auroc.range, 0.3794);
  assert.equal(rep.passRates.fullPass, 0);
  assert.equal(rep.stability.verdict, "unstable"); // range 0.38 + selective flips
  assert.equal(rep.runs.length, 2);
});

// --- parseArgs -------------------------------------------------------------

test("parseArgs: defaults to direct-embed + standard seeds", () => {
  const o = parseArgs([]);
  assert.equal(o.directEmbed, true);
  assert.deepEqual(o.seeds, [1337, 7, 42, 99, 2026]);
  assert.equal(o.holdout, 200);
});

test("parseArgs: --checkpoint disables direct-embed default", () => {
  const o = parseArgs(["--checkpoint", "c.json"]);
  assert.equal(o.checkpoint, "c.json");
  assert.equal(o.directEmbed, undefined);
});

test("parseArgs: --seeds parses + filters non-numeric", () => {
  const o = parseArgs(["--seeds", "1,2,x,3"]);
  assert.deepEqual(o.seeds, [1, 2, 3]);
});

test("parseArgs: unknown arg throws", () => {
  assert.throws(() => parseArgs(["--bogus"]), /unknown argument/);
});
