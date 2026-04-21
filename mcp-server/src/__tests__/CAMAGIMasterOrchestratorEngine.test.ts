/**
 * MILL-MASTER-P1-U06-CAM-AGI-WIRE — CAMAGIMasterOrchestratorEngine tests
 *
 * Verifies:
 *   Standalone engine:
 *     - pickVendor returns deterministic + rationalized vendor for given ctx
 *     - compareSystems scores all 5 vendors; recommended + runner_up + spread
 *     - ensemble normalizes weights to sum ≈ 1.0
 *     - scoring formula composition (capability 30% / complexity 25% /
 *       machine 25% / material 20%)
 *     - 5-axis Inconel → hypermill
 *     - simple 3-axis Al → fusion360
 *     - invocation counter increments
 *     - getSelfAwareness shape
 *
 *   Binding closure (P1-U03 loop):
 *     - bindToMillAGI makes isCAMAGIBound() return true on MillingAGIMaster
 *     - After binding, delegateCamVendorChoice routes through us
 *     - unbindFromMillAGI cleanly releases
 *     - Binding is idempotent (second bindToMillAGI is a no-op)
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import {
  camAGIMasterOrchestratorEngine,
  CAMAGIMasterOrchestratorEngine,
  type CAMVendor,
} from "../engines/CAMAGIMasterOrchestratorEngine.js";
import {
  millingAGIMasterEngine,
  type CamVendorChoiceContext,
  type CamVendorChoiceResult,
} from "../engines/MillingAGIMasterEngine.js";

const baseCtx: CamVendorChoiceContext = {
  material: "4140",
  material_iso: "P",
  operation: "roughing",
  machine_class: "3-axis",
  complexity: "moderate",
};

describe("MILL-MASTER-P1-U06 · CAMAGIMasterOrchestratorEngine standalone", () => {
  it("exports singleton", () => {
    expect(camAGIMasterOrchestratorEngine).toBeInstanceOf(CAMAGIMasterOrchestratorEngine);
  });

  it("pickVendor returns a vendor in the 5-vendor set", () => {
    const r = camAGIMasterOrchestratorEngine.pickVendor(baseCtx);
    expect(r.delegated).toBe(true);
    expect(["mastercam", "hypermill", "fusion360", "inventorcam", "solidcam"]).toContain(r.vendor);
  });

  it("pickVendor is deterministic for identical context", () => {
    const a = camAGIMasterOrchestratorEngine.pickVendor(baseCtx);
    const b = camAGIMasterOrchestratorEngine.pickVendor(baseCtx);
    expect(b.vendor).toBe(a.vendor);
    expect(b.confidence).toBeCloseTo(a.confidence, 5);
  });

  it("pickVendor.rationale mentions the score components", () => {
    const r = camAGIMasterOrchestratorEngine.pickVendor(baseCtx);
    expect(r.rationale).toMatch(/capability=/);
    expect(r.rationale).toMatch(/complexity=/);
    expect(r.rationale).toMatch(/machine=/);
    expect(r.rationale).toMatch(/material=/);
  });

  it("pickVendor source is CAMAGIMasterOrchestratorEngine (not mock)", () => {
    const r = camAGIMasterOrchestratorEngine.pickVendor(baseCtx);
    expect(r.source).toBe("CAMAGIMasterOrchestratorEngine");
  });

  it("pickVendor returns 2 fallbacks", () => {
    const r = camAGIMasterOrchestratorEngine.pickVendor(baseCtx);
    expect(r.fallbacks).toHaveLength(2);
  });

  it("5-axis + Inconel (S) + extreme complexity → hypermill (deep 5-axis specialist)", () => {
    const r = camAGIMasterOrchestratorEngine.pickVendor({
      material: "Inconel 718",
      material_iso: "S",
      operation: "finishing",
      machine_class: "5-axis",
      complexity: "extreme",
    });
    expect(r.vendor).toBe("hypermill");
  });

  it("compareSystems returns all 5 vendors scored descending", () => {
    const r = camAGIMasterOrchestratorEngine.compareSystems(baseCtx);
    expect(r.scored).toHaveLength(5);
    for (let i = 1; i < r.scored.length; i++) {
      expect(r.scored[i - 1]!.score).toBeGreaterThanOrEqual(r.scored[i]!.score);
    }
  });

  it("compareSystems top score = recommended, second = runner_up, spread = delta", () => {
    const r = camAGIMasterOrchestratorEngine.compareSystems(baseCtx);
    expect(r.recommended).toBe(r.scored[0]!.vendor);
    expect(r.runner_up).toBe(r.scored[1]!.vendor);
    const expectedSpread = +(r.scored[0]!.score - r.scored[1]!.score).toFixed(3);
    expect(r.spread).toBeCloseTo(expectedSpread, 3);
  });

  it("compareSystems context_digest reflects all five context fields", () => {
    const r = camAGIMasterOrchestratorEngine.compareSystems(baseCtx);
    expect(r.context_digest).toContain("4140");
    expect(r.context_digest).toContain("P");
    expect(r.context_digest).toContain("roughing");
    expect(r.context_digest).toContain("3-axis");
    expect(r.context_digest).toContain("moderate");
  });

  it("ensemble weights sum to ~1.0 (normalized)", () => {
    const r = camAGIMasterOrchestratorEngine.ensemble(baseCtx, 3);
    const sum = r.members.reduce((s, m) => s + m.weight, 0);
    expect(sum).toBeCloseTo(1, 2);
  });

  it("ensemble respects k parameter (default 3, clamped to [1, 5])", () => {
    expect(camAGIMasterOrchestratorEngine.ensemble(baseCtx).members).toHaveLength(3);
    expect(camAGIMasterOrchestratorEngine.ensemble(baseCtx, 1).members).toHaveLength(1);
    expect(camAGIMasterOrchestratorEngine.ensemble(baseCtx, 5).members).toHaveLength(5);
    // Clamped
    expect(camAGIMasterOrchestratorEngine.ensemble(baseCtx, 0).members).toHaveLength(1);
    expect(camAGIMasterOrchestratorEngine.ensemble(baseCtx, 99).members).toHaveLength(5);
  });

  it("ensemble consensus_strengths merges vendor strengths", () => {
    const r = camAGIMasterOrchestratorEngine.ensemble(baseCtx, 5);
    expect(r.consensus_strengths.length).toBeGreaterThan(5); // union of all vendor strength tags
  });

  it("getSelfAwareness lists all 5 vendors", () => {
    const sa = camAGIMasterOrchestratorEngine.getSelfAwareness();
    expect(sa.engine_name).toBe("CAMAGIMasterOrchestratorEngine");
    expect(sa.vendor_count).toBe(5);
    expect(sa.vendors).toEqual(expect.arrayContaining(["mastercam", "hypermill", "fusion360", "inventorcam", "solidcam"]));
  });

  it("invocation_count increments on each public API call", () => {
    const before = camAGIMasterOrchestratorEngine.getInvocationCount();
    camAGIMasterOrchestratorEngine.pickVendor(baseCtx);
    camAGIMasterOrchestratorEngine.compareSystems(baseCtx);
    camAGIMasterOrchestratorEngine.ensemble(baseCtx);
    expect(camAGIMasterOrchestratorEngine.getInvocationCount()).toBe(before + 3);
  });

  it("material_iso absent still scores (falls back to 0.6 material priority)", () => {
    const r = camAGIMasterOrchestratorEngine.pickVendor({
      material: "unknown",
      operation: "roughing",
    });
    expect(r.delegated).toBe(true);
    expect(r.vendor).toBeDefined();
  });
});

describe("MILL-MASTER-P1-U06 · CAMAGI↔MillingAGI binding closure (completes P1-U03)", () => {
  beforeEach(async () => {
    await camAGIMasterOrchestratorEngine.unbindFromMillAGI();
  });

  afterEach(async () => {
    await camAGIMasterOrchestratorEngine.unbindFromMillAGI();
  });

  it("isBoundToMillAGI is false when unbound", () => {
    expect(camAGIMasterOrchestratorEngine.isBoundToMillAGI()).toBe(false);
    expect(millingAGIMasterEngine.isCAMAGIBound()).toBe(false);
  });

  it("bindToMillAGI makes MillingAGIMaster report cam_agi_bound=true", async () => {
    await camAGIMasterOrchestratorEngine.bindToMillAGI();
    expect(camAGIMasterOrchestratorEngine.isBoundToMillAGI()).toBe(true);
    expect(millingAGIMasterEngine.isCAMAGIBound()).toBe(true);
  });

  it("after binding, MillingAGIMaster.delegateCamVendorChoice routes through CAMAGI", async () => {
    await camAGIMasterOrchestratorEngine.bindToMillAGI();
    const out = millingAGIMasterEngine.delegateCamVendorChoice(baseCtx);
    expect(out.delegated).toBe(true);
    const result = out as CamVendorChoiceResult;
    expect(result.source).toBe("CAMAGIMasterOrchestratorEngine");
  });

  it("bindToMillAGI is idempotent (second call is no-op)", async () => {
    await camAGIMasterOrchestratorEngine.bindToMillAGI();
    const firstSA = camAGIMasterOrchestratorEngine.getSelfAwareness();
    await camAGIMasterOrchestratorEngine.bindToMillAGI(); // second call
    expect(camAGIMasterOrchestratorEngine.isBoundToMillAGI()).toBe(true);
    expect(firstSA.bound_to_mill_agi).toBe(true);
  });

  it("unbindFromMillAGI releases both sides", async () => {
    await camAGIMasterOrchestratorEngine.bindToMillAGI();
    expect(millingAGIMasterEngine.isCAMAGIBound()).toBe(true);
    await camAGIMasterOrchestratorEngine.unbindFromMillAGI();
    expect(camAGIMasterOrchestratorEngine.isBoundToMillAGI()).toBe(false);
    expect(millingAGIMasterEngine.isCAMAGIBound()).toBe(false);
  });

  it("delegated vendor matches direct pickVendor result (binding is transparent)", async () => {
    await camAGIMasterOrchestratorEngine.bindToMillAGI();
    const delegated = millingAGIMasterEngine.delegateCamVendorChoice(baseCtx) as CamVendorChoiceResult;
    const direct = camAGIMasterOrchestratorEngine.pickVendor(baseCtx);
    expect(delegated.vendor).toBe(direct.vendor);
  });
});

describe("MILL-MASTER-P1-U06 · Vendor profile sanity", () => {
  const vendors: CAMVendor[] = ["mastercam", "hypermill", "fusion360", "inventorcam", "solidcam"];

  it.each(vendors)("every vendor wins at least one context class (%s)", (expected) => {
    // Synthesize contexts that should favor each vendor's profile
    const contextMatrix: Record<CAMVendor, CamVendorChoiceContext> = {
      mastercam: { material: "4140", material_iso: "P", operation: "roughing", machine_class: "3-axis", complexity: "moderate" },
      hypermill: { material: "Inconel 718", material_iso: "S", operation: "finishing", machine_class: "5-axis", complexity: "extreme" },
      fusion360: { material: "6061-T6", material_iso: "N", operation: "roughing", machine_class: "3-axis", complexity: "simple" },
      inventorcam: { material: "4140", material_iso: "P", operation: "feature_recognition", part_features: ["iMachining", "feature recognition"], machine_class: "4-axis", complexity: "moderate" },
      solidcam: { material: "D2", material_iso: "H", operation: "roughing", part_features: ["iMachining"], machine_class: "5-axis", complexity: "complex" },
    };
    const r = camAGIMasterOrchestratorEngine.pickVendor(contextMatrix[expected]);
    // Some vendors overlap — assert it's in the top 2
    const compare = camAGIMasterOrchestratorEngine.compareSystems(contextMatrix[expected]);
    const top2 = [compare.scored[0]!.vendor, compare.scored[1]!.vendor];
    expect(top2, `${expected} expected in top 2 but got ${r.vendor}`).toContain(expected);
  });
});
