/**
 * cad-oneshot-chain.integration.test.mjs -- END-TO-END validation of the CAD one-shot algorithm chain
 * (U-INDIA-CAD-ONESHOT-VALIDATE, slot:india 2026-07-02). The R15 VALIDATE stage: the three stages have
 * isolated unit tests, but nothing proves they COMPOSE into the operator's actual scenario. This does,
 * numerically -- it is the proof that "locate -> fix -> prevent" delivers a one-shot-converging loop.
 *
 *   LOCATE   cad-feature-correspondence.correspondFeatures  (id-free: which drawn feature is wrong)
 *   FIX      cad-correction-plan.planCorrections            (direct 2nd-pass edit list)
 *   PREVENT  cad-systematic-bias.detectSystematicBias       (learn bias -> pre-correct FUTURE parts)
 *
 * The "regenerator" (delta's real engine) is stood in for by a test-local `applyPlan` + a biased
 * `simulateGenerator` -- honest simulation, clearly labeled. It stands in for the CAD kernel only to
 * prove the ALGORITHM contract end-to-end; delta wires the real generator in.
 * Run: node --test scripts/lib/cad-oneshot-chain.integration.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { correspondFeatures } from "./cad-feature-correspondence.mjs";
import { planCorrections, planCorrectionsFrom } from "./cad-correction-plan.mjs";
import { detectSystematicBias, buildBiasModel, applyBiasPrecorrection } from "./cad-systematic-bias.mjs";
import { oneShotConvergence } from "./cad-oneshot-convergence.mjs";

const F = (id, featureType, parameters) => ({ id, featureType, parameters });

/** A realistic 5-feature reference part (the INTENDED blueprint). */
function referencePart() {
  return [
    F("H1", "hole", { diameter: 10, depth: 20, x: 0, y: 0 }),
    F("H2", "hole", { diameter: 6, depth: 15, x: 30, y: 0 }),
    F("P1", "pocket", { width: 50, length: 40, depth: 12 }),
    F("R1", "fillet", { radius: 5 }),
    F("C1", "chamfer", { size: 1.5 }),
  ];
}

/**
 * Test-local stand-in for delta's regenerator: apply a correction plan to the generated feature set.
 * set -> write the intended value; remove -> drop the extra feature; add -> draw the missing feature
 * (here cloned from the reference the plan carries). Returns a NEW corrected generated set.
 */
function applyPlan(generated, plan) {
  const removeIds = new Set(plan.removeFeatures.map((r) => r.generatedId));
  const out = generated
    .filter((g) => !removeIds.has(g.id))
    .map((g) => ({ ...g, parameters: { ...g.parameters } }));
  for (const e of plan.setEdits) {
    const g = out.find((x) => x.id === e.generatedId);
    if (g) g.parameters[e.parameter] = e.to;
  }
  for (const a of plan.addFeatures) {
    out.push(F(`ADD_${a.referenceId}`, a.featureType, { ...a.parameters }));
  }
  return out;
}

test("LOCATE+FIX+converge: one corrective pass drives a flawed generation to a PERFECT match", () => {
  const reference = referencePart();
  // A flawed generation: H1 drawn oversized, H2 depth wrong, fillet MISSING, a spurious boss ADDED.
  const generated = [
    F("g1", "hole", { diameter: 10.4, depth: 20, x: 0, y: 0 }), // +4% diameter
    F("g2", "hole", { diameter: 6, depth: 17, x: 30, y: 0 }), // depth 15 -> 17
    F("g3", "pocket", { width: 50, length: 40, depth: 12 }), // perfect
    F("g4", "chamfer", { size: 1.5 }), // perfect
    F("g9", "boss", { height: 4 }), // hallucinated (no reference)
  ];

  // LOCATE
  const corr = correspondFeatures(generated, reference);
  assert.equal(corr.summary.missingCount, 1, "fillet R1 detected missing");
  assert.equal(corr.missing[0].id, "R1");
  assert.equal(corr.summary.extraCount, 1, "boss detected extra");
  assert.equal(corr.extra[0].id, "g9");

  // FIX
  const plan = planCorrections(corr);
  assert.equal(plan.summary.perfect, false);
  assert.equal(plan.summary.addCount, 1); // add fillet
  assert.equal(plan.summary.removeCount, 1); // remove boss
  assert.ok(plan.summary.setCount >= 2); // fix H1 diameter + H2 depth
  assert.equal(plan.rankedActions[0].kind !== "set", true, "a structural miss leads the ranked plan");

  // APPLY (simulated regenerator) + re-VERIFY -> converged in ONE pass
  const corrected = applyPlan(generated, plan);
  const verify = planCorrectionsFrom(corrected, reference);
  assert.equal(verify.summary.perfect, true, "after one corrective pass the replica matches the blueprint exactly");
});

test("PREVENT: learning a systematic +3% hole bias makes the NEXT part's first pass one-shot accurate", () => {
  const BIAS = 1.03; // the generator systematically draws hole diameters 3% oversized

  // Simulate a stream of 15 parts, each a single hole of a different intended diameter.
  const intendedDiameters = [5, 6, 8, 10, 12, 4, 7, 9, 11, 3, 6.5, 8.5, 10.5, 5.5, 9.5];
  const plans = intendedDiameters.map((d, i) => {
    const reference = [F(`R${i}`, "hole", { diameter: d })];
    const generated = [F(`G${i}`, "hole", { diameter: d * BIAS })]; // generator applies its bias
    return planCorrectionsFrom(generated, reference);
  });

  // LEARN the bias from the correction stream.
  const bias = detectSystematicBias(plans);
  assert.equal(bias.biasedCount, 1, "the hole-diameter bias is detected");
  const g = bias.groups[0];
  assert.equal(g.featureType, "hole");
  assert.ok(Math.abs(g.meanPctDelta - 3) < 1e-9, "learned mean bias == +3%");
  const model = buildBiasModel(bias);

  // A FRESH part. Without pre-correction the first pass is 3% off; WITH it, it lands on target.
  const intendedFresh = 12;
  const uncorrectedDrawn = intendedFresh * BIAS; // 12.36 -> 3% error, would need a 2nd pass
  assert.ok(Math.abs(uncorrectedDrawn - intendedFresh) > 0.3);

  const preTarget = applyBiasPrecorrection("hole", "diameter", intendedFresh, model);
  const precorrectedDrawn = preTarget * BIAS; // generator applies the SAME bias to the pre-scaled target
  assert.ok(
    Math.abs(precorrectedDrawn - intendedFresh) < 1e-9,
    `pre-correction should make the first pass land on ${intendedFresh}, got ${precorrectedDrawn}`,
  );

  // And a feature with no learned bias is left untouched (never scale on absent evidence).
  assert.equal(applyBiasPrecorrection("slot", "width", 4, model), 4);
});

test("chain is monotone: each stage strictly reduces the error toward perfect (no oscillation)", () => {
  const reference = referencePart();
  const generated = [
    F("g1", "hole", { diameter: 12, depth: 20, x: 0, y: 0 }), // 20% oversized
    F("g2", "hole", { diameter: 6, depth: 15, x: 30, y: 0 }),
    F("g3", "pocket", { width: 55, length: 40, depth: 12 }), // width 50 -> 55
    F("g4", "fillet", { radius: 5 }),
    F("g5", "chamfer", { size: 1.5 }),
  ];
  const before = correspondFeatures(generated, reference);
  const worstBefore = before.summary.worstCost;
  const plan = planCorrections(before);
  const corrected = applyPlan(generated, plan);
  const after = correspondFeatures(corrected, reference);
  assert.ok(after.summary.worstCost < worstBefore, "worst-feature error strictly decreased");
  assert.equal(after.summary.perfect, true, "and reached perfect (all targets known -> one pass suffices)");
});

test("MEASURE: convergence metric on the REAL plan stream confirms the +3% bias is fully pre-correctable (floor -> 0)", () => {
  // Stage 4 of the chain. Rebuild the SAME biased stream the PREVENT test learns from and feed it to the
  // metric (locate -> fix -> prevent -> MEASURE). The generator draws every hole exactly 3% oversized, so
  // the metric must independently report: 15 numeric defects across the stream (no part one-shot yet),
  // ONE biased group, current first-pass RMS ~3%, and a pre-correctable floor of ~0 -- i.e. the metric
  // agrees the systematic error is 100% removable, so pre-correction can reach one-shot.
  const BIAS = 1.03;
  const intendedDiameters = [5, 6, 8, 10, 12, 4, 7, 9, 11, 3, 6.5, 8.5, 10.5, 5.5, 9.5];
  const plans = intendedDiameters.map((d, i) => {
    const reference = [F(`R${i}`, "hole", { diameter: d })];
    const generated = [F(`G${i}`, "hole", { diameter: d * BIAS })];
    return planCorrectionsFrom(generated, reference);
  });

  const conv = oneShotConvergence(plans);
  assert.equal(conv.firstPass.nParts, 15);
  assert.equal(conv.firstPass.oneShotCleanParts, 0, "no part is one-shot before pre-correction");
  assert.equal(conv.bound.biasedGroupCount, 1, "metric flags the one systematic bias the PREVENT stage learns");
  assert.ok(Math.abs(conv.bound.currentRmsPct - 3) < 1e-9, "current first-pass RMS == the +3% bias");
  assert.ok(conv.bound.precorrectedFloorRmsPct < 1e-9, "fully systematic -> pre-correctable floor is ~0 (one-shot reachable)");
  assert.ok(Math.abs(conv.bound.removableRmsPct - 3) < 1e-9, "the full 3% is removable");
  // honesty invariant: the floor is a bound, never below zero, never above the current error.
  assert.ok(conv.bound.precorrectedFloorRmsPct >= 0 && conv.bound.precorrectedFloorRmsPct <= conv.bound.currentRmsPct);

  // STRUCTURAL fix proof on REAL emitter output: a part with a genuine missing feature + a spurious extra
  // must NOT be scored one-shot clean (planCorrections puts these in addFeatures[]/removeFeatures[], NOT
  // setEdits[]). This is the regression guard for the contract bug the scrutiny gate caught.
  const ref = referencePart();
  const flawed = [
    F("g1", "hole", { diameter: 10, depth: 20, x: 0, y: 0 }), // perfect
    F("g2", "hole", { diameter: 6, depth: 15, x: 30, y: 0 }), // perfect
    F("g3", "pocket", { width: 50, length: 40, depth: 12 }), // perfect
    F("g4", "chamfer", { size: 1.5 }), // perfect
    F("g9", "boss", { height: 4 }), // hallucinated extra; fillet R1 is MISSING
  ];
  const structuralPlan = planCorrectionsFrom(flawed, ref);
  assert.equal(structuralPlan.summary.setCount, 0, "no numeric/categorical edits -- only structural misses");
  assert.ok(structuralPlan.summary.addCount + structuralPlan.summary.removeCount >= 2, "1 missing + 1 extra");
  const sConv = oneShotConvergence([structuralPlan]);
  assert.equal(sConv.perPart[0].numericDefects, 0);
  assert.ok(sConv.perPart[0].structuralDefects >= 2, "structural defects counted from addFeatures/removeFeatures");
  assert.equal(sConv.firstPass.oneShotCleanParts, 0, "a structurally-wrong part is NOT one-shot clean");
});
