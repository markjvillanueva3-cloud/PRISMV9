import { describe, it, expect } from "vitest";
import { computeBoost, HPCVcBoostCalculator, type HPCBoostInput } from "./HPCVcBoostCalculator.js";

describe("HPCVcBoostCalculator", () => {
  describe("below-HPC-threshold regime (no boost)", () => {
    it("pressure 20 bar (< 35 threshold) → boost=1.0 + active=false", () => {
      const r = computeBoost({ iso_group: "S", pressure_bar: 20, flow_L_min: 60 });
      expect(r.vc_boost_multiplier.value).toBe(1.0);
      expect(r.active).toBe(false);
      expect(r.notes.join("|")).toContain("below");
    });
    it("zero pressure → boost=1.0 + active=false", () => {
      const r = computeBoost({ iso_group: "S", pressure_bar: 0, flow_L_min: 60 });
      expect(r.vc_boost_multiplier.value).toBe(1.0);
      expect(r.active).toBe(false);
    });
  });

  describe("HPC-active regime — variability across 3+ ISO groups", () => {
    it("S-superalloy + 200 bar + reference flow + centered → largest boost", () => {
      const r = computeBoost({ iso_group: "S", pressure_bar: 200, flow_L_min: 60, jet_aim: "centered" });
      expect(r.active).toBe(true);
      expect(r.vc_boost_multiplier.value).toBeGreaterThan(1.5);
      // (200-35)/35 = 4.71 clamped to 2.0; flow 60/60=1.0; aim 1.0; k=1.0 → 1 + 1·2·1·1 = 3.0 capped at 2.5
      expect(r.vc_boost_multiplier.value).toBe(2.5);
      expect(r.notes.join("|")).toContain("clamped");
    });
    it("K-cast-iron HPC has minimal boost (k=0.10)", () => {
      const r = computeBoost({ iso_group: "K", pressure_bar: 100, flow_L_min: 30 });
      expect(r.active).toBe(true);
      // (100-35)/35=1.857 clamped at 2.0 → use 1.857; flow 30/30=1.0; aim 1.0; k=0.10 → 1 + 0.10·1.857·1·1 = 1.186
      expect(r.vc_boost_multiplier.value).toBeCloseTo(1 + 0.10 * (100 - 35) / 35, 3);
    });
    it("P-steel moderate boost", () => {
      const r = computeBoost({ iso_group: "P", pressure_bar: 100, flow_L_min: 40 });
      // k=0.30 → boost ≈ 1 + 0.30 · 1.857 · 1 · 1 = 1.557
      expect(r.vc_boost_multiplier.value).toBeGreaterThan(1.4);
      expect(r.vc_boost_multiplier.value).toBeLessThan(1.7);
    });
  });

  describe("jet-aim degrades boost", () => {
    it("off_center → 65% of centered effective boost-add", () => {
      const centered = computeBoost({ iso_group: "S", pressure_bar: 70, flow_L_min: 60, jet_aim: "centered" });
      const offcenter = computeBoost({ iso_group: "S", pressure_bar: 70, flow_L_min: 60, jet_aim: "off_center" });
      const dCentered = centered.vc_boost_multiplier.value - 1;
      const dOff = offcenter.vc_boost_multiplier.value - 1;
      expect(dOff / dCentered).toBeCloseTo(0.65, 2);
    });
    it("unaimed → 30% of centered + named warning", () => {
      const r = computeBoost({ iso_group: "S", pressure_bar: 70, flow_L_min: 60, jet_aim: "unaimed" });
      expect(r.aim_factor).toBe(0.30);
      expect(r.notes.join("|")).toContain("unaimed");
    });
    it("default aim is centered when omitted", () => {
      const r = computeBoost({ iso_group: "S", pressure_bar: 70, flow_L_min: 60 });
      expect(r.aim_factor).toBe(1.0);
    });
  });

  describe("flow-rate degrades boost", () => {
    it("flow < 50% of reference clamps factor at 0.5 + emits note", () => {
      const r = computeBoost({ iso_group: "S", pressure_bar: 70, flow_L_min: 5, jet_aim: "centered" });
      expect(r.flow_factor).toBe(0.5);
      expect(r.notes.join("|")).toContain("saturates");
    });
    it("flow at reference → factor = 1.0", () => {
      const r = computeBoost({ iso_group: "P", pressure_bar: 70, flow_L_min: 40 });
      expect(r.flow_factor).toBe(1.0);
    });
  });

  describe("R12 fail-loud invalid input", () => {
    it("unknown iso_group → boost=1 + diagnostic", () => {
      const r = computeBoost({ iso_group: "ZZ" as HPCBoostInput["iso_group"], pressure_bar: 70, flow_L_min: 40 });
      expect(r.vc_boost_multiplier.value).toBe(1);
      expect(r.notes.join("|")).toContain("unknown iso_group: ZZ");
    });
    it("NaN pressure → diagnostic, no crash", () => {
      const r = computeBoost({ iso_group: "P", pressure_bar: NaN, flow_L_min: 40 });
      expect(r.notes.join("|")).toContain("not finite");
    });
    it("Infinity flow → diagnostic", () => {
      const r = computeBoost({ iso_group: "P", pressure_bar: 70, flow_L_min: Infinity });
      expect(r.notes.join("|")).toContain("not finite");
    });
    it("negative pressure → diagnostic", () => {
      const r = computeBoost({ iso_group: "P", pressure_bar: -10, flow_L_min: 40 });
      expect(r.notes.join("|")).toContain("negative");
    });
    it("pressure above 350 bar sanity ceiling → diagnostic", () => {
      const r = computeBoost({ iso_group: "P", pressure_bar: 500, flow_L_min: 40 });
      expect(r.notes.join("|")).toContain("ceiling");
    });
    it("missing input → diagnostic", () => {
      const r = computeBoost(null as unknown as HPCBoostInput);
      expect(r.notes.join("|")).toContain("missing");
    });
  });

  describe("algebraic invariants", () => {
    it("boost never falls below 1.0 in active regime", () => {
      const r = computeBoost({ iso_group: "K", pressure_bar: 36, flow_L_min: 30, jet_aim: "unaimed" });
      expect(r.vc_boost_multiplier.value).toBeGreaterThanOrEqual(1.0);
    });
    it("boost never exceeds physical cap 2.5×", () => {
      const r = computeBoost({ iso_group: "S", pressure_bar: 350, flow_L_min: 60, jet_aim: "centered" });
      expect(r.vc_boost_multiplier.value).toBeLessThanOrEqual(2.5);
    });
  });

  it("HPCVcBoostCalculator.version is 1.0.0", () => {
    expect(HPCVcBoostCalculator.version).toBe("1.0.0");
  });
});
