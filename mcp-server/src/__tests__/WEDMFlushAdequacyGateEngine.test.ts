/**
 * Tests for WEDMFlushAdequacyGateEngine
 * MS-P2.5-SAFETY/U-P2.5-SAFE-04
 */

import { describe, it, expect } from "vitest";
import {
  WEDMFlushAdequacyGateEngine,
  wedmFlushAdequacyGateEngine,
  type FlushingInput,
  type FlushingMode,
  type ThicknessBand,
} from "../engines/WEDMFlushAdequacyGateEngine.js";

describe("WEDMFlushAdequacyGateEngine", () => {
  describe("Basic Flushing Validation", () => {
    it("passes with adequate velocity for thin parts", () => {
      const result = wedmFlushAdequacyGateEngine.evaluate({
        velocity_m_s: 0.5,
        thickness_mm: 20,
        mode: "submerged",
      });

      expect(result.success).toBe(true);
      expect(result.pass).toBe(true);
      expect(result.hard_block).toBe(false);
      expect(result.thickness_band).toBe("thin");
    });

    it("fails with insufficient velocity for thin parts", () => {
      const result = wedmFlushAdequacyGateEngine.evaluate({
        velocity_m_s: 0.1,
        thickness_mm: 20,
        mode: "submerged",
      });

      expect(result.pass).toBe(false);
      expect(result.hard_block).toBe(true);
      expect(result.summary).toContain("HARD BLOCK");
    });

    it("passes with adequate velocity for medium parts", () => {
      const result = wedmFlushAdequacyGateEngine.evaluate({
        velocity_m_s: 1.0,
        thickness_mm: 50,
        mode: "top_bottom",
      });

      expect(result.pass).toBe(true);
      expect(result.thickness_band).toBe("medium");
    });

    it("passes with adequate velocity for thick parts", () => {
      const result = wedmFlushAdequacyGateEngine.evaluate({
        velocity_m_s: 1.5,
        thickness_mm: 100,
        mode: "jet",
      });

      expect(result.pass).toBe(true);
      expect(result.thickness_band).toBe("thick");
    });
  });

  describe("Thickness Band Classification", () => {
    it("classifies thin parts (< 25mm)", () => {
      const result = wedmFlushAdequacyGateEngine.evaluate({
        velocity_m_s: 1.0,
        thickness_mm: 15,
        mode: "submerged",
      });

      expect(result.thickness_band).toBe("thin");
    });

    it("classifies medium parts (25-75mm)", () => {
      const result = wedmFlushAdequacyGateEngine.evaluate({
        velocity_m_s: 1.0,
        thickness_mm: 50,
        mode: "submerged",
      });

      expect(result.thickness_band).toBe("medium");
    });

    it("classifies thick parts (75-150mm)", () => {
      const result = wedmFlushAdequacyGateEngine.evaluate({
        velocity_m_s: 1.5,
        thickness_mm: 100,
        mode: "submerged",
      });

      expect(result.thickness_band).toBe("thick");
    });

    it("classifies ultra-thick parts (> 150mm)", () => {
      const result = wedmFlushAdequacyGateEngine.evaluate({
        velocity_m_s: 2.0,
        thickness_mm: 200,
        mode: "jet",
      });

      expect(result.thickness_band).toBe("ultra_thick");
    });
  });

  describe("Flushing Mode Requirements", () => {
    it("has different requirements for submerged mode", () => {
      const req = wedmFlushAdequacyGateEngine.getRequirements(50, "submerged");
      expect(req.min_velocity_m_s).toBeGreaterThan(0);
      expect(req.recommended_velocity_m_s).toBeGreaterThan(req.min_velocity_m_s);
    });

    it("has higher requirements for side_flush mode", () => {
      const submerged = wedmFlushAdequacyGateEngine.getRequirements(50, "submerged");
      const sideFlush = wedmFlushAdequacyGateEngine.getRequirements(50, "side_flush");

      expect(sideFlush.min_velocity_m_s).toBeGreaterThan(submerged.min_velocity_m_s);
    });

    it("has highest requirements for jet mode", () => {
      const topBottom = wedmFlushAdequacyGateEngine.getRequirements(50, "top_bottom");
      const jet = wedmFlushAdequacyGateEngine.getRequirements(50, "jet");

      expect(jet.min_velocity_m_s).toBeGreaterThan(topBottom.min_velocity_m_s);
    });
  });

  describe("Material Multipliers", () => {
    it("applies higher multiplier for carbide", () => {
      const steelResult = wedmFlushAdequacyGateEngine.evaluate({
        velocity_m_s: 0.5,
        thickness_mm: 20,
        mode: "submerged",
        material: "steel",
      });

      const carbideResult = wedmFlushAdequacyGateEngine.evaluate({
        velocity_m_s: 0.5,
        thickness_mm: 20,
        mode: "submerged",
        material: "carbide",
      });

      expect(carbideResult.required_velocity_m_s).toBeGreaterThan(steelResult.required_velocity_m_s);
    });

    it("applies lower multiplier for aluminum", () => {
      const steelResult = wedmFlushAdequacyGateEngine.evaluate({
        velocity_m_s: 0.5,
        thickness_mm: 20,
        mode: "submerged",
        material: "steel",
      });

      const aluminumResult = wedmFlushAdequacyGateEngine.evaluate({
        velocity_m_s: 0.5,
        thickness_mm: 20,
        mode: "submerged",
        material: "aluminum",
      });

      expect(aluminumResult.required_velocity_m_s).toBeLessThan(steelResult.required_velocity_m_s);
    });

    it("applies highest multiplier for inconel", () => {
      const steelResult = wedmFlushAdequacyGateEngine.evaluate({
        velocity_m_s: 1.0,
        thickness_mm: 50,
        mode: "submerged",
        material: "steel",
      });

      const inconelResult = wedmFlushAdequacyGateEngine.evaluate({
        velocity_m_s: 1.0,
        thickness_mm: 50,
        mode: "submerged",
        material: "inconel",
      });

      expect(inconelResult.required_velocity_m_s).toBeGreaterThan(steelResult.required_velocity_m_s);
    });
  });

  describe("Warnings Generation", () => {
    it("warns when velocity below recommended but above minimum", () => {
      const result = wedmFlushAdequacyGateEngine.evaluate({
        velocity_m_s: 0.35, // Above 0.3 min, below 0.5 recommended
        thickness_mm: 20,
        mode: "submerged",
      });

      expect(result.pass).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes("below recommended"))).toBe(true);
    });

    it("warns when pressure below minimum", () => {
      const result = wedmFlushAdequacyGateEngine.evaluate({
        velocity_m_s: 0.5,
        thickness_mm: 20,
        mode: "submerged",
        pressure_bar: 0.2, // Below 0.5 bar minimum
      });

      expect(result.warnings.some(w => w.includes("Pressure"))).toBe(true);
    });

    it("warns about side flush on thick parts", () => {
      const result = wedmFlushAdequacyGateEngine.evaluate({
        velocity_m_s: 1.5,
        thickness_mm: 100,
        mode: "side_flush",
      });

      expect(result.warnings.some(w => w.includes("insufficient"))).toBe(true);
    });

    it("warns about long cut paths with marginal velocity", () => {
      const result = wedmFlushAdequacyGateEngine.evaluate({
        velocity_m_s: 0.35, // Just above minimum
        thickness_mm: 20,
        mode: "submerged",
        cut_length_mm: 150, // Long cut
      });

      expect(result.warnings.some(w => w.includes("Long cut path"))).toBe(true);
    });
  });

  describe("Quick Check for S(x)", () => {
    it("returns correct format for S(x) integration", () => {
      const result = wedmFlushAdequacyGateEngine.quickCheckForSx(0.5, 20, "submerged");

      expect(typeof result.pass).toBe("boolean");
      expect(typeof result.velocity_m_s).toBe("number");
      expect(typeof result.required_velocity_m_s).toBe("number");
      expect(result.mode).toBe("submerged");
    });

    it("matches full evaluate result", () => {
      const quickResult = wedmFlushAdequacyGateEngine.quickCheckForSx(0.5, 50, "top_bottom");
      const fullResult = wedmFlushAdequacyGateEngine.evaluate({
        velocity_m_s: 0.5,
        thickness_mm: 50,
        mode: "top_bottom",
      });

      expect(quickResult.pass).toBe(fullResult.pass);
      expect(quickResult.velocity_m_s).toBe(fullResult.velocity_m_s);
      expect(quickResult.required_velocity_m_s).toBe(fullResult.required_velocity_m_s);
    });
  });

  describe("Mode Recommendations", () => {
    it("recommends submerged for thin parts", () => {
      const rec = wedmFlushAdequacyGateEngine.recommendMode(15);
      expect(rec.primary).toBe("submerged");
    });

    it("recommends top_bottom for medium parts", () => {
      const rec = wedmFlushAdequacyGateEngine.recommendMode(50);
      expect(rec.primary).toBe("top_bottom");
    });

    it("recommends top_bottom for thick parts", () => {
      const rec = wedmFlushAdequacyGateEngine.recommendMode(100);
      expect(rec.primary).toBe("top_bottom");
    });

    it("recommends jet for ultra-thick parts", () => {
      const rec = wedmFlushAdequacyGateEngine.recommendMode(200);
      expect(rec.primary).toBe("jet");
    });

    it("provides alternative mode and reason", () => {
      const rec = wedmFlushAdequacyGateEngine.recommendMode(50);
      expect(rec.alternative).toBeDefined();
      expect(rec.reason).toBeDefined();
      expect(rec.reason.length).toBeGreaterThan(0);
    });
  });

  describe("Minimum Velocity Calculation", () => {
    it("calculates minimum velocity correctly", () => {
      const minVel = wedmFlushAdequacyGateEngine.calculateMinVelocity(20, "submerged");
      expect(minVel).toBeCloseTo(0.3, 2);
    });

    it("applies material multiplier in calculation", () => {
      const steelVel = wedmFlushAdequacyGateEngine.calculateMinVelocity(20, "submerged", "steel");
      const carbideVel = wedmFlushAdequacyGateEngine.calculateMinVelocity(20, "submerged", "carbide");

      expect(carbideVel).toBeGreaterThan(steelVel);
      expect(carbideVel).toBeCloseTo(steelVel * 1.3, 2);
    });
  });

  describe("Velocity Ratio", () => {
    it("calculates velocity ratio correctly", () => {
      const result = wedmFlushAdequacyGateEngine.evaluate({
        velocity_m_s: 0.6, // 2x the 0.3 minimum
        thickness_mm: 20,
        mode: "submerged",
      });

      expect(result.velocity_ratio).toBeCloseTo(2.0, 1);
    });

    it("ratio < 1 indicates failure", () => {
      const result = wedmFlushAdequacyGateEngine.evaluate({
        velocity_m_s: 0.15, // Half the 0.3 minimum
        thickness_mm: 20,
        mode: "submerged",
      });

      expect(result.velocity_ratio).toBeLessThan(1);
      expect(result.pass).toBe(false);
    });
  });

  describe("Summary Messages", () => {
    it("provides clear pass summary", () => {
      const result = wedmFlushAdequacyGateEngine.evaluate({
        velocity_m_s: 0.5,
        thickness_mm: 20,
        mode: "submerged",
      });

      expect(result.summary).toContain("PASS");
      expect(result.summary).toContain("thin");
      expect(result.summary).toContain("submerged");
    });

    it("provides clear hard block summary with reasons", () => {
      const result = wedmFlushAdequacyGateEngine.evaluate({
        velocity_m_s: 0.1,
        thickness_mm: 20,
        mode: "submerged",
      });

      expect(result.summary).toContain("HARD BLOCK");
      expect(result.summary).toContain("Insufficient");
      expect(result.summary).toContain("wire breakage");
    });
  });

  describe("Edge Cases", () => {
    it("handles zero velocity", () => {
      const result = wedmFlushAdequacyGateEngine.evaluate({
        velocity_m_s: 0,
        thickness_mm: 20,
        mode: "submerged",
      });

      expect(result.pass).toBe(false);
      expect(result.velocity_ratio).toBe(0);
    });

    it("handles very thin parts (1mm)", () => {
      const result = wedmFlushAdequacyGateEngine.evaluate({
        velocity_m_s: 0.5,
        thickness_mm: 1,
        mode: "submerged",
      });

      expect(result.thickness_band).toBe("thin");
      expect(result.success).toBe(true);
    });

    it("handles very thick parts (500mm)", () => {
      const result = wedmFlushAdequacyGateEngine.evaluate({
        velocity_m_s: 3.0,
        thickness_mm: 500,
        mode: "jet",
      });

      expect(result.thickness_band).toBe("ultra_thick");
      expect(result.success).toBe(true);
    });

    it("handles boundary thickness (25mm)", () => {
      const result = wedmFlushAdequacyGateEngine.evaluate({
        velocity_m_s: 1.0,
        thickness_mm: 25,
        mode: "submerged",
      });

      // 25mm is the boundary - should be classified as medium
      expect(result.thickness_band).toBe("medium");
    });

    it("handles unknown material gracefully", () => {
      const result = wedmFlushAdequacyGateEngine.evaluate({
        velocity_m_s: 0.5,
        thickness_mm: 20,
        mode: "submerged",
        material: "unknown_material" as any,
      });

      // Should use default multiplier of 1.0
      expect(result.required_velocity_m_s).toBeCloseTo(0.3, 2);
    });
  });

  describe("All Flushing Modes", () => {
    const modes: FlushingMode[] = ["submerged", "side_flush", "top_bottom", "jet"];

    modes.forEach((mode) => {
      it(`handles ${mode} mode correctly`, () => {
        const result = wedmFlushAdequacyGateEngine.evaluate({
          velocity_m_s: 2.0, // High enough to pass any mode
          thickness_mm: 50,
          mode,
        });

        expect(result.success).toBe(true);
        expect(result.mode).toBe(mode);
      });
    });
  });
});
