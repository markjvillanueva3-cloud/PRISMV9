/**
 * MachiningIntelligenceGuardHook Tests (MIO-MS0 U-MIO29)
 */

import { describe, it, expect } from "vitest";
import {
  MachiningIntelligenceGuardHook,
  HOOK_NAME,
  GUARDED_ACTIONS,
} from "../hooks/MachiningIntelligenceGuardHook.js";

const validPlan = {
  cutting_parameters: {
    cutting_speed_m_min: 180,
    spindle_rpm: 4775,
    feed_rate_mm_min: 1910,
    axial_depth_mm: 2.5,
  },
  predictions: {
    cutting_force_n: 1200,
    power_kw: 3.6,
    tool_life_min: 60,
    surface_finish_um: 1.6,
  },
  safety: {
    force_ratio: 0.6,
    power_ratio: 0.5,
    stability_margin: 0.7,
    deflection_ratio: 0.3,
    overall_safety_score: 0.82,
  },
  confidence: 0.85,
  context: { machine_type: "mill", operation_type: "roughing" },
};

describe("MachiningIntelligenceGuardHook", () => {
  describe("meta", () => {
    it("exports hook name and guarded actions", () => {
      expect(HOOK_NAME).toBe("machining-intelligence-orchestrator-guard");
      expect(GUARDED_ACTIONS).toContain("mio_orchestrate");
      expect(GUARDED_ACTIONS.length).toBeGreaterThan(0);
    });
  });

  describe("validate — passing plan", () => {
    it("accepts a well-formed plan with safe metrics", () => {
      const result = MachiningIntelligenceGuardHook.validate(validPlan);
      expect(result.passed).toBe(true);
      expect(result.hard_block).toBe(false);
      expect(result.recommendation).toBe("accept");
      expect(result.violations.length).toBe(0);
      expect(result.safety_score).toBe(0.82);
    });
  });

  describe("validate — hard block on safety score", () => {
    it("hard-blocks when S(x) < 0.70", () => {
      const unsafePlan = {
        ...validPlan,
        safety: { ...validPlan.safety, overall_safety_score: 0.65 },
      };
      const result = MachiningIntelligenceGuardHook.validate(unsafePlan);
      expect(result.hard_block).toBe(true);
      expect(result.recommendation).toBe("reject");
      expect(result.violations.some(v => v.code === "SAFETY_SCORE_HARD_BLOCK")).toBe(true);
    });

    it("does NOT hard-block at S(x) = 0.70 boundary", () => {
      const plan = {
        ...validPlan,
        safety: { ...validPlan.safety, overall_safety_score: 0.70 },
      };
      const result = MachiningIntelligenceGuardHook.validate(plan);
      expect(result.violations.some(v => v.code === "SAFETY_SCORE_HARD_BLOCK")).toBe(false);
    });
  });

  describe("validate — confidence floor", () => {
    it("flags low aggregated confidence", () => {
      const lowConf = { ...validPlan, confidence: 0.3 };
      const result = MachiningIntelligenceGuardHook.validate(lowConf);
      expect(result.violations.some(v => v.code === "LOW_CONFIDENCE")).toBe(true);
    });
  });

  describe("validate — force overlimit", () => {
    it("critical violation when force_ratio > 1.0", () => {
      const plan = { ...validPlan, safety: { ...validPlan.safety, force_ratio: 1.2 } };
      const result = MachiningIntelligenceGuardHook.validate(plan);
      expect(result.hard_block).toBe(true);
      expect(result.violations.some(v => v.code === "FORCE_OVERLIMIT" && v.severity === "critical")).toBe(true);
    });
  });

  describe("validate — power overlimit", () => {
    it("error violation when power_ratio > 0.95", () => {
      const plan = { ...validPlan, safety: { ...validPlan.safety, power_ratio: 0.98 } };
      const result = MachiningIntelligenceGuardHook.validate(plan);
      expect(result.violations.some(v => v.code === "POWER_OVERLIMIT")).toBe(true);
    });
  });

  describe("validate — stability margin", () => {
    it("error when stability_margin < 0.2", () => {
      const plan = { ...validPlan, safety: { ...validPlan.safety, stability_margin: 0.1 } };
      const result = MachiningIntelligenceGuardHook.validate(plan);
      expect(result.violations.some(v => v.code === "LOW_STABILITY_MARGIN")).toBe(true);
    });
  });

  describe("validate — physics sanity", () => {
    it("critical on RPM out of range (too low)", () => {
      const plan = {
        ...validPlan,
        cutting_parameters: { ...validPlan.cutting_parameters, spindle_rpm: 10 },
      };
      const result = MachiningIntelligenceGuardHook.validate(plan);
      expect(result.violations.some(v => v.code === "RPM_OUT_OF_RANGE")).toBe(true);
    });

    it("critical on RPM above 60000", () => {
      const plan = {
        ...validPlan,
        cutting_parameters: { ...validPlan.cutting_parameters, spindle_rpm: 80000 },
      };
      const result = MachiningIntelligenceGuardHook.validate(plan);
      expect(result.violations.some(v => v.code === "RPM_OUT_OF_RANGE")).toBe(true);
    });

    it("warns on cutting speed too low (rubbing)", () => {
      const plan = {
        ...validPlan,
        cutting_parameters: { ...validPlan.cutting_parameters, cutting_speed_m_min: 3 },
      };
      const result = MachiningIntelligenceGuardHook.validate(plan);
      expect(result.violations.some(v => v.code === "VC_TOO_LOW")).toBe(true);
    });

    it("critical on cutting speed above 1500 m/min", () => {
      const plan = {
        ...validPlan,
        cutting_parameters: { ...validPlan.cutting_parameters, cutting_speed_m_min: 2000 },
      };
      const result = MachiningIntelligenceGuardHook.validate(plan);
      expect(result.hard_block).toBe(true);
      expect(result.violations.some(v => v.code === "VC_TOO_HIGH")).toBe(true);
    });

    it("flags unphysical cutting force (> 50 kN)", () => {
      const plan = {
        ...validPlan,
        predictions: { ...validPlan.predictions, cutting_force_n: 60000 },
      };
      const result = MachiningIntelligenceGuardHook.validate(plan);
      expect(result.violations.some(v => v.code === "FORCE_UNPHYSICAL")).toBe(true);
    });

    it("flags unphysical power (> 200 kW)", () => {
      const plan = {
        ...validPlan,
        predictions: { ...validPlan.predictions, power_kw: 250 },
      };
      const result = MachiningIntelligenceGuardHook.validate(plan);
      expect(result.violations.some(v => v.code === "POWER_UNPHYSICAL")).toBe(true);
    });

    it("flags feed rate out of range", () => {
      const plan = {
        ...validPlan,
        cutting_parameters: { ...validPlan.cutting_parameters, feed_rate_mm_min: 0 },
      };
      const result = MachiningIntelligenceGuardHook.validate(plan);
      expect(result.violations.some(v => v.code === "FEED_RATE_OUT_OF_RANGE")).toBe(true);
    });
  });

  describe("validate — invalid input", () => {
    it("rejects non-object input", () => {
      const result = MachiningIntelligenceGuardHook.validate("not a plan" as unknown);
      expect(result.passed).toBe(false);
      expect(result.hard_block).toBe(true);
      expect(result.violations[0].code).toBe("INVALID_INPUT");
    });

    it("rejects missing required fields", () => {
      const result = MachiningIntelligenceGuardHook.validate({ cutting_parameters: {} });
      expect(result.passed).toBe(false);
      expect(result.hard_block).toBe(true);
    });
  });

  describe("recommendation tiers", () => {
    it("reject on hard block", () => {
      const plan = { ...validPlan, safety: { ...validPlan.safety, overall_safety_score: 0.5 } };
      expect(MachiningIntelligenceGuardHook.validate(plan).recommendation).toBe("reject");
    });

    it("review on non-critical error", () => {
      const plan = { ...validPlan, safety: { ...validPlan.safety, stability_margin: 0.1 } };
      expect(MachiningIntelligenceGuardHook.validate(plan).recommendation).toBe("review");
    });

    it("accept on no violations", () => {
      expect(MachiningIntelligenceGuardHook.validate(validPlan).recommendation).toBe("accept");
    });
  });
});
