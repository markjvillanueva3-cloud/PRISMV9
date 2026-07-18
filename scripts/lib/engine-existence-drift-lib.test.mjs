// engine-existence-drift-lib.test.mjs -- real reference-value + edge + adversarial tests.
// Run: node scripts/lib/engine-existence-drift-lib.test.mjs   (node:test auto-runs on exit)
import { test } from "node:test";
import assert from "node:assert/strict";
import { extractEngineNames, classifyUnit, analyzeMilestone, hasBuildIntent, isUnitComplete } from "./engine-existence-drift-lib.mjs";

// Resolver fixtures modeling the live finding:
// AI-WIRE engines (AGISafetyContainmentEngine etc.) EXIST + WIRED; ManufacturingSafetyEngine is phantom.
const EXIST = new Set([
  "SystemUtilizationAuditEngine", "AGISafetyContainmentEngine", "BayesianSafetyEngine",
  "WEDMSafetyEnvelopeEngine", "HyperMillSafetyHooks",
]);
const WIRED = new Set(["SystemUtilizationAuditEngine", "AGISafetyContainmentEngine", "BayesianSafetyEngine"]);
const resolver = { engineExists: (n) => EXIST.has(n), engineWired: (n) => WIRED.has(n) };

// ---- extractEngineNames ----
test("extractEngineNames: pulls the engine from a Build-verb title", () => {
  assert.deepEqual(extractEngineNames({ title: "Build SystemUtilizationAuditEngine + scoring framework" }),
    ["SystemUtilizationAuditEngine"]);
});
test("extractEngineNames: multiple engines + Hooks, deduped, order-preserved", () => {
  assert.deepEqual(
    extractEngineNames({ description: "wire AGISafetyContainmentEngine, BayesianSafetyEngine, HyperMillSafetyHooks, AGISafetyContainmentEngine" }),
    ["AGISafetyContainmentEngine", "BayesianSafetyEngine", "HyperMillSafetyHooks"]);
});
test("extractEngineNames: a pillar/no-engine unit yields none", () => {
  assert.deepEqual(extractEngineNames({ title: "Pillar 1 -- Dev Tools utilization" }), []);
});
test("extractEngineNames: scans steps[] too", () => {
  assert.deepEqual(extractEngineNames({ title: "x", steps: ["read foo", "import WEDMSafetyEnvelopeEngine"] }),
    ["WEDMSafetyEnvelopeEngine"]);
});
test("extractEngineNames: bare 'Engine'/'Hooks' word is NOT captured", () => {
  assert.deepEqual(extractEngineNames({ title: "wire the Engine and Hooks generically" }), []);
});
test("extractEngineNames: null/empty/garbage -> [] (no throw)", () => {
  assert.deepEqual(extractEngineNames(null), []);
  assert.deepEqual(extractEngineNames({}), []);
  assert.deepEqual(extractEngineNames({ title: 42, steps: "notarray" }), []);
});

// ---- classifyUnit ----
test("classifyUnit: named engine exists -> DRIFT_ENGINE_EXISTS (+ wired tracked)", () => {
  const r = classifyUnit({ id: "U01", title: "Build SystemUtilizationAuditEngine" }, resolver);
  assert.equal(r.verdict, "DRIFT_ENGINE_EXISTS");
  assert.deepEqual(r.existing, ["SystemUtilizationAuditEngine"]);
  assert.deepEqual(r.wired, ["SystemUtilizationAuditEngine"]);
});
test("classifyUnit: phantom engine -> GENUINE_OPEN_ENGINE_MISSING", () => {
  const r = classifyUnit({ id: "U03", title: "wire ManufacturingSafetyEngine" }, resolver);
  assert.equal(r.verdict, "GENUINE_OPEN_ENGINE_MISSING");
  assert.deepEqual(r.missing, ["ManufacturingSafetyEngine"]);
});
test("classifyUnit: no engine named -> INDETERMINATE_NO_ENGINE", () => {
  assert.equal(classifyUnit({ id: "U", title: "Pillar 2 -- Protocols" }, resolver).verdict, "INDETERMINATE_NO_ENGINE");
});
test("classifyUnit: ANY missing among many -> GENUINE_OPEN (conservative)", () => {
  const r = classifyUnit({ id: "U", title: "wire BayesianSafetyEngine + ManufacturingSafetyEngine" }, resolver);
  assert.equal(r.verdict, "GENUINE_OPEN_ENGINE_MISSING");
});
test("classifyUnit: resolver that throws is swallowed (treated as not-exist)", () => {
  const bad = { engineExists: () => { throw new Error("boom"); }, engineWired: () => { throw new Error("boom"); } };
  const r = classifyUnit({ id: "U", title: "Build SystemUtilizationAuditEngine" }, bad);
  assert.equal(r.verdict, "GENUINE_OPEN_ENGINE_MISSING"); // exists() threw -> missing
});

// ---- analyzeMilestone ----
test("analyzeMilestone: all engine-units exist -> HIGH_CONFIDENCE_DRIFT, conf=1", () => {
  const ms = { id: "AI-WIRE-LIKE", units: [
    { id: "U01", status: "complete", title: "done already" },
    { id: "U02", status: "not_started", title: "wire AGISafetyContainmentEngine" },
    { id: "U03", status: "not_started", title: "wire BayesianSafetyEngine" },
  ] };
  const a = analyzeMilestone(ms, resolver);
  assert.equal(a.classification, "HIGH_CONFIDENCE_DRIFT");
  assert.equal(a.driftConfidence, 1);
  assert.deepEqual(a.driftUnits, ["U02", "U03"]);
  assert.equal(a.notCompleteUnits, 2); // complete U01 excluded
});
test("analyzeMilestone: a phantom among them -> PARTIAL_DRIFT + missingEngines", () => {
  const ms = { id: "MIX", units: [
    { id: "A", status: "not_started", title: "wire AGISafetyContainmentEngine" },
    { id: "B", status: "not_started", title: "wire ManufacturingSafetyEngine" },
  ] };
  const a = analyzeMilestone(ms, resolver);
  assert.equal(a.classification, "PARTIAL_DRIFT");
  assert.equal(a.driftConfidence, 0.5);
  assert.deepEqual(a.missingEngines, ["ManufacturingSafetyEngine"]);
});
test("analyzeMilestone: all named engines missing -> GENUINE_OPEN", () => {
  const ms = { id: "OPEN", units: [{ id: "A", status: "not_started", title: "build FooNonExistentEngine" }] };
  assert.equal(analyzeMilestone(ms, resolver).classification, "GENUINE_OPEN");
});
test("analyzeMilestone: skeletal units:[] -> INDETERMINATE, conf=null", () => {
  const a = analyzeMilestone({ id: "MS-WIRE-BACKEND-LIKE", units: [] }, resolver);
  assert.equal(a.classification, "INDETERMINATE");
  assert.equal(a.driftConfidence, null);
});
test("analyzeMilestone: pillar-only (no-engine) not-complete units -> INDETERMINATE", () => {
  const ms = { id: "SYS-UTIL-PILLARS", units: [
    { id: "U02", status: "not_started", title: "Pillar 1 -- Dev Tools utilization" },
    { id: "U03", status: "not_started", title: "Pillar 2 -- Protocols" },
  ] };
  const a = analyzeMilestone(ms, resolver);
  assert.equal(a.classification, "INDETERMINATE");
  assert.deepEqual(a.indeterminateUnits, ["U02", "U03"]);
});
test("analyzeMilestone: adversarial -- null units array, null unit entries", () => {
  assert.equal(analyzeMilestone({ id: "X" }, resolver).classification, "INDETERMINATE");
  const a = analyzeMilestone({ id: "Y", units: [null, { id: "Z", status: "not_started", title: "Build SystemUtilizationAuditEngine" }] }, resolver);
  assert.equal(a.classification, "HIGH_CONFIDENCE_DRIFT");
});

// ---- build-intent gate (R12 fix: engine-existence is NOT completion evidence for train/use units) ----
test("hasBuildIntent: true for build/wire verbs, false for train/optimize/no-verb", () => {
  assert.equal(hasBuildIntent({ title: "Build SystemUtilizationAuditEngine" }), true);
  assert.equal(hasBuildIntent({ title: "wire AGISafetyContainmentEngine to guardDispatcher" }), true);
  assert.equal(hasBuildIntent({ title: "Train MillDeepLearningEngine on JM corpus" }), false);
  assert.equal(hasBuildIntent({ title: "Pillar 1 -- Dev Tools utilization" }), false);
  assert.equal(hasBuildIntent({ title: "U-AITRAIN-MILL-MILL-DEEP-LEARNING", description: "fine-tune the mill model" }), false);
});
test("classifyUnit: existing engine but TRAIN intent -> INDETERMINATE_NON_BUILD (not DRIFT)", () => {
  // The engine exists, but the unit's job is to TRAIN it -> existence proves nothing (R12).
  const r = classifyUnit({ id: "U-AITRAIN", title: "train SystemUtilizationAuditEngine deep-learning model" }, resolver);
  assert.equal(r.verdict, "INDETERMINATE_NON_BUILD");
});
test("classifyUnit: existing engine named with NO verb -> INDETERMINATE_NON_BUILD", () => {
  const r = classifyUnit({ id: "U", title: "SystemUtilizationAuditEngine deep-learning advisor" }, resolver);
  assert.equal(r.verdict, "INDETERMINATE_NON_BUILD");
});
test("analyzeMilestone: AI-TRAINING-style milestone (train existing engines, no build verb) -> NOT drift", () => {
  // Reference case: AI-TRAINING-FIRST-MS0 was FALSELY flagged HIGH_CONFIDENCE_DRIFT pre-fix.
  const ms = { id: "AI-TRAINING-LIKE", units: [
    { id: "U-AITRAIN-MILL", status: "not_started", title: "Mill deep-learning", description: "train SystemUtilizationAuditEngine on mill data" },
    { id: "U-AITRAIN-LATHE", status: "not_started", title: "Lathe deep-learning", description: "fine-tune AGISafetyContainmentEngine" },
  ] };
  const a = analyzeMilestone(ms, resolver);
  assert.equal(a.classification, "INDETERMINATE"); // was HIGH_CONFIDENCE_DRIFT -- the bug
  assert.equal(a.driftConfidence, null);
  assert.equal(a.indeterminateUnits.length, 2);
});
test("analyzeMilestone: build-verb milestone with existing engines STILL HIGH_CONFIDENCE_DRIFT", () => {
  const ms = { id: "CK-LIKE", units: [
    { id: "U01", status: "not_started", title: "Build SystemUtilizationAuditEngine -- natural language parser" },
    { id: "U02", status: "not_started", title: "create AGISafetyContainmentEngine cache" },
  ] };
  assert.equal(analyzeMilestone(ms, resolver).classification, "HIGH_CONFIDENCE_DRIFT");
});

// ---- completeness normalization (R12: envelopes mix "complete"/"completed"/"shipped") ----
test("isUnitComplete: recognizes all done conventions, case-insensitive", () => {
  for (const s of ["complete", "completed", "Completed", "SHIPPED", "done"]) assert.equal(isUnitComplete({ status: s }), true);
  for (const s of ["not_started", "in_progress", "pending", "", undefined]) assert.equal(isUnitComplete({ status: s }), false);
  assert.equal(isUnitComplete(null), false);
});
test("analyzeMilestone: 'completed'-status units are EXCLUDED from notComplete (the bug)", () => {
  // Regression: a naive status!=="complete" treated these as open. They must NOT be scored.
  const ms = { id: "HMO-LIKE", units: [
    { id: "P0", status: "completed", title: "Build SystemUtilizationAuditEngine" },
    { id: "P1", status: "completed", title: "wire AGISafetyContainmentEngine" },
    { id: "OPEN", status: "not_started", title: "build FooNonExistentEngine" },
  ] };
  const a = analyzeMilestone(ms, resolver);
  assert.equal(a.notCompleteUnits, 1);           // only the 1 genuinely-open unit
  assert.equal(a.classification, "GENUINE_OPEN"); // its engine is missing
});
