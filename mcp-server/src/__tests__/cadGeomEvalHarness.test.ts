import { describe, it, expect } from "vitest";
import { existsSync, statSync, readFileSync } from "node:fs";
import {
  geomEvalHeldOut, gateGeomEval, normGeomKey,
  DEFAULT_MIN_PASS_FRACTION, type ComparisonResultLike, type GeomCompareFn,
} from "../engines/cad/cadGeomEvalHarness.js";

/**
 * U-DELTA-EVAL-HARNESS geometry modality. The pure aggregate/gate/held-out-discipline logic is tested
 * with a MOCK compareFn (no files); ONE LIVE test exercises the real CADGeometryComparisonEngine on a
 * frozen geom-50 part (compare-to-self -> ~perfect), proving the composition works on real B-Rep data.
 */

// Mock comparator: a predicted path containing "match" scores perfect; otherwise it fails.
function mockCompare(_truth: string, pred: string): ComparisonResultLike {
  const ok = pred.includes("match");
  return { overallPassed: ok, passRate: ok ? 1 : 0.5, topologySimilarity: ok ? 1 : 0.6 };
}

const held = [{ abs_path: "H:/p/A.step" }, { abs_path: "H:/p/B.step" }];

describe("cadGeomEvalHarness (held-out geometry eval)", () => {
  it("scores held parts via injected compareFn; perfect matches -> passFraction 1, gate PASS", () => {
    const r = geomEvalHeldOut(
      { "H:/p/A.step": "pred/A_match.step", "H:/p/B.step": "pred/B_match.step" },
      held, { compareFn: mockCompare },
    );
    expect(r.scored).toBe(2);
    expect(r.aggregate.passFraction).toBe(1);
    expect(r.aggregate.meanTopologySimilarity).toBe(1);
    expect(gateGeomEval(r).pass).toBe(true);
  });

  it("held-out discipline: a prediction for a NON-held part is flagged; a held part w/o prediction is missing", () => {
    const r = geomEvalHeldOut(
      { "H:/p/A.step": "pred/A_match.step", "H:/p/NOTHELD.step": "x" },
      held, { compareFn: mockCompare },
    );
    expect(r.nonHeldPredictions).toHaveLength(1);
    expect(r.scored).toBe(1);
    expect(r.missingPrediction).toContain(normGeomKey("H:/p/B.step"));
    expect(gateGeomEval(r).reasons.some((x) => x.includes("NON-held"))).toBe(true);
  });

  it("failing geometry -> passFraction below floor -> gate FAIL with reason", () => {
    const r = geomEvalHeldOut(
      { "H:/p/A.step": "pred/A_bad.step", "H:/p/B.step": "pred/B_bad.step" },
      held, { compareFn: mockCompare },
    );
    expect(r.aggregate.passFraction).toBe(0);
    const g = gateGeomEval(r);
    expect(g.pass).toBe(false);
    expect(g.reasons.some((x) => x.includes("passFraction"))).toBe(true);
  });

  it("a compare() error is surfaced (compareErrors), not folded into missingPrediction (R12)", () => {
    const throwCompare: GeomCompareFn = () => { throw new Error("STEP parse fail"); };
    const r = geomEvalHeldOut({ "H:/p/A.step": "pred/A.step" }, [{ abs_path: "H:/p/A.step" }], { compareFn: throwCompare });
    expect(r.compareErrors).toHaveLength(1);
    expect(r.scored).toBe(0);
    expect(gateGeomEval(r).reasons.some((x) => x.includes("errored"))).toBe(true);
  });

  it("zero-scored + null/empty inputs fail loud and never throw", () => {
    const r = geomEvalHeldOut({}, held, { compareFn: mockCompare });
    expect(r.scored).toBe(0);
    expect(gateGeomEval(r).pass).toBe(false);
    expect(gateGeomEval(r).reasons.some((x) => x.includes("no held parts were scorable"))).toBe(true);
    expect(geomEvalHeldOut(null, null, { compareFn: mockCompare }).heldTotal).toBe(0);
  });

  it("normGeomKey: case/separator-insensitive FULL path (distinct files never collide)", () => {
    expect(normGeomKey("H:\\P\\Foo.STEP")).toBe("h:/p/foo.step");
    expect(normGeomKey("a/test_box.step")).not.toBe(normGeomKey("a/test_box.iges"));
  });

  it("defaults exported", () => {
    expect(DEFAULT_MIN_PASS_FRACTION).toBe(0.9);
  });

  it("LIVE: real CADGeometryComparisonEngine compare-to-self on a geom-50 part scores ~perfect", () => {
    const geom = JSON.parse(readFileSync("H:/prism/state/shared/cad-holdout/geom-50.json", "utf8")) as { held: Array<{ abs_path: string }> };
    // pick the SMALLEST existing .step/.stp held file to keep the parse fast
    const candidates = geom.held
      .map((e) => e.abs_path)
      .filter((p) => existsSync(p) && /\.(step|stp)$/i.test(p))
      .map((p) => ({ p, size: statSync(p).size }))
      .sort((a, b) => a.size - b.size);
    expect(candidates.length, "need an existing .step/.stp geom-50 file").toBeGreaterThan(0);
    const truth = candidates[0].p;
    // real compareFn (default), compare-to-self: identical file -> all metrics pass.
    const r = geomEvalHeldOut({ [truth]: truth }, [{ abs_path: truth }]);
    expect(r.scored).toBe(1);
    expect(r.perPart[0].overallPassed).toBe(true);
    expect(r.perPart[0].passRate).toBe(1);
    expect(gateGeomEval(r).pass).toBe(true);
  }, 60000);
});
