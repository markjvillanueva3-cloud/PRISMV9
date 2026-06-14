/**
 * sfc-ensemble-computer.test.mjs — concrete-value tests for the 4th
 * SFC computer kind (ensemble) wrapping iter43's 3 computers.
 *
 * Hand-checked math:
 *   weightedMean([100,200], [0.5,0.5]) = (50+100)/1 = 150
 *   weightedMean([100,200,300], [1,2,3]) = (100+400+900)/6 = 233.333...
 *   sampleStdDev([1,2,3,4,5]) = sqrt((4+1+0+1+4)/4) = sqrt(2.5) ≈ 1.5811
 *
 * For P + face_mill + dia=12.7 + flutes=4 (3 components):
 *   kienzle Vc=182.88 (sfm=600) conf=0.75
 *   table   Vc=182.88 (sfm=600) conf=0.65
 *   vendor  Vc=213.36 (sfm=700) conf=0.82
 *   weighted-mean Vc = (182.88×0.75 + 182.88×0.65 + 213.36×0.82)/2.22
 *                    = 430.9872/2.22 ≈ 194.139
 *   mean conf = 2.22/3 = 0.74
 *
 * @milestone POST-BRIDGE-SYNERGY-MS0/U-SFC-ABSORB-ENSEMBLE
 * @slot echo · @iter 46 · @date 2026-05-27
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ENSEMBLE_SCHEMA_VERSION,
  DISAGREEMENT_PENALTY_FACTOR,
  ENSEMBLE_AGREEMENT_FLOOR,
  ENSEMBLE_AGREEMENT_CEIL,
  weightedMean,
  sampleStdDev,
  agreementFactor,
  ensembleComputer,
  wireEnsembleComputer,
} from "./sfc-ensemble-computer.mjs";

import { createSFCBridge, registerComputer, routeRequest } from "./sfc-node-bridge.mjs";

describe("constants", () => {
  it("ENSEMBLE_SCHEMA_VERSION = 1", () => {
    assert.equal(ENSEMBLE_SCHEMA_VERSION, 1);
  });
  it("DISAGREEMENT_PENALTY_FACTOR = 2", () => {
    assert.equal(DISAGREEMENT_PENALTY_FACTOR, 2);
  });
  it("ENSEMBLE_AGREEMENT_FLOOR = 0", () => {
    assert.equal(ENSEMBLE_AGREEMENT_FLOOR, 0);
  });
  it("ENSEMBLE_AGREEMENT_CEIL = 1", () => {
    assert.equal(ENSEMBLE_AGREEMENT_CEIL, 1);
  });
});

describe("weightedMean", () => {
  it("[100,200] × [0.5,0.5] = 150", () => {
    assert.equal(weightedMean([100, 200], [0.5, 0.5]), 150);
  });
  it("[100,200,300] × [1,2,3] = 233.333... (within 1e-9)", () => {
    const r = weightedMean([100, 200, 300], [1, 2, 3]);
    assert.equal(Math.abs(r - 1400 / 6) < 1e-9, true);
  });
  it("[10] × [1] = 10 (single value)", () => {
    assert.equal(weightedMean([10], [1]), 10);
  });
  it("zero weights → null (div0 guard)", () => {
    assert.equal(weightedMean([10, 20], [0, 0]), null);
  });
  it("empty arrays → null", () => {
    assert.equal(weightedMean([], []), null);
  });
  it("mismatched lengths → null", () => {
    assert.equal(weightedMean([10, 20], [1]), null);
  });
  it("null inputs → null", () => {
    assert.equal(weightedMean(null, null), null);
  });
  it("NaN weight → ignored (filter skips), [10] with weight 5 → 10", () => {
    const r = weightedMean([10, 20], [5, NaN]);
    assert.equal(r, 10);
  });
});

describe("sampleStdDev", () => {
  it("[1,2,3,4,5] → sqrt(2.5) ≈ 1.5811", () => {
    const sd = sampleStdDev([1, 2, 3, 4, 5]);
    assert.equal(Math.abs(sd - Math.sqrt(2.5)) < 1e-9, true);
  });
  it("[10,10,10] → 0 (all identical)", () => {
    assert.equal(sampleStdDev([10, 10, 10]), 0);
  });
  it("[1,2] → sqrt(0.5)", () => {
    assert.equal(Math.abs(sampleStdDev([1, 2]) - Math.sqrt(0.5)) < 1e-9, true);
  });
  it("single value → null", () => {
    assert.equal(sampleStdDev([5]), null);
  });
  it("empty → null", () => {
    assert.equal(sampleStdDev([]), null);
  });
  it("null → null", () => {
    assert.equal(sampleStdDev(null), null);
  });
});

describe("agreementFactor", () => {
  it("identical values → 1.0 (full agreement)", () => {
    assert.equal(agreementFactor([100, 100, 100]), 1);
  });
  it("[100, 100] → 1.0 (zero variation)", () => {
    assert.equal(agreementFactor([100, 100]), 1);
  });
  it("[100, 200, 300] (high variance) → strongly penalized", () => {
    const f = agreementFactor([100, 200, 300]);
    assert.equal(f < 0.5, true);
  });
  it("clamped at floor 0 (large disagreement)", () => {
    const f = agreementFactor([1, 100, 10000]);
    assert.equal(f, 0);
  });
  it("single value → 1.0 (default, no penalty)", () => {
    assert.equal(agreementFactor([100]), 1);
  });
  it("null → 1.0 (default, no penalty)", () => {
    assert.equal(agreementFactor(null), 1);
  });
  it("mean=0 → 0 (degenerate case)", () => {
    assert.equal(agreementFactor([0, 0, 0]), 0);
  });
});

describe("ensembleComputer", () => {
  const validReq = { materialIsoGroup: "P", toolDiameterMm: 12.7, operation: "face_mill", toolFlutes: 4 };

  it("P face_mill + 3 components → non-null result", () => {
    assert.notEqual(ensembleComputer(validReq), null);
  });
  it("source = 'ensemble'", () => {
    assert.equal(ensembleComputer(validReq).source, "ensemble");
  });
  it("componentCount = 3 (kienzle + table + vendor all valid)", () => {
    assert.equal(ensembleComputer(validReq).componentCount, 3);
  });
  it("Vc ≈ 194.139 m/min hand-checked (weighted blend)", () => {
    const r = ensembleComputer(validReq);
    // (182.88×0.75 + 182.88×0.65 + 213.36×0.82) / 2.22 = 430.9872 / 2.22 ≈ 194.139
    const expected = (182.88 * 0.75 + 182.88 * 0.65 + 213.36 * 0.82) / 2.22;
    assert.equal(Math.abs(r.Vc_m_per_min - expected) < 1e-9, true);
  });
  it("confidence < max(component confidences) due to agreement penalty", () => {
    const r = ensembleComputer(validReq);
    // mean conf = 0.74; agreement < 1 (vendor disagrees); ensemble conf < 0.82
    assert.equal(r.confidence < 0.82, true);
  });
  it("confidence > 0 (some agreement remains)", () => {
    const r = ensembleComputer(validReq);
    assert.equal(r.confidence > 0, true);
  });
  it("components array exposed with per-source confidence", () => {
    const r = ensembleComputer(validReq);
    const kienzleEntry = r.components.find((c) => c.source === "kienzle");
    assert.equal(kienzleEntry.confidence, 0.75);
  });
  it("invalid req (missing iso) → null (all components null)", () => {
    assert.equal(ensembleComputer({ toolDiameterMm: 12.7, operation: "face_mill" }), null);
  });
  it("rationale includes 'ensemble' + componentCount", () => {
    const r = ensembleComputer(validReq);
    assert.equal(r.rationale.includes("ensemble: 3 components"), true);
  });
  it("variability: 3 different ISO groups all produce valid ensemble", () => {
    for (const iso of ["P", "M", "N"]) {
      const r = ensembleComputer({ materialIsoGroup: iso, toolDiameterMm: 12.7, operation: "face_mill" });
      assert.notEqual(r, null);
      assert.equal(r.source, "ensemble");
    }
  });
});

describe("LIVE: ensemble wired through iter39 SFC bridge", () => {
  const validReq = { materialIsoGroup: "P", toolDiameterMm: 12.7, operation: "face_mill", toolFlutes: 4 };

  it("wireEnsembleComputer registers 'ensemble' into bridge", () => {
    const b = createSFCBridge();
    const wired = wireEnsembleComputer(b, registerComputer);
    assert.notEqual(wired, null);
    assert.equal(typeof wired.computers.ensemble, "function");
  });
  it("LIVE routeRequest preferred='ensemble' → source='ensemble'", () => {
    const b = createSFCBridge();
    const wired = wireEnsembleComputer(b, registerComputer);
    const r = routeRequest(wired, { ...validReq, preferredSource: "ensemble" });
    assert.equal(r.ok, true);
    assert.equal(r.source, "ensemble");
  });
  it("LIVE ensemble result has _all 6_ ISO groups routable", () => {
    const b = createSFCBridge();
    const wired = wireEnsembleComputer(b, registerComputer);
    for (const iso of ["P", "M", "K", "N", "S", "H"]) {
      const r = routeRequest(wired, { materialIsoGroup: iso, toolDiameterMm: 12.7, operation: "face_mill", preferredSource: "ensemble" });
      assert.equal(r.ok, true);
    }
  });
  it("LIVE bad bridge → null", () => {
    assert.equal(wireEnsembleComputer(null, registerComputer), null);
  });
  it("LIVE bad fn → null", () => {
    assert.equal(wireEnsembleComputer(createSFCBridge(), "not-fn"), null);
  });
});
