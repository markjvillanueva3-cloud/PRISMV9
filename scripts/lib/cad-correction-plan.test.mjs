/**
 * Tests for cad-correction-plan.mjs (U-INDIA-CAD-CORRECTION-PLAN).
 * Reference-value assertions (no toBeDefined stubs): exact edit targets, tolerance gating (abs + pct
 * bands), structural add/remove, worst-first ranking across tiers, categorical edits, perfect one-shot,
 * end-to-end composition through correspondFeatures, and error/edge handling.
 * Run: node --test scripts/lib/cad-correction-plan.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { planCorrections, planCorrectionsFrom } from "./cad-correction-plan.mjs";
import { correspondFeatures } from "./cad-feature-correspondence.mjs";

const F = (id, featureType, parameters) => ({ id, featureType, parameters });

test("a diverged matched param -> one direct set-edit with exact from/to/absDelta/pctDelta", () => {
  const corr = correspondFeatures([F("G1", "hole", { diameter: 10.2 })], [F("R1", "hole", { diameter: 10 })]);
  const plan = planCorrections(corr);
  assert.equal(plan.summary.setCount, 1);
  const e = plan.setEdits[0];
  assert.equal(e.parameter, "diameter");
  assert.equal(e.from, 10.2); // drawn
  assert.equal(e.to, 10); // intended target
  assert.ok(Math.abs(e.absDelta - 0.2) < 1e-9);
  assert.ok(Math.abs(e.pctDelta - 2) < 1e-9); // (10.2-10)/10*100
  assert.equal(e.numeric, true);
  assert.match(e.directive, /set diameter on hole\[R1\]: 10\.2 -> 10 \(drawn \+2%\)/);
  assert.equal(plan.summary.perfect, false);
});

test("tolerance gating: a delta inside absTol is NOT edited (treated as in-spec)", () => {
  const corr = correspondFeatures([F("G1", "hole", { diameter: 10.2 })], [F("R1", "hole", { diameter: 10 })]);
  const plan = planCorrections(corr, { absTol: 1 }); // 0.2 <= 1 -> in tolerance
  assert.equal(plan.summary.setCount, 0);
  assert.equal(plan.summary.perfect, true);
});

test("pct band forgives a large-abs but small-relative error on a big dimension", () => {
  // 500.5 vs 500: absDelta 0.5 (exceeds a 0.1 abs band) but only 0.1% relative -> pctTol=1 forgives it.
  const corr = correspondFeatures([F("G1", "pocket", { length: 500.5 })], [F("R1", "pocket", { length: 500 })]);
  const gated = planCorrections(corr, { absTol: 0.1, pctTol: 1 });
  assert.equal(gated.summary.setCount, 0, "within pct band -> no edit");
  const ungated = planCorrections(corr, { absTol: 0.1, pctTol: 0 });
  assert.equal(ungated.summary.setCount, 1, "pct band disabled -> abs band alone flags it");
});

test("missing reference feature -> an ADD action carrying its intended parameters", () => {
  const corr = correspondFeatures([F("G1", "hole", { diameter: 10 })], [F("R1", "hole", { diameter: 10 }), F("R2", "fillet", { radius: 5 })]);
  const plan = planCorrections(corr);
  assert.equal(plan.summary.addCount, 1);
  assert.equal(plan.addFeatures[0].featureType, "fillet");
  assert.equal(plan.addFeatures[0].referenceId, "R2");
  assert.equal(plan.addFeatures[0].parameters.radius, 5);
  assert.match(plan.addFeatures[0].directive, /add missing fillet\[R2\]/);
});

test("extra generated feature -> a REMOVE action", () => {
  const corr = correspondFeatures([F("G1", "hole", { diameter: 10 }), F("G2", "chamfer", { size: 1 })], [F("R1", "hole", { diameter: 10 })]);
  const plan = planCorrections(corr);
  assert.equal(plan.summary.removeCount, 1);
  assert.equal(plan.removeFeatures[0].generatedId, "G2");
  assert.match(plan.removeFeatures[0].directive, /remove extraneous chamfer\[G2\]/);
});

test("rankedActions: a structural miss ranks ABOVE a numeric dimension error", () => {
  // one missing feature + one 25%-off matched hole
  const corr = correspondFeatures(
    [F("G1", "hole", { diameter: 25 })],
    [F("R1", "hole", { diameter: 20 }), F("R2", "slot", { width: 4 })],
  );
  const plan = planCorrections(corr);
  assert.equal(plan.rankedActions[0].kind, "add"); // structural first
  assert.equal(plan.rankedActions[0].featureType, "slot");
  assert.equal(plan.rankedActions[1].kind, "set");
  assert.equal(plan.summary.worstDirective, plan.rankedActions[0].directive);
});

test("among numeric set-edits the MOST-wrong (largest |pct|) ranks first", () => {
  const corr = correspondFeatures(
    [F("G1", "hole", { diameter: 10.1 }), F("G2", "hole", { diameter: 25 })],
    [F("R1", "hole", { diameter: 10 }), F("R2", "hole", { diameter: 20 })],
  );
  const plan = planCorrections(corr);
  // only set-edits here; worst = R2 (20->25, 25%) before R1 (10->10.1, 1%)
  const numericEdits = plan.rankedActions.filter((a) => a.kind === "set");
  assert.equal(numericEdits[0].referenceId, "R2");
  assert.ok(Math.abs(numericEdits[0].pctDelta) > Math.abs(numericEdits[1].pctDelta));
});

test("categorical param change -> a set-edit with numeric:false and quoted directive", () => {
  const corr = correspondFeatures([F("G1", "hole", { style: "counterbore" })], [F("R1", "hole", { style: "countersink" })]);
  const plan = planCorrections(corr);
  assert.equal(plan.summary.setCount, 1);
  const e = plan.setEdits[0];
  assert.equal(e.numeric, false);
  assert.equal(e.pctDelta, undefined);
  assert.match(e.directive, /set style on hole\[R1\]: "counterbore" -> "countersink"/);
});

test("perfect one-shot: identical models -> zero actions, summary.perfect true", () => {
  const corr = correspondFeatures([F("G1", "hole", { diameter: 10 })], [F("R1", "hole", { diameter: 10 })]);
  const plan = planCorrections(corr);
  assert.equal(plan.summary.totalActions, 0);
  assert.equal(plan.summary.perfect, true);
  assert.equal(plan.summary.worstDirective, null);
});

test("planCorrectionsFrom composes correspondence end-to-end (id-free gen-vs-original)", () => {
  const plan = planCorrectionsFrom(
    [F("G1", "hole", { diameter: 10.5, depth: 20 }), F("G9", "boss", { height: 3 })],
    [F("R1", "hole", { diameter: 10, depth: 20 }), F("R7", "fillet", { radius: 2 })],
  );
  // hole matched (diameter 10.5 vs 10 -> set-edit; depth identical -> no edit),
  // fillet missing -> add, boss extra -> remove.
  assert.equal(plan.summary.setCount, 1);
  assert.equal(plan.setEdits[0].parameter, "diameter");
  assert.equal(plan.summary.addCount, 1);
  assert.equal(plan.summary.removeCount, 1);
  assert.equal(plan.rankedActions[0].kind !== "set", true); // a structural action leads
});

test("multiple diverged params on one feature -> one set-edit per parameter", () => {
  const corr = correspondFeatures(
    [F("G1", "pocket", { width: 51, depth: 13 })],
    [F("R1", "pocket", { width: 50, depth: 12 })],
  );
  const plan = planCorrections(corr);
  assert.equal(plan.summary.setCount, 2);
  const params = plan.setEdits.map((e) => e.parameter).sort();
  assert.deepEqual(params, ["depth", "width"]);
});

test("edge: empty correspondence -> perfect empty plan; null -> TypeError", () => {
  const plan = planCorrections({ matched: [], missing: [], extra: [] });
  assert.equal(plan.summary.totalActions, 0);
  assert.equal(plan.summary.perfect, true);
  assert.throws(() => planCorrections(null), TypeError);
  assert.throws(() => planCorrections("nope"), TypeError);
});
