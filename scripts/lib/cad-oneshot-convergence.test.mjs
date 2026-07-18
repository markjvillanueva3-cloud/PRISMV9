/**
 * Tests for cad-oneshot-convergence.mjs -- HAND-COMPUTED reference values (R9: a test that only checks
 * "toBeDefined" is worthless). Every expected number below is derived by hand in the comment above it.
 *
 * IMPORTANT: fixtures use the REAL planCorrections() shape (cad-correction-plan.mjs) -- three separate
 * arrays setEdits[] / addFeatures[] / removeFeatures[]. Structural (missing/extra) defects live in
 * addFeatures/removeFeatures, NOT inside setEdits.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { perPartMetrics, oneShotConvergence, formatConvergenceReport } from "./cad-oneshot-convergence.mjs";

/** numeric param set-edit (numeric:true carries a signed pctDelta) */
const nEdit = (pctDelta, featureType = "hole", parameter = "diameter") => ({
  featureType, parameter, numeric: true, pctDelta,
});
/** categorical param set-edit (numeric:false, no pctDelta) */
const cEdit = (parameter = "type", featureType = "hole") => ({ featureType, parameter, numeric: false, to: "counterbore" });
/** a missing/extra structural feature entry (addFeatures[]/removeFeatures[] element) */
const feat = (id = "X", featureType = "slot") => ({ id, featureType });
/** a planCorrections()-shaped result */
const plan = (setEdits = [], addFeatures = [], removeFeatures = []) => ({ setEdits, addFeatures, removeFeatures });

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `expected ${a} ~= ${b} (tol ${tol})`);

describe("perPartMetrics", () => {
  it("counts numeric + categorical + structural defects, and RMS/max |pctDelta|, per part", () => {
    // Part 0: numeric +2, -4 (in setEdits) and one structural ADD (in addFeatures).
    //   numericDefects=2, categoricalDefects=0, structuralDefects=1, total=3
    //   rms = sqrt((2^2 + 4^2)/2) = sqrt(20/2) = sqrt(10) = 3.16227766... ; max = 4
    const per = perPartMetrics([
      plan([nEdit(2), nEdit(-4)], [feat("R1", "fillet")], []),
      plan(),                                            // one-shot clean (all arrays empty)
      plan([nEdit(1)], [], [feat("g9", "boss")]),        // 1 numeric + 1 structural remove
    ]);
    assert.equal(per.length, 3);
    assert.deepEqual(
      { n: per[0].numericDefects, c: per[0].categoricalDefects, s: per[0].structuralDefects, t: per[0].totalDefects },
      { n: 2, c: 0, s: 1, t: 3 },
    );
    close(per[0].rmsPctDelta, Math.sqrt(10));
    assert.equal(per[0].maxPctDelta, 4);
    assert.deepEqual(
      { n: per[1].numericDefects, t: per[1].totalDefects, rms: per[1].rmsPctDelta, max: per[1].maxPctDelta },
      { n: 0, t: 0, rms: 0, max: 0 },
    );
    assert.equal(per[2].numericDefects, 1);
    assert.equal(per[2].structuralDefects, 1);
    assert.equal(per[2].totalDefects, 2);
  });

  it("a part with ONLY a categorical param defect is a defect, not a one-shot-clean part (regression guard)", () => {
    // Before the contract fix this returned totalDefects 0 -> falsely "one-shot clean". It must be 1.
    const per = perPartMetrics([plan([cEdit("type")])]);
    assert.equal(per[0].numericDefects, 0);
    assert.equal(per[0].categoricalDefects, 1);
    assert.equal(per[0].structuralDefects, 0);
    assert.equal(per[0].totalDefects, 1);
    assert.equal(per[0].rmsPctDelta, 0); // categorical has no pctDelta
  });

  it("a part that is ONLY missing a feature is NOT one-shot clean (structural read from addFeatures)", () => {
    const per = perPartMetrics([plan([], [feat("R1", "fillet")], [])]);
    assert.equal(per[0].numericDefects, 0);
    assert.equal(per[0].structuralDefects, 1);
    assert.equal(per[0].totalDefects, 1);
  });

  it("throws on non-array input", () => {
    assert.throws(() => perPartMetrics(null), TypeError);
    assert.throws(() => perPartMetrics({}), TypeError);
  });
});

describe("oneShotConvergence -- trend", () => {
  it("fits a perfect improving line defects=[5,4,3,2,1] -> slope -1, intercept 5, r2 1, projects 1 more part", () => {
    // part i has (5-i) STRUCTURAL defects (addFeatures) -> ys=[5,4,3,2,1].
    const plans = [5, 4, 3, 2, 1].map((k) =>
      plan([], Array.from({ length: k }, (_, j) => feat(`R${k}_${j}`))),
    );
    const r = oneShotConvergence(plans);
    // xs=[0..4], ys=[5,4,3,2,1]: slope=-1, intercept=5, r2=1
    close(r.trend.slope, -1);
    close(r.trend.intercept, 5);
    close(r.trend.r2, 1);
    assert.equal(r.trend.direction, "improving");
    // xZero = -5/-1 = 5 ; partsRemaining = max(0, ceil(5) - (5-1)) = 5-4 = 1
    assert.equal(r.trend.projectedPartsToOneShot, 1);
    assert.equal(r.firstPass.oneShotCleanParts, 0);
    close(r.firstPass.oneShotRate, 0);
  });

  it("REFUSES to project a horizon on a noisy fit (improving direction but r2 below floor)", () => {
    // defects=[3,0,3,0,3,0] over [0..5]: slope=-27/105=-0.257..(improving), r2=729/8505=0.0857..(<0.30)
    const plans = [3, 0, 3, 0, 3, 0].map((k) =>
      plan([], Array.from({ length: k }, (_, j) => feat(`R${k}_${j}`))),
    );
    const r = oneShotConvergence(plans);
    assert.equal(r.trend.direction, "improving");
    close(r.trend.slope, -27 / 105);
    close(r.trend.r2, 729 / 8505);
    assert.equal(r.trend.projectedPartsToOneShot, null);
    assert.match(r.trend.note, /REFUSED/);
  });

  it("single part cannot fit a trend", () => {
    const r = oneShotConvergence([plan([nEdit(2)])]);
    assert.equal(r.trend.slope, 0);
    assert.equal(r.trend.projectedPartsToOneShot, null);
    assert.match(r.trend.note, /need >=2 parts/);
  });
});

describe("oneShotConvergence -- honest bound (systematic vs random)", () => {
  it("a fully systematic +2% bias (n=8, mean 2, stdev 0.5) -> floor = random residual 0.5, removable 2.0", () => {
    // 8 numeric edits hole::diameter: four +1.5, four +2.5 -> mean 2.0, stdev 0.5, all same-sign -> BIASED.
    //   E[x^2] = mean^2 + stdev^2 = 4 + 0.25 = 4.25 -> currentRmsPct = sqrt(4.25) = 2.0615528128...
    //   after pre-correction (mean->0): E = stdev^2 = 0.25 -> floor = sqrt(0.25) = 0.5
    //   removable = sqrt(4.25 - 0.25) = sqrt(4) = 2.0
    const edits = [1.5, 1.5, 1.5, 1.5, 2.5, 2.5, 2.5, 2.5].map((p) => nEdit(p));
    const r = oneShotConvergence([plan(edits)]);
    assert.equal(r.bound.numericEditCount, 8);
    assert.equal(r.bound.biasedGroupCount, 1);
    close(r.bound.currentRmsPct, Math.sqrt(4.25));
    close(r.bound.precorrectedFloorRmsPct, 0.5);
    close(r.bound.removableRmsPct, 2.0);
    close(r.bound.reductionPct, Math.sqrt(4.25) - 0.5);
    assert.match(r.bound.note, /RE-GENERATION|post-hoc/);
  });

  it("an UNBIASED (mixed-sign) group is NOT falsely claimed removable -> removable 0, floor = current", () => {
    // 8 edits slot::width: four +2, four -2 -> mean 0, stdev 2, same-sign 0.5 -> NOT biased.
    //   current = sqrt(mean^2+stdev^2) = sqrt(0+4) = 2 ; nothing removable -> floor 2, removable 0.
    const edits = [2, -2, 2, -2, 2, -2, 2, -2].map((p) => nEdit(p, "slot", "width"));
    const r = oneShotConvergence([plan(edits)]);
    assert.equal(r.bound.biasedGroupCount, 0);
    close(r.bound.currentRmsPct, 2);
    close(r.bound.precorrectedFloorRmsPct, 2);
    close(r.bound.removableRmsPct, 0);
    close(r.bound.reductionPct, 0);
  });

  it("thin evidence (n<minSamples) is NOT declared biased -> no fabricated reduction", () => {
    // only 3 edits, all +3% -> consistent sign but n=3 < 8 -> detectSystematicBias leaves it unbiased.
    const r = oneShotConvergence([plan([nEdit(3), nEdit(3), nEdit(3)])]);
    assert.equal(r.bound.biasedGroupCount, 0);
    close(r.bound.removableRmsPct, 0);           // current == floor: sqrt(9)=3 both
    close(r.bound.currentRmsPct, 3);
    close(r.bound.precorrectedFloorRmsPct, 3);
  });
});

describe("oneShotConvergence -- edge cases", () => {
  it("empty stream: no throw, zeros, and a 'no parts' summary", () => {
    const r = oneShotConvergence([]);
    assert.equal(r.firstPass.nParts, 0);
    assert.equal(r.firstPass.oneShotRate, 0);
    assert.equal(r.bound.numericEditCount, 0);
    assert.equal(r.bound.currentRmsPct, 0);
    assert.match(r.summary.line, /no parts/);
    assert.match(r.bound.note, /one-shot clean/);
  });

  it("all parts one-shot clean -> rate 1.0, nothing to bound", () => {
    const r = oneShotConvergence([plan(), plan(), plan()]);
    close(r.firstPass.oneShotRate, 1);
    assert.equal(r.firstPass.oneShotCleanParts, 3);
    assert.equal(r.bound.numericEditCount, 0);
    assert.equal(r.trend.direction, "flat");
  });

  it("formatConvergenceReport renders the key lines without throwing", () => {
    const r = oneShotConvergence([plan([nEdit(2), nEdit(2)]), plan([nEdit(2)]), plan()]);
    const txt = formatConvergenceReport(r);
    assert.match(txt, /CAD one-shot convergence/);
    assert.match(txt, /honest bound/);
    assert.match(txt, /trend/);
  });
});
