/**
 * CAMToleranceStackPropagatorEngine tests — CAM-AI-TRAINING-MS0/U-CAMT-TOL
 */
import { describe, it, expect } from "vitest";
import { CAMToleranceStackPropagatorEngine } from "../engines/CAMToleranceStackPropagatorEngine.js";

const engine = new CAMToleranceStackPropagatorEngine();

describe("CAMToleranceStackPropagatorEngine", () => {

  it("budgetForOp returns the documented Sandvik/Mitutoyo value for canonical ops", () => {
    expect(engine.budgetForOp("face")).toBe(0.05);
    expect(engine.budgetForOp("bore")).toBe(0.02);
    expect(engine.budgetForOp("ream")).toBe(0.015);
    expect(engine.budgetForOp("scallop_3d")).toBe(0.010);
    expect(engine.budgetForOp("wedm_2axis")).toBe(0.003);
    expect(engine.budgetForOp("probe_wcs")).toBe(0.001);
  });

  it("budgetForOp returns the conservative 0.10 mm default for unknown ops", () => {
    expect(engine.budgetForOp("unknown_op_id")).toBe(0.10);
  });

  it("propagate(['face'], 0.10) = ok with final 0.05 mm < 0.10 tolerance", () => {
    const r = engine.propagate(["face"], 0.10);
    expect(r.ok).toBe(true);
    expect(r.finalCumulativeMm).toBeCloseTo(0.05, 6);
    expect(r.violators).toEqual([]);
  });

  it("propagate accumulates via RSS (sqrt of sum of squares)", () => {
    // face=0.05, drill=0.05 → RSS = sqrt(0.0025 + 0.0025) = sqrt(0.005) ≈ 0.0707
    const r = engine.propagate(["face", "drill"], 0.10);
    expect(r.finalCumulativeMm).toBeCloseTo(Math.sqrt(0.005), 4);
    expect(r.ok).toBe(true);
  });

  it("propagate flags violators when cumulative exceeds print tolerance", () => {
    // 3 face ops: RSS = sqrt(0.0025 * 3) ≈ 0.0866. With 0.05 print tol → violation at op 1.
    const r = engine.propagate(["face", "face", "face"], 0.05);
    expect(r.ok).toBe(false);
    expect(r.violators.length).toBeGreaterThan(0);
  });

  it("propagate marks each step's exceedsPrint when cumulative > printTol", () => {
    const r = engine.propagate(["drill", "drill", "drill", "drill"], 0.05);
    const stepsExceeding = r.steps.filter((s) => s.exceedsPrint);
    expect(stepsExceeding.length).toBeGreaterThan(0);
  });

  it("propagate WEDM 2axis (0.003) is well within tight 0.005 print tolerance", () => {
    const r = engine.propagate(["wedm_2axis"], 0.005);
    expect(r.ok).toBe(true);
    expect(r.finalCumulativeMm).toBeCloseTo(0.003, 6);
  });

  it("propagate sinker_edm (0.005) flagged when print tolerance is 0.003 mm", () => {
    const r = engine.propagate(["sinker_edm"], 0.003);
    expect(r.ok).toBe(false);
    expect(r.violators).toContain("sinker_edm");
  });

  it("propagate empty op list = final cumulative 0 + ok=true (no work done)", () => {
    const r = engine.propagate([], 0.10);
    expect(r.steps).toEqual([]);
    expect(r.finalCumulativeMm).toBe(0);
    expect(r.ok).toBe(true);
  });

  it("propagate rejects non-positive print tolerance (ok=false even without ops)", () => {
    const r = engine.propagate(["face"], 0);
    expect(r.ok).toBe(false);
  });

  it("propagate rejects negative print tolerance", () => {
    expect(engine.propagate(["face"], -0.05).ok).toBe(false);
  });

  it("propagate carries cumulativeMm strictly monotone-increasing along the chain", () => {
    const r = engine.propagate(["drill", "drill", "drill"], 1.0);
    for (let i = 1; i < r.steps.length; i++) {
      expect(r.steps[i].cumulativeMm).toBeGreaterThan(r.steps[i - 1].cumulativeMm);
    }
  });

  it("validate rejects non-object input", () => {
    expect(engine.validate(null)).toMatch(/object/);
    expect(engine.validate({})).toBeNull();
  });

  it("getCapabilities exposes propagate + budget_for_op", () => {
    const names = engine.getCapabilities().map((c) => c.name);
    expect(names).toContain("propagate");
    expect(names).toContain("budget_for_op");
  });
});
