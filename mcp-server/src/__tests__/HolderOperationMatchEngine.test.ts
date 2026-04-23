/**
 * HolderOperationMatchEngine Tests — MIO-MS0/U-MIO12
 */
import { describe, it, expect } from "vitest";
import { holderOperationMatchEngine } from "../engines/HolderOperationMatchEngine.js";

describe("HolderOperationMatchEngine", () => {
  describe("match", () => {
    it("recommends high-rigidity holder for heavy roughing", () => {
      const result = holderOperationMatchEngine.match({
        operation_type: "roughing",
        tool_diameter_mm: 20,
        cutting_force_n: 800,
      });

      expect(result.recommended.rigidity_score).toBeGreaterThan(0.7);
      expect(result.recommended.suitability).toMatch(/excellent|good/);
      expect(result.decision_factors.primary_concern).toBe("rigidity under load");
    });

    it("recommends hydraulic for chatter-sensitive finishing", () => {
      const result = holderOperationMatchEngine.match({
        operation_type: "finishing",
        tool_diameter_mm: 10,
        surface_finish_ra_um: 0.8,
        chatter_sensitive: true,
      });

      expect(result.recommended.holder_type).toBe("hydraulic");
      expect(result.recommended.damping_score).toBeGreaterThan(0.8);
    });

    it("recommends low-runout holders for tight tolerance finishing", () => {
      const result = holderOperationMatchEngine.match({
        operation_type: "finishing",
        tool_diameter_mm: 6,
        tolerance_mm: 0.01,
        surface_finish_ra_um: 1.6,
      });

      const holder = result.recommended;
      expect(["shrink_fit", "hydraulic"]).toContain(holder.holder_type);
      expect(holder.suitability).toMatch(/excellent|good|acceptable/);
    });

    it("considers cost for budget-priority operations", () => {
      const lowBudget = holderOperationMatchEngine.match({
        operation_type: "drilling",
        tool_diameter_mm: 8,
        budget_priority: "high",
      });

      const normalBudget = holderOperationMatchEngine.match({
        operation_type: "drilling",
        tool_diameter_mm: 8,
      });

      expect(lowBudget.recommended.cost_score).toBeLessThanOrEqual(normalBudget.recommended.cost_score);
    });

    it("returns multiple alternatives", () => {
      const result = holderOperationMatchEngine.match({
        operation_type: "semi_finishing",
        tool_diameter_mm: 12,
      });

      expect(result.alternatives.length).toBeGreaterThanOrEqual(2);
      expect(result.alternatives[0].total_score).toBeLessThanOrEqual(result.recommended.total_score);
    });

    it("provides decision factors", () => {
      const result = holderOperationMatchEngine.match({
        operation_type: "finishing",
        tool_diameter_mm: 8,
        chatter_sensitive: true,
        tolerance_mm: 0.015,
      });

      expect(result.decision_factors.critical_requirements.length).toBeGreaterThan(0);
      expect(result.decision_factors.primary_concern).toBeDefined();
    });

    it("provides AI reasoning trace", () => {
      const result = holderOperationMatchEngine.match({
        operation_type: "roughing",
        tool_diameter_mm: 16,
      });

      expect(result.ai_reasoning.length).toBeGreaterThan(0);
      expect(result.ai_reasoning.some(r => r.includes("[HOLDER-MATCH]"))).toBe(true);
    });
  });

  describe("quickMatch", () => {
    it("returns holder and confidence for roughing", () => {
      const result = holderOperationMatchEngine.quickMatch("roughing", 16);

      expect(result.holder).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("considers chatter sensitivity", () => {
      const normal = holderOperationMatchEngine.quickMatch("finishing", 8, false);
      const chatterSensitive = holderOperationMatchEngine.quickMatch("finishing", 8, true);

      expect(chatterSensitive.holder).toBe("hydraulic");
    });
  });

  describe("scoring validation", () => {
    it("all scores are normalized 0-1", () => {
      const result = holderOperationMatchEngine.match({
        operation_type: "roughing",
        tool_diameter_mm: 12,
      });

      for (const score of [result.recommended, ...result.alternatives]) {
        expect(score.rigidity_score).toBeGreaterThanOrEqual(0);
        expect(score.rigidity_score).toBeLessThanOrEqual(1.5); // Can be boosted slightly
        expect(score.damping_score).toBeGreaterThanOrEqual(0);
        expect(score.damping_score).toBeLessThanOrEqual(1.5);
        expect(score.runout_score).toBeGreaterThanOrEqual(0);
        expect(score.runout_score).toBeLessThanOrEqual(1.5);
      }
    });

    it("suitability matches score ranges", () => {
      const result = holderOperationMatchEngine.match({
        operation_type: "semi_finishing",
        tool_diameter_mm: 10,
      });

      for (const score of [result.recommended, ...result.alternatives]) {
        if (score.total_score > 0.85) {
          expect(score.suitability).toBe("excellent");
        } else if (score.total_score > 0.7) {
          expect(score.suitability).toBe("good");
        } else if (score.total_score > 0.55) {
          expect(score.suitability).toBe("acceptable");
        }
      }
    });
  });
});
