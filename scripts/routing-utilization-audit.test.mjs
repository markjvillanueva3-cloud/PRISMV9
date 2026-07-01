// scripts/routing-utilization-audit.test.mjs
//
// Tests for U-ROUTING-UTILIZATION-AUDIT. R9: the audit's value is a TRUE coverage
// number + a frequency-weighted punch list -- a test must fail if coverage is
// miscomputed or a high-frequency thin class is NOT flagged.

import { test } from "node:test";
import assert from "node:assert/strict";
import { frequencyByClass, computeUtilization, renderAudit } from "./routing-utilization-audit.mjs";

// ---- frequencyByClass ------------------------------------------------------

test("frequencyByClass: maps classes -> {count, pct}", () => {
  const map = { classes: [{ taskClass: "build", count: 1932, pct: 39.7 }, { taskClass: "fix", count: 400, pct: 8.2 }] };
  assert.deepEqual(frequencyByClass(map), { build: { count: 1932, pct: 39.7 }, fix: { count: 400, pct: 8.2 } });
});
test("frequencyByClass: empty/null -> {}", () => {
  assert.deepEqual(frequencyByClass(null), {});
  assert.deepEqual(frequencyByClass({}), {});
  assert.deepEqual(frequencyByClass({ classes: [] }), {});
});

// ---- computeUtilization ----------------------------------------------------

const CATALOG = {
  actionableWired: 10, classSpecificCount: 6, universalCount: 4, wired: 20, withKnob: 10,
  byKind: { "block-gate": 5, "advisory-inject": 5, mutator: 5, passive: 5 },
  byTaskClass: {
    build: [{ id: "g1", kind: "block-gate" }, { id: "a1", kind: "advisory-inject" }, { id: "a2", kind: "advisory-inject" }, { id: "g2", kind: "block-gate" }],
    fix: [{ id: "g3", kind: "block-gate" }, { id: "a3", kind: "advisory-inject" }],
    // locate has NO entry -> 0 class-specific features
  },
};
const PLANS = { build: [{ name: "dedup" }, { name: "forge" }], fix: [{ name: "diagnose" }] };
const FREQ = { build: { count: 1932, pct: 39.7 }, fix: { count: 100, pct: 2.0 }, locate: { count: 300, pct: 6.1 } };
const CLASSES = ["build", "fix", "locate"];

test("computeUtilization: featureCoverage is a conservation PROOF (reported, conservationOk true)", () => {
  const a = computeUtilization(CATALOG, PLANS, FREQ, CLASSES);
  assert.equal(a.featureCoverage, 1);   // 6+4=10 == 10 -> conservation holds
  assert.equal(a.conservationOk, true);
  assert.equal(a.universalSkew, 0.4);   // 4/10
});

test("computeUtilization: knobCoverage counts knobbed AMONG WIRED (not unwired) -- never > 1", () => {
  // catalog with features[]: 2 wired+knobbed of 4 wired -> 0.5 (NOT 10/20 from the
  // summary withKnob which would mis-count unwired knobbed hooks).
  const cat = {
    ...CATALOG, wired: 4, withKnob: 99,   // withKnob deliberately huge (incl unwired) -> must be ignored
    features: [
      { wired: true, knob: "PRISM_A_DISABLE" }, { wired: true, knob: "PRISM_B_DISABLE" },
      { wired: true, knob: null }, { wired: true, knob: null },
      { wired: false, knob: "PRISM_C_DISABLE" },   // unwired knobbed -> excluded
    ],
  };
  const a = computeUtilization(cat, PLANS, FREQ, CLASSES);
  assert.equal(a.knobCoverage, 0.5);   // 2 wired-knobbed / 4 wired
  assert.ok(a.knobCoverage <= 1);
});

test("computeUtilization: conservationOk false when catalog broke conservation (FAIL-LOUD signal)", () => {
  const broken = { ...CATALOG, actionableWired: 12 };   // 6+4=10 != 12 -> lost 2
  const a = computeUtilization(broken, PLANS, FREQ, CLASSES);
  assert.equal(a.conservationOk, false);
  assert.ok(a.utilizationScore <= 1);   // still clamped, never out of range
});

test("computeUtilization: per-class density counts features/gates/commands + frequency", () => {
  const a = computeUtilization(CATALOG, PLANS, FREQ, CLASSES);
  assert.deepEqual(a.perClass.build, { features: 4, gates: 2, commands: 2, freqCount: 1932, freqPct: 39.7 });
  assert.deepEqual(a.perClass.locate, { features: 0, gates: 0, commands: 0, freqCount: 300, freqPct: 6.1 });
});

test("computeUtilization: a HIGH-FREQUENCY class with 0 class-specific features is a P1 punch-list item", () => {
  const a = computeUtilization(CATALOG, PLANS, FREQ, CLASSES);
  // locate: 0 features, 6.1% >= 5% high-freq -> P1
  const locateP1 = a.punchList.find((p) => p.cls === "locate" && p.issue === "no class-specific actionable features");
  assert.ok(locateP1, "locate (high-freq, 0 features) must be flagged");
  assert.equal(locateP1.severity, "P1");
  // it sorts to the front (P1 before P2/P3)
  assert.equal(a.punchList[0].severity, "P1");
});

test("computeUtilization: a LOW-frequency class with 0 features is only P2 (not weighted up)", () => {
  const lowFreqLocate = { ...FREQ, locate: { count: 5, pct: 0.1 } };
  const a = computeUtilization(CATALOG, PLANS, lowFreqLocate, CLASSES);
  const item = a.punchList.find((p) => p.cls === "locate" && p.issue === "no class-specific actionable features");
  assert.equal(item.severity, "P2");   // low-freq -> not escalated
});

test("computeUtilization: utilizationScore is the 4-leg composite in [0,1]", () => {
  const a = computeUtilization(CATALOG, PLANS, FREQ, CLASSES);
  // featureCoverage 1 + classCoverage 2/3 + cmdCoverage 2/3 + knobCoverage 0.5 = 2.833/4
  assert.ok(a.utilizationScore > 0 && a.utilizationScore <= 1);
  assert.equal(a.classCoverage, Number((2 / 3).toFixed(3)));   // build+fix have features, locate doesn't
  assert.equal(a.cmdCoverage, Number((2 / 3).toFixed(3)));
});

test("computeUtilization: empty catalog -> score computable, no throw (defensive)", () => {
  const a = computeUtilization({}, {}, {}, CLASSES);
  assert.equal(a.featureCoverage, 1);   // 0/0 guarded -> 1 (nothing to lose)
  assert.equal(a.classCoverage, 0);     // no class has features
  assert.ok(Array.isArray(a.punchList));
});

// ---- renderAudit -----------------------------------------------------------

test("renderAudit: produces the score header + conservation status + per-class table + punch list", () => {
  const out = renderAudit(computeUtilization(CATALOG, PLANS, FREQ, CLASSES));
  assert.match(out, /# ROUTING UTILIZATION AUDIT -- score/);
  assert.match(out, /conservation OK/);
  assert.match(out, /per-class/);
  assert.match(out, /\[P1\] locate/);
  assert.match(out, /build {8}feat {3}4/);   // build row, 4 features
});
test("renderAudit: surfaces BROKEN conservation loudly", () => {
  const broken = computeUtilization({ ...CATALOG, actionableWired: 12 }, PLANS, FREQ, CLASSES);
  assert.match(renderAudit(broken), /conservation BROKEN/);
});
test("renderAudit: null -> empty string", () => {
  assert.equal(renderAudit(null), "");
});
