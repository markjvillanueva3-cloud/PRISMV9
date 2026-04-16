/**
 * PPPhysicsConditionEncoderEngine Tests — PP-AGI-MS4
 */
import { describe, it, expect } from "vitest";
import {
  PPPhysicsConditionEncoderEngine,
  ppPhysicsConditionEncoderEngine,
  PHYSICS_EMBEDDING_DIM,
  type PhysicsCondition,
} from "../engines/PPPhysicsConditionEncoderEngine.js";

const lightCut: PhysicsCondition = {
  cutting_force_N: 200, cutting_temperature_C: 150, power_kW: 2,
  mrr_cm3_per_min: 5, cutting_speed_m_min: 200, coolant_flow_adequate: true,
};
const heavyCut: PhysicsCondition = {
  cutting_force_N: 4000, cutting_temperature_C: 600, power_kW: 30,
  torque_Nm: 200, mrr_cm3_per_min: 60, cutting_speed_m_min: 100,
  chip_thickness_mm: 0.3, tool_wear_VB_mm: 0.2, tool_wear_VBmax_mm: 0.3,
  coolant_flow_adequate: true,
};
const riskyCondition: PhysicsCondition = {
  cutting_force_N: 6000, cutting_temperature_C: 900, power_kW: 45,
  spindle_power_limit_kW: 50, chatter_detected: true,
  tool_wear_VB_mm: 0.28, tool_wear_VBmax_mm: 0.3, vibration_amplitude_um: 40,
  coolant_flow_adequate: false,
};

describe("PPPhysicsConditionEncoderEngine", () => {
  it("exports singleton", () => {
    expect(ppPhysicsConditionEncoderEngine).toBeInstanceOf(PPPhysicsConditionEncoderEngine);
  });
  it("PHYSICS_EMBEDDING_DIM is 24", () => {
    expect(PHYSICS_EMBEDDING_DIM).toBe(24);
  });

  describe("embed", () => {
    it("returns correct dimension", () => {
      const emb = ppPhysicsConditionEncoderEngine.embed(lightCut);
      expect(emb.vector.length).toBe(24);
    });
    it("all values in [0, 1]", () => {
      const emb = ppPhysicsConditionEncoderEngine.embed(heavyCut);
      for (const v of emb.vector) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1); }
    });
    it("light cut → force_light bucket", () => {
      const emb = ppPhysicsConditionEncoderEngine.embed(lightCut);
      expect(emb.vector[0]).toBe(1); // force_light
    });
    it("heavy cut → force_heavy bucket", () => {
      const emb = ppPhysicsConditionEncoderEngine.embed(heavyCut);
      expect(emb.vector[2]).toBe(1); // force_heavy
    });
    it("risky condition has high overall risk", () => {
      const emb = ppPhysicsConditionEncoderEngine.embed(riskyCondition);
      expect(emb.risk_summary.overall_risk).toBeGreaterThan(0.7);
    });
    it("light cut has low risk", () => {
      const emb = ppPhysicsConditionEncoderEngine.embed(lightCut);
      expect(emb.risk_summary.overall_risk).toBeLessThan(0.5);
    });
    it("chatter detection is encoded", () => {
      const emb = ppPhysicsConditionEncoderEngine.embed(riskyCondition);
      expect(emb.vector[20]).toBe(1); // chatter_risk
    });
    it("risk summary lists top risks", () => {
      const emb = ppPhysicsConditionEncoderEngine.embed(riskyCondition);
      expect(emb.risk_summary.top_risks.length).toBeGreaterThan(0);
    });
  });

  describe("compare", () => {
    it("similar conditions have high similarity", () => {
      const result = ppPhysicsConditionEncoderEngine.compare(lightCut, lightCut);
      expect(result.cosine_similarity).toBeCloseTo(1, 4);
    });
    it("different conditions have lower similarity", () => {
      const result = ppPhysicsConditionEncoderEngine.compare(lightCut, heavyCut);
      expect(result.cosine_similarity).toBeLessThan(0.9);
    });
    it("returns condition shifts", () => {
      const result = ppPhysicsConditionEncoderEngine.compare(lightCut, riskyCondition);
      expect(result.condition_shift.length).toBeGreaterThan(0);
    });
    it("risk_delta is positive when B is riskier", () => {
      const result = ppPhysicsConditionEncoderEngine.compare(lightCut, riskyCondition);
      expect(result.risk_delta).toBeGreaterThan(0);
    });
  });

  describe("dimensionName", () => {
    it("returns known names", () => {
      expect(ppPhysicsConditionEncoderEngine.dimensionName(0)).toBe("force_light");
      expect(ppPhysicsConditionEncoderEngine.dimensionName(20)).toBe("chatter_risk");
      expect(ppPhysicsConditionEncoderEngine.dimensionName(23)).toBe("coolant_adequacy");
    });
  });
});
