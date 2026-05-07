/**
 * LatheLoRAPhysicsEvaluatorEngine Tests
 * LATHE-LORA-MS0 U-LLR13: Physics evaluation for LatheLoRA
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRAPhysicsEvaluatorEngine } from "../engines/LatheLoRAPhysicsEvaluatorEngine.js";

describe("LatheLoRAPhysicsEvaluatorEngine", () => {
  beforeEach(() => {
    latheLoRAPhysicsEvaluatorEngine.setConfig({
      kienzle_tolerance: 15,
      taylor_tolerance: 25,
      bounds_strictness: "moderate",
      require_units: true,
    });
  });

  describe("evaluate", () => {
    it("passes output with correct physics", () => {
      const output = `
        For 4140 steel (P group), using Kienzle model with kc1.1 = 1800 MPa:
        - Surface speed: 400 SFM
        - Feed: 0.012 IPR
        - Depth: 0.1 inch (2.5 mm)

        Cutting force calculated using Fc = kc1.1 * ap * f^(1-mc).
        Tool life per Taylor equation: approximately 45 minutes.
      `;
      const result = latheLoRAPhysicsEvaluatorEngine.evaluate(output, { iso_group: "P" });
      expect(result.passed).toBe(true);
      expect(result.overall_score).toBeGreaterThan(70);
    });

    it("flags missing Kienzle reference when force mentioned", () => {
      const output = "500 N force cutting operation";
      const result = latheLoRAPhysicsEvaluatorEngine.evaluate(output);
      // Without explicit Kienzle reference and force mentioned, kienzle score is reduced
      expect(result.kienzle_score).toBeLessThan(100);
    });

    it("validates kc1.1 values for ISO group", () => {
      const output = "For P group steel, kc1.1 = 3500 MPa"; // Too high
      const result = latheLoRAPhysicsEvaluatorEngine.evaluate(output, { iso_group: "P" });
      const kienzleIssue = result.issues.find(i => i.parameter === "kc1.1");
      expect(kienzleIssue).toBeDefined();
      expect(kienzleIssue?.severity).toBe("error");
    });

    it("accepts correct kc1.1 for P group", () => {
      const output = "Using Kienzle with kc1.1 = 1800 MPa for steel";
      const result = latheLoRAPhysicsEvaluatorEngine.evaluate(output, { iso_group: "P" });
      const kienzleError = result.issues.find(i => i.parameter === "kc1.1" && i.severity === "error");
      expect(kienzleError).toBeUndefined();
    });
  });

  describe("extractPhysicsValues", () => {
    it("extracts RPM values", () => {
      const extracted = latheLoRAPhysicsEvaluatorEngine.extractPhysicsValues("Set spindle to 1500 RPM");
      expect(extracted.spindle_rpm).toBe(1500);
    });

    it("extracts SFM values", () => {
      const extracted = latheLoRAPhysicsEvaluatorEngine.extractPhysicsValues("Surface speed 400 SFM");
      expect(extracted.surface_speed_sfm).toBe(400);
    });

    it("extracts feed rate IPR", () => {
      const extracted = latheLoRAPhysicsEvaluatorEngine.extractPhysicsValues("Feed 0.015 IPR");
      expect(extracted.feed_ipr).toBe(0.015);
    });

    it("extracts depth mm", () => {
      const extracted = latheLoRAPhysicsEvaluatorEngine.extractPhysicsValues("Depth of cut 2.5 mm DOC");
      expect(extracted.depth_mm).toBe(2.5);
    });

    it("extracts tool life", () => {
      const extracted = latheLoRAPhysicsEvaluatorEngine.extractPhysicsValues("Tool life of 60 minutes");
      expect(extracted.tool_life_min).toBe(60);
    });

    it("extracts power kW", () => {
      const extracted = latheLoRAPhysicsEvaluatorEngine.extractPhysicsValues("Requires 5.5 kW power");
      expect(extracted.power_kw).toBe(5.5);
    });

    it("infers ISO group from material mentions", () => {
      const extracted = latheLoRAPhysicsEvaluatorEngine.extractPhysicsValues("Machining 4140 steel");
      expect(extracted.iso_group).toBe("P");
    });

    it("infers M group for stainless", () => {
      const extracted = latheLoRAPhysicsEvaluatorEngine.extractPhysicsValues("machining stainless 304");
      expect(extracted.iso_group).toBe("M");
    });

    it("infers S group for titanium", () => {
      const extracted = latheLoRAPhysicsEvaluatorEngine.extractPhysicsValues("Ti-6Al-4V titanium");
      expect(extracted.iso_group).toBe("S");
    });
  });

  describe("bounds validation", () => {
    it("flags SFM below minimum for P group", () => {
      const output = "Using 100 SFM for steel"; // Too low for P
      const result = latheLoRAPhysicsEvaluatorEngine.evaluate(output, { iso_group: "P" });
      const boundsIssue = result.issues.find(i => i.type === "bounds" && i.parameter === "surface_speed");
      expect(boundsIssue).toBeDefined();
    });

    it("flags SFM above maximum", () => {
      const output = "Running at 2000 SFM for steel"; // Too high for P
      const result = latheLoRAPhysicsEvaluatorEngine.evaluate(output, { iso_group: "P" });
      const boundsIssue = result.issues.find(i => i.type === "bounds");
      expect(boundsIssue).toBeDefined();
    });

    it("accepts valid SFM for aluminum", () => {
      const output = "1500 SFM for aluminum";
      const result = latheLoRAPhysicsEvaluatorEngine.evaluate(output, { iso_group: "N" });
      const sfmIssue = result.issues.find(i => i.parameter === "surface_speed");
      expect(sfmIssue).toBeUndefined();
    });

    it("flags feed rate above maximum", () => {
      const output = "Feed rate 0.5 IPR"; // Way too high
      const result = latheLoRAPhysicsEvaluatorEngine.evaluate(output, { iso_group: "P" });
      const feedIssue = result.issues.find(i => i.parameter === "feed_rate");
      expect(feedIssue).toBeDefined();
    });
  });

  describe("Taylor tool life", () => {
    it("flags tool life without Taylor reference", () => {
      const output = "Tool life of 60 minutes expected";
      const result = latheLoRAPhysicsEvaluatorEngine.evaluate(output);
      // Should have info-level issue about missing Taylor reference
      const taylorIssue = result.issues.find(i => i.type === "taylor");
      expect(taylorIssue).toBeDefined();
      expect(taylorIssue?.severity).toBe("info");
    });

    it("accepts tool life with Taylor reference", () => {
      const output = "Per Taylor tool life equation, expect 45 minutes";
      const result = latheLoRAPhysicsEvaluatorEngine.evaluate(output);
      expect(result.taylor_score).toBeGreaterThan(80);
    });

    it("warns on unrealistic short tool life", () => {
      const output = "Taylor equation predicts tool life of 2 minutes";
      const result = latheLoRAPhysicsEvaluatorEngine.evaluate(output);
      const lifeIssue = result.issues.find(i => i.parameter === "tool_life");
      expect(lifeIssue).toBeDefined();
    });

    it("warns on unrealistic long tool life", () => {
      const output = "Taylor suggests tool life of 1000 minutes";
      const result = latheLoRAPhysicsEvaluatorEngine.evaluate(output);
      const lifeIssue = result.issues.find(i => i.parameter === "tool_life");
      expect(lifeIssue).toBeDefined();
    });
  });

  describe("dimensional consistency", () => {
    it("notes mixed units without conversion", () => {
      const output = "Use 400 SFM which equals 122 m/min, with 0.3 mm/rev feed";
      const result = latheLoRAPhysicsEvaluatorEngine.evaluate(output);
      // With conversion shown ("equals"), should not flag
      expect(result.dimensional_score).toBeGreaterThan(70);
    });

    it("flags unusual SFM/RPM relationship", () => {
      const output = "At 100 SFM and 5000 RPM"; // Implies tiny diameter
      const result = latheLoRAPhysicsEvaluatorEngine.evaluate(output);
      const dimIssue = result.issues.find(i => i.parameter === "sfm_rpm_relationship");
      expect(dimIssue).toBeDefined();
    });
  });

  describe("getSummary", () => {
    it("formats pass summary", () => {
      const output = "Using Kienzle kc1.1 = 1800 at 400 SFM 0.012 IPR Taylor 45 min";
      const result = latheLoRAPhysicsEvaluatorEngine.evaluate(output, { iso_group: "P" });
      const summary = latheLoRAPhysicsEvaluatorEngine.getSummary(result);
      expect(summary).toContain("Score:");
      expect(summary).toContain("Kienzle:");
    });

    it("shows error count when present", () => {
      const output = "kc1.1 = 5000 at 50000 SFM"; // Errors
      const result = latheLoRAPhysicsEvaluatorEngine.evaluate(output, { iso_group: "P" });
      const summary = latheLoRAPhysicsEvaluatorEngine.getSummary(result);
      expect(summary).toContain("Error");
    });
  });

  describe("getCanonicalKienzle", () => {
    it("returns correct values for P group", () => {
      const kienzle = latheLoRAPhysicsEvaluatorEngine.getCanonicalKienzle("P");
      expect(kienzle.kc1_1).toBe(1800);
      expect(kienzle.mc).toBeCloseTo(0.25, 2);
    });

    it("returns correct values for M group", () => {
      const kienzle = latheLoRAPhysicsEvaluatorEngine.getCanonicalKienzle("M");
      expect(kienzle.kc1_1).toBe(2100);
    });

    it("returns correct values for H group", () => {
      const kienzle = latheLoRAPhysicsEvaluatorEngine.getCanonicalKienzle("H");
      expect(kienzle.kc1_1).toBe(3200);
    });
  });

  describe("setConfig / getConfig", () => {
    it("updates tolerance settings", () => {
      latheLoRAPhysicsEvaluatorEngine.setConfig({ kienzle_tolerance: 20 });
      const config = latheLoRAPhysicsEvaluatorEngine.getConfig();
      expect(config.kienzle_tolerance).toBe(20);
    });

    it("updates strictness", () => {
      latheLoRAPhysicsEvaluatorEngine.setConfig({ bounds_strictness: "strict" });
      const config = latheLoRAPhysicsEvaluatorEngine.getConfig();
      expect(config.bounds_strictness).toBe("strict");
    });
  });
});
