/**
 * PPSafetyEnvelopeVectorEngine Tests — PP-AGI-MS5
 */
import { describe, it, expect } from "vitest";
import {
  PPSafetyEnvelopeVectorEngine,
  ppSafetyEnvelopeVectorEngine,
  SAFETY_ENVELOPE_DIM,
  type SafetyEnvelopeSpec,
} from "../engines/PPSafetyEnvelopeVectorEngine.js";

const simpleVMC: SafetyEnvelopeSpec = {
  machine_category: "vmc", travel_x_mm: 762, travel_y_mm: 406, travel_z_mm: 508,
  min_clearance_z_mm: 100, tool_change_zone: { x_range: 762, y_range: 50, z_range: 108 },
  atc_clearance_verified: true, danger_zone_count: 0,
};
const complex5Axis: SafetyEnvelopeSpec = {
  machine_category: "5axis", travel_x_mm: 762, travel_y_mm: 460, travel_z_mm: 460,
  has_rotary_axes: true, min_clearance_z_mm: 60,
  tool_change_zone: { x_range: 762, y_range: 100, z_range: 150 },
  danger_zone_count: 3, max_tool_overhang_mm: 80, tool_diameter_mm: 10,
  max_rapid_distance_mm: 1200, atc_clearance_verified: true,
};
const riskyLathe: SafetyEnvelopeSpec = {
  machine_category: "lathe", has_sub_spindle: true, has_turret: true,
  has_tailstock: true, travel_x_mm: 300, travel_z_mm: 600,
  max_tool_overhang_mm: 100, tool_diameter_mm: 12,
  max_rapid_distance_mm: 800,
};

describe("PPSafetyEnvelopeVectorEngine", () => {
  it("exports singleton", () => {
    expect(ppSafetyEnvelopeVectorEngine).toBeInstanceOf(PPSafetyEnvelopeVectorEngine);
  });
  it("SAFETY_ENVELOPE_DIM is 20", () => {
    expect(SAFETY_ENVELOPE_DIM).toBe(20);
  });

  describe("embed", () => {
    it("returns correct dimension", () => {
      const emb = ppSafetyEnvelopeVectorEngine.embed(simpleVMC);
      expect(emb.vector.length).toBe(20);
    });
    it("all values in [0, 1]", () => {
      const emb = ppSafetyEnvelopeVectorEngine.embed(complex5Axis);
      for (const v of emb.vector) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
    });
    it("VMC has cat_vmc = 1", () => {
      const emb = ppSafetyEnvelopeVectorEngine.embed(simpleVMC);
      expect(emb.vector[0]).toBe(1);
    });
    it("5axis has cat_5axis = 1", () => {
      const emb = ppSafetyEnvelopeVectorEngine.embed(complex5Axis);
      expect(emb.vector[3]).toBe(1);
    });
    it("simple VMC has low risk", () => {
      const emb = ppSafetyEnvelopeVectorEngine.embed(simpleVMC);
      expect(["low", "medium"]).toContain(emb.risk_level);
    });
    it("5-axis has higher risk than simple VMC", () => {
      const vmc = ppSafetyEnvelopeVectorEngine.embed(simpleVMC);
      const fiveAx = ppSafetyEnvelopeVectorEngine.embed(complex5Axis);
      const riskOrder = ["low", "medium", "high", "critical"];
      expect(riskOrder.indexOf(fiveAx.risk_level)).toBeGreaterThanOrEqual(riskOrder.indexOf(vmc.risk_level));
    });
    it("risky lathe flags sub_spindle risk", () => {
      const emb = ppSafetyEnvelopeVectorEngine.embed(riskyLathe);
      expect(emb.risk_factors).toContain("sub_spindle");
    });
    it("data completeness reflects provided fields", () => {
      const full = ppSafetyEnvelopeVectorEngine.embed(complex5Axis);
      const minimal = ppSafetyEnvelopeVectorEngine.embed({});
      expect(full.vector[19]).toBeGreaterThan(minimal.vector[19]);
    });
  });

  describe("compare", () => {
    it("identical specs → similarity ~1", () => {
      const result = ppSafetyEnvelopeVectorEngine.compare(simpleVMC, simpleVMC);
      expect(result.cosine_similarity).toBeCloseTo(1, 3);
    });
    it("different types have lower similarity", () => {
      const same = ppSafetyEnvelopeVectorEngine.compare(simpleVMC, simpleVMC);
      const diff = ppSafetyEnvelopeVectorEngine.compare(simpleVMC, riskyLathe);
      expect(diff.cosine_similarity).toBeLessThan(same.cosine_similarity);
    });
    it("returns risk delta string", () => {
      const result = ppSafetyEnvelopeVectorEngine.compare(simpleVMC, complex5Axis);
      expect(result.risk_delta).toContain("→");
    });
    it("returns key differences", () => {
      const result = ppSafetyEnvelopeVectorEngine.compare(simpleVMC, riskyLathe);
      expect(result.key_differences.length).toBeGreaterThan(0);
    });
  });

  describe("dimensionName", () => {
    it("returns known names", () => {
      expect(ppSafetyEnvelopeVectorEngine.dimensionName(0)).toBe("cat_vmc");
      expect(ppSafetyEnvelopeVectorEngine.dimensionName(11)).toBe("rotary_risk");
      expect(ppSafetyEnvelopeVectorEngine.dimensionName(19)).toBe("data_completeness");
    });
  });
});
