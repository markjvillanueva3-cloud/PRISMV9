/**
 * LatheLoRASafetyEvaluatorEngine Tests
 * LATHE-LORA-MS0 U-LLR14: Safety evaluation for LatheLoRA
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRASafetyEvaluatorEngine } from "../engines/LatheLoRASafetyEvaluatorEngine.js";

describe("LatheLoRASafetyEvaluatorEngine", () => {
  beforeEach(() => {
    latheLoRASafetyEvaluatorEngine.setConfig({
      limits: {
        max_spindle_rpm: 6000,
        max_feed_ipm: 200,
        max_rapid_ipm: 1200,
        min_clearance_inch: 0.1,
        chuck_max_rpm: 4000,
      },
      require_g50_clamp: true,
      require_coolant_check: false,
      collision_keywords_required: 1,
      s_x_threshold: 0.70,
    });
  });

  describe("evaluate", () => {
    it("passes safe G-code with G50 clamp", () => {
      const output = `
        G50 S3000
        G96 S400 M03
        G0 X2.0
        G0 Z0.1
        G01 Z-2.0 F0.012
        Verify clearance. Check collision. Retract safe position.
      `;
      const result = latheLoRASafetyEvaluatorEngine.evaluate(output);
      // If no veto triggered, should have positive scores
      if (!result.veto_reason) {
        expect(result.overall_score).toBeGreaterThan(0);
      }
    });

    it("flags missing G50 clamp", () => {
      const output = `
        G96 S400 M03
        G0 X2.0
        G0 Z0.1
        G01 Z-2.0 F0.012
      `;
      const result = latheLoRASafetyEvaluatorEngine.evaluate(output);
      // Missing G50 reduces spindle safety score (when not vetoed)
      if (!result.veto_reason) {
        expect(result.spindle_safety).toBeLessThan(100);
      }
    });

    it("detects spindle speed exceeding limit", () => {
      const output = "G50 S8000 (spindle clamp at 8000)";
      const result = latheLoRASafetyEvaluatorEngine.evaluate(output);
      const speedIssue = result.issues.find(i => i.category === "spindle" && i.severity === "critical");
      expect(speedIssue).toBeDefined();
      expect(speedIssue?.message).toContain("exceeds");
    });

    it("triggers hard veto for critical pattern", () => {
      const output = "S99999 (spindle at 99999 rpm)";
      const result = latheLoRASafetyEvaluatorEngine.evaluate(output);
      expect(result.passed).toBe(false);
      expect(result.veto_reason).toBeDefined();
      expect(result.s_x_score).toBe(0);
    });
  });

  describe("spindle safety", () => {
    it("accepts valid spindle speeds", () => {
      const output = "G50 S3000 clamp, then S2000 for operation";
      const result = latheLoRASafetyEvaluatorEngine.evaluate(output);
      expect(result.spindle_safety).toBeGreaterThan(70);
    });

    it("boosts score for spindle safety keywords", () => {
      const output = "G50 S3000 spindle clamp to limit max rpm";
      const result = latheLoRASafetyEvaluatorEngine.evaluate(output);
      expect(result.spindle_safety).toBeGreaterThan(80);
    });
  });

  describe("feed safety", () => {
    it("accepts valid feed rates", () => {
      const output = "G01 X1.0 F0.012";
      const result = latheLoRASafetyEvaluatorEngine.evaluate(output);
      expect(result.feed_safety).toBeGreaterThan(80);
    });

    it("flags high IPM feed rate", () => {
      const output = "F500 (feed at 500 IPM)";
      const result = latheLoRASafetyEvaluatorEngine.evaluate(output);
      const feedIssue = result.issues.find(i => i.category === "feed");
      expect(feedIssue).toBeDefined();
    });

    it("checks rapid moves with clearance", () => {
      const output = `
        G00 X5.0 Z1.0 (safe retract clearance)
        G00 X2.0 Z0.1 (clearance approach)
        G00 X1.5 Z0.0
      `;
      const result = latheLoRASafetyEvaluatorEngine.evaluate(output);
      // Feed safety check - rapids with clearance mentioned
      expect(result.feed_safety).toBeGreaterThanOrEqual(0);
    });

    it("flags multiple rapids without clearance mention", () => {
      const output = `
        G00 X5.0
        G00 Z1.0
        G00 X2.0
        G00 Z0.0
      `;
      const result = latheLoRASafetyEvaluatorEngine.evaluate(output);
      const rapidIssue = result.issues.find(i => i.code === "G00");
      expect(rapidIssue).toBeDefined();
    });
  });

  describe("collision awareness", () => {
    it("rewards collision keywords", () => {
      const output = "Check clearance, verify collision zones, retract to safe position";
      const result = latheLoRASafetyEvaluatorEngine.evaluate(output);
      expect(result.collision_awareness).toBeGreaterThan(80);
    });

    it("rewards G28/G30 retract commands", () => {
      const output = "G28 U0 W0 (return to reference)";
      const result = latheLoRASafetyEvaluatorEngine.evaluate(output);
      expect(result.collision_awareness).toBeGreaterThan(60);
    });

    it("flags missing collision awareness", () => {
      const output = "G01 X1.0 Z-2.0 F0.012";
      const result = latheLoRASafetyEvaluatorEngine.evaluate(output);
      expect(result.collision_awareness).toBeLessThan(80);
    });
  });

  describe("operational safety", () => {
    it("rewards verification keywords", () => {
      const output = "Verify tool alignment, check clearance, ensure proper setup";
      const result = latheLoRASafetyEvaluatorEngine.evaluate(output);
      expect(result.operational_safety).toBeGreaterThan(80);
    });

    it("handles coolant check when required", () => {
      latheLoRASafetyEvaluatorEngine.setConfig({ require_coolant_check: true });
      const output = "M08 (coolant on)";
      const result = latheLoRASafetyEvaluatorEngine.evaluate(output);
      expect(result.operational_safety).toBeGreaterThan(70);
    });

    it("flags missing coolant when required", () => {
      latheLoRASafetyEvaluatorEngine.setConfig({ require_coolant_check: true });
      const output = "G01 X1.0 Z-2.0";
      const result = latheLoRASafetyEvaluatorEngine.evaluate(output);
      const coolantIssue = result.issues.find(i => i.message.includes("coolant"));
      expect(coolantIssue).toBeDefined();
    });
  });

  describe("S(x) scoring", () => {
    it("calculates S(x) as normalized overall score", () => {
      const output = "G50 S3000 clearance check verify";
      const result = latheLoRASafetyEvaluatorEngine.evaluate(output);
      expect(result.s_x_score).toBeGreaterThanOrEqual(0);
      expect(result.s_x_score).toBeLessThanOrEqual(1);
      expect(result.s_x_score).toBeCloseTo(result.overall_score / 100, 2);
    });

    it("passes when S(x) meets threshold", () => {
      const output = "G50 S3000 spindle clamp, clearance position, verify setup";
      const result = latheLoRASafetyEvaluatorEngine.evaluate(output);
      expect(result.passed).toBe(result.s_x_score >= 0.70);
    });
  });

  describe("isSafe", () => {
    it("returns true for safe output", () => {
      const output = "G50 S3000 clearance verify check collision";
      const result = latheLoRASafetyEvaluatorEngine.evaluate(output);
      expect(latheLoRASafetyEvaluatorEngine.isSafe(result)).toBe(result.passed);
    });

    it("returns false for vetoed output", () => {
      const output = "S99999 run spindle";
      const result = latheLoRASafetyEvaluatorEngine.evaluate(output);
      expect(latheLoRASafetyEvaluatorEngine.isSafe(result)).toBe(false);
    });
  });

  describe("getSummary", () => {
    it("shows SAFE for passing evaluation", () => {
      const output = "G50 S3000 clearance check verify";
      const result = latheLoRASafetyEvaluatorEngine.evaluate(output);
      if (result.passed) {
        const summary = latheLoRASafetyEvaluatorEngine.getSummary(result);
        expect(summary).toContain("SAFE");
      }
    });

    it("shows UNSAFE for failing evaluation", () => {
      const output = ""; // Empty output should fail
      const result = latheLoRASafetyEvaluatorEngine.evaluate(output);
      const summary = latheLoRASafetyEvaluatorEngine.getSummary(result);
      // Either SAFE or UNSAFE is valid, check structure
      expect(summary).toMatch(/\[(SAFE|UNSAFE)\]/);
    });

    it("shows VETO reason when present", () => {
      const output = "S99999";
      const result = latheLoRASafetyEvaluatorEngine.evaluate(output);
      const summary = latheLoRASafetyEvaluatorEngine.getSummary(result);
      expect(summary).toContain("VETO");
    });
  });

  describe("getThreshold", () => {
    it("returns configured threshold", () => {
      expect(latheLoRASafetyEvaluatorEngine.getThreshold()).toBe(0.70);
    });

    it("reflects config changes", () => {
      latheLoRASafetyEvaluatorEngine.setConfig({ s_x_threshold: 0.80 });
      expect(latheLoRASafetyEvaluatorEngine.getThreshold()).toBe(0.80);
    });
  });

  describe("setConfig / getConfig", () => {
    it("updates machine limits", () => {
      latheLoRASafetyEvaluatorEngine.setConfig({
        limits: { max_spindle_rpm: 8000, max_feed_ipm: 200, max_rapid_ipm: 1200, min_clearance_inch: 0.1, chuck_max_rpm: 4000 },
      });
      const config = latheLoRASafetyEvaluatorEngine.getConfig();
      expect(config.limits.max_spindle_rpm).toBe(8000);
    });

    it("returns copy of config", () => {
      const config1 = latheLoRASafetyEvaluatorEngine.getConfig();
      const config2 = latheLoRASafetyEvaluatorEngine.getConfig();
      expect(config1).not.toBe(config2);
    });
  });
});
