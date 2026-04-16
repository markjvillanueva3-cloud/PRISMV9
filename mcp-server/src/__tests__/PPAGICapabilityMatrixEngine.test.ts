/**
 * PPAGICapabilityMatrixEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPAGICapabilityMatrixEngine,
  ppAGICapabilityMatrixEngine,
} from "../engines/PPAGICapabilityMatrixEngine.js";

describe("PPAGICapabilityMatrixEngine", () => {
  it("exports singleton", () => {
    expect(ppAGICapabilityMatrixEngine).toBeInstanceOf(PPAGICapabilityMatrixEngine);
  });

  describe("generateMatrix", () => {
    it("covers all JM Die machines", () => {
      const m = ppAGICapabilityMatrixEngine.generateMatrix();
      expect(m.total_machines).toBeGreaterThanOrEqual(9);
      expect(m.machines.length).toBe(m.total_machines);
    });

    it("has timestamp", () => {
      const m = ppAGICapabilityMatrixEngine.generateMatrix();
      expect(m.timestamp).toBeGreaterThan(0);
    });

    it("avg_readiness in [0, 100]", () => {
      const m = ppAGICapabilityMatrixEngine.generateMatrix();
      expect(m.avg_readiness).toBeGreaterThanOrEqual(0);
      expect(m.avg_readiness).toBeLessThanOrEqual(100);
    });

    it("shop summary adds up", () => {
      const m = ppAGICapabilityMatrixEngine.generateMatrix();
      const sum = m.shop_summary.fully_supported +
                  m.shop_summary.partially_supported +
                  m.shop_summary.minimal_support;
      expect(sum).toBe(m.total_machines);
    });

    it("identifies top gaps", () => {
      const m = ppAGICapabilityMatrixEngine.generateMatrix();
      expect(Array.isArray(m.top_gaps)).toBe(true);
    });
  });

  describe("assessMachine", () => {
    it("Haas VF-2 has high readiness", () => {
      const c = ppAGICapabilityMatrixEngine.assessMachine("jmdie-haas-vf2");
      expect(c.readiness_score).toBeGreaterThan(50);
      expect(c.machine_name).toContain("Haas");
    });

    it("Haas supports roughing + finishing + drilling", () => {
      const c = ppAGICapabilityMatrixEngine.assessMachine("jmdie-haas-vf2");
      expect(c.operations.roughing.supported).toBe(true);
      expect(c.operations.finishing.supported).toBe(true);
      expect(c.operations.drilling.supported).toBe(true);
    });

    it("Haas does NOT support 5-axis", () => {
      const c = ppAGICapabilityMatrixEngine.assessMachine("jmdie-haas-vf2");
      expect(c.operations.five_axis.supported).toBe(false);
    });

    it("Haas has controller adaptation profile", () => {
      const c = ppAGICapabilityMatrixEngine.assessMachine("jmdie-haas-vf2");
      expect(c.dialect.adaptation_profile).toBe(true);
      expect(c.dialect.confidence).toBe("high");
    });

    it("Okuma 5-axis has 5-axis support", () => {
      const c = ppAGICapabilityMatrixEngine.assessMachine("jmdie-okuma-m460v-5ax");
      expect(c.operations.five_axis.supported).toBe(true);
    });

    it("Wire EDM has EDM support", () => {
      const c = ppAGICapabilityMatrixEngine.assessMachine("jmdie-mitsubishi-mv1200r");
      expect(c.operations.edm.supported).toBe(true);
    });

    it("all machines have features flags", () => {
      const matrix = ppAGICapabilityMatrixEngine.generateMatrix();
      for (const m of matrix.machines) {
        expect(typeof m.features.physics_validation).toBe("boolean");
        expect(typeof m.features.safety_rules).toBe("boolean");
        expect(typeof m.features.g_code_generation).toBe("boolean");
      }
    });

    it("all readiness scores in [0, 100]", () => {
      const matrix = ppAGICapabilityMatrixEngine.generateMatrix();
      for (const m of matrix.machines) {
        expect(m.readiness_score).toBeGreaterThanOrEqual(0);
        expect(m.readiness_score).toBeLessThanOrEqual(100);
      }
    });

    it("unknown machine gets score 0", () => {
      const c = ppAGICapabilityMatrixEngine.assessMachine("nonexistent");
      expect(c.readiness_score).toBe(0);
      expect(c.gaps.length).toBeGreaterThan(0);
    });
  });

  describe("getRankedMachines", () => {
    it("sorted by descending readiness", () => {
      const ranked = ppAGICapabilityMatrixEngine.getRankedMachines();
      for (let i = 1; i < ranked.length; i++) {
        expect(ranked[i].readiness).toBeLessThanOrEqual(ranked[i - 1].readiness);
      }
    });

    it("includes all machines", () => {
      const ranked = ppAGICapabilityMatrixEngine.getRankedMachines();
      const matrix = ppAGICapabilityMatrixEngine.generateMatrix();
      expect(ranked.length).toBe(matrix.total_machines);
    });
  });

  describe("getMachinesNeedingAttention", () => {
    it("returns machines with readiness < 50", () => {
      const needAttention = ppAGICapabilityMatrixEngine.getMachinesNeedingAttention();
      for (const m of needAttention) {
        expect(m.readiness_score).toBeLessThan(50);
      }
    });
  });
});
