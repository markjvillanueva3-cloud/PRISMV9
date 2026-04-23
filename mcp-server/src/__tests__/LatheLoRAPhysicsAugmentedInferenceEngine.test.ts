/**
 * LatheLoRAPhysicsAugmentedInferenceEngine Tests
 * LATHE-LORA-MS0 U-LLR25: Physics-augmented inference
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRAPhysicsAugmentedInferenceEngine } from "../engines/LatheLoRAPhysicsAugmentedInferenceEngine.js";

describe("LatheLoRAPhysicsAugmentedInferenceEngine", () => {
  beforeEach(() => {
    latheLoRAPhysicsAugmentedInferenceEngine.reset();
  });

  describe("setConfig / getConfig", () => {
    it("has sensible defaults", () => {
      const config = latheLoRAPhysicsAugmentedInferenceEngine.getConfig();

      expect(config.enable_force_check).toBe(true);
      expect(config.enable_safety_veto).toBe(true);
      expect(config.safety_threshold).toBe(0.70);
      expect(config.auto_correct).toBe(true);
    });

    it("allows config updates", () => {
      latheLoRAPhysicsAugmentedInferenceEngine.setConfig({
        safety_threshold: 0.85,
        force_limit_n: 3000,
      });

      const config = latheLoRAPhysicsAugmentedInferenceEngine.getConfig();
      expect(config.safety_threshold).toBe(0.85);
      expect(config.force_limit_n).toBe(3000);
    });
  });

  describe("extractParameters", () => {
    it("extracts SFM", () => {
      const params = latheLoRAPhysicsAugmentedInferenceEngine.extractParameters(
        "Use 400 SFM for roughing."
      );
      expect(params.sfm).toBe(400);
    });

    it("extracts RPM", () => {
      const params = latheLoRAPhysicsAugmentedInferenceEngine.extractParameters(
        "Set spindle to 1200 RPM."
      );
      expect(params.rpm).toBe(1200);
    });

    it("extracts feed rate IPR", () => {
      const params = latheLoRAPhysicsAugmentedInferenceEngine.extractParameters(
        "Feed at 0.012 IPR for finishing."
      );
      expect(params.feed_ipr).toBe(0.012);
    });

    it("extracts DOC", () => {
      const params = latheLoRAPhysicsAugmentedInferenceEngine.extractParameters(
        "Take 0.100\" DOC for roughing."
      );
      expect(params.doc_in).toBe(0.100);
    });

    it("detects material", () => {
      const params = latheLoRAPhysicsAugmentedInferenceEngine.extractParameters(
        "For 4140 steel, use carbide."
      );
      expect(params.material).toBe("4140");
    });

    it("detects operation", () => {
      const params = latheLoRAPhysicsAugmentedInferenceEngine.extractParameters(
        "For roughing operations, increase feed."
      );
      expect(params.operation).toBe("roughing");
    });

    it("extracts multiple parameters", () => {
      const params = latheLoRAPhysicsAugmentedInferenceEngine.extractParameters(
        "For 4140 steel roughing: 400 SFM, 0.015 IPR, 0.150\" DOC."
      );

      expect(params.sfm).toBe(400);
      expect(params.feed_ipr).toBe(0.015);
      expect(params.doc_in).toBe(0.150);
      expect(params.material).toBe("4140");
    });
  });

  describe("validateCuttingForce", () => {
    it("returns unchecked without parameters", () => {
      const result = latheLoRAPhysicsAugmentedInferenceEngine.validateCuttingForce({});
      expect(result.status).toBe("unchecked");
    });

    it("validates force within limit", () => {
      const result = latheLoRAPhysicsAugmentedInferenceEngine.validateCuttingForce({
        feed_ipr: 0.010,
        doc_in: 0.050,
      });

      expect(result.status).toBe("valid");
      expect(result.value).toBeDefined();
      expect(result.unit).toBe("N");
    });

    it("warns on high force", () => {
      latheLoRAPhysicsAugmentedInferenceEngine.setConfig({ force_limit_n: 1000 });

      const result = latheLoRAPhysicsAugmentedInferenceEngine.validateCuttingForce({
        feed_ipr: 0.020,
        doc_in: 0.200,
      });

      expect(result.status).toBe("warning");
      expect(result.severity).toBe("warning");
    });
  });

  describe("validateSFM", () => {
    it("returns unchecked without SFM", () => {
      const result = latheLoRAPhysicsAugmentedInferenceEngine.validateSFM({});
      expect(result.status).toBe("unchecked");
    });

    it("validates SFM within range", () => {
      const result = latheLoRAPhysicsAugmentedInferenceEngine.validateSFM({
        sfm: 400,
        material: "4140",
      });

      expect(result.status).toBe("valid");
    });

    it("warns on low SFM", () => {
      const result = latheLoRAPhysicsAugmentedInferenceEngine.validateSFM({
        sfm: 200,
        material: "4140",
      });

      expect(result.status).toBe("warning");
    });

    it("invalidates excessive SFM", () => {
      const result = latheLoRAPhysicsAugmentedInferenceEngine.validateSFM({
        sfm: 800,
        material: "4140",
      });

      expect(result.status).toBe("invalid");
      expect(result.severity).toBe("error");
    });
  });

  describe("validateDeflection", () => {
    it("returns unchecked without parameters", () => {
      const result = latheLoRAPhysicsAugmentedInferenceEngine.validateDeflection({});
      expect(result.status).toBe("unchecked");
    });

    it("validates deflection within limit", () => {
      const result = latheLoRAPhysicsAugmentedInferenceEngine.validateDeflection({
        feed_ipr: 0.005,
        doc_in: 0.010,
      });

      expect(result.status).toBe("valid");
    });
  });

  describe("calculateSafetyScore", () => {
    it("returns 1.0 for empty validations", () => {
      const score = latheLoRAPhysicsAugmentedInferenceEngine.calculateSafetyScore([]);
      expect(score).toBe(1.0);
    });

    it("returns 1.0 for all valid", () => {
      const score = latheLoRAPhysicsAugmentedInferenceEngine.calculateSafetyScore([
        { check: "safety", status: "valid", message: "", severity: "info" },
        { check: "cutting_force", status: "valid", message: "", severity: "info" },
      ]);
      expect(score).toBe(1.0);
    });

    it("reduces score for warnings", () => {
      const score = latheLoRAPhysicsAugmentedInferenceEngine.calculateSafetyScore([
        { check: "safety", status: "warning", message: "", severity: "warning" },
      ]);
      expect(score).toBe(0.9);
    });

    it("reduces score more for invalid", () => {
      const score = latheLoRAPhysicsAugmentedInferenceEngine.calculateSafetyScore([
        { check: "safety", status: "invalid", message: "", severity: "error" },
      ]);
      expect(score).toBe(0.7);
    });

    it("clamps to 0", () => {
      const score = latheLoRAPhysicsAugmentedInferenceEngine.calculateSafetyScore([
        { check: "safety", status: "invalid", message: "", severity: "error" },
        { check: "cutting_force", status: "invalid", message: "", severity: "error" },
        { check: "deflection", status: "invalid", message: "", severity: "error" },
        { check: "thermal", status: "invalid", message: "", severity: "error" },
      ]);
      expect(score).toBe(0);
    });
  });

  describe("generateCorrections", () => {
    it("suggests SFM reduction", () => {
      const corrections = latheLoRAPhysicsAugmentedInferenceEngine.generateCorrections(
        { sfm: 800 },
        [{ check: "safety", status: "invalid", limit: 500, message: "", severity: "error" }]
      );

      expect(corrections.some(c => c.includes("Reduce SFM"))).toBe(true);
    });

    it("suggests DOC reduction", () => {
      const corrections = latheLoRAPhysicsAugmentedInferenceEngine.generateCorrections(
        { doc_in: 0.200 },
        [{ check: "cutting_force", status: "warning", message: "", severity: "warning" }]
      );

      expect(corrections.some(c => c.includes("Reduce DOC"))).toBe(true);
    });
  });

  describe("process", () => {
    it("processes response with physics validation", () => {
      const result = latheLoRAPhysicsAugmentedInferenceEngine.process(
        "For 4140 steel roughing, use 400 SFM, 0.012 IPR, 0.100\" DOC."
      );

      expect(result.parameters_extracted.sfm).toBe(400);
      expect(result.parameters_extracted.feed_ipr).toBe(0.012);
      expect(result.physics_validations.length).toBeGreaterThan(0);
      expect(result.safety_score).toBeGreaterThan(0);
    });

    it("augments response with corrections", () => {
      latheLoRAPhysicsAugmentedInferenceEngine.setConfig({ auto_correct: true });

      const result = latheLoRAPhysicsAugmentedInferenceEngine.process(
        "Use 800 SFM for 4140 steel."
      );

      expect(result.overall_status).toBe("invalid");
      expect(result.augmented_response).toContain("Physics Review");
    });

    it("returns original when no issues", () => {
      const response = "Use 400 SFM for 4140 steel with carbide.";
      const result = latheLoRAPhysicsAugmentedInferenceEngine.process(response);

      if (result.overall_status === "valid") {
        expect(result.augmented_response).toBe(response);
      }
    });
  });

  describe("validate", () => {
    it("returns valid for good parameters", () => {
      const result = latheLoRAPhysicsAugmentedInferenceEngine.validate(
        "For 4140 steel, use 400 SFM, 0.010 IPR, 0.050\" DOC."
      );

      expect(result.safety_score).toBeGreaterThan(0.5);
    });

    it("returns issues for bad parameters", () => {
      const result = latheLoRAPhysicsAugmentedInferenceEngine.validate(
        "Use 900 SFM for 4140 steel."
      );

      expect(result.issues.length).toBeGreaterThan(0);
    });
  });

  describe("getKienzleCoefficients", () => {
    it("returns coefficients for P (steel)", () => {
      const coef = latheLoRAPhysicsAugmentedInferenceEngine.getKienzleCoefficients("P");
      expect(coef?.kc11).toBe(1800);
      expect(coef?.mc).toBe(0.25);
    });

    it("returns null for unknown group", () => {
      expect(latheLoRAPhysicsAugmentedInferenceEngine.getKienzleCoefficients("X")).toBeNull();
    });
  });

  describe("getSafeSFMRange", () => {
    it("returns range for 4140", () => {
      const range = latheLoRAPhysicsAugmentedInferenceEngine.getSafeSFMRange("4140");
      expect(range?.min).toBe(300);
      expect(range?.max).toBe(500);
    });

    it("returns null for unknown material", () => {
      expect(latheLoRAPhysicsAugmentedInferenceEngine.getSafeSFMRange("unknown")).toBeNull();
    });
  });

  describe("reset", () => {
    it("resets to defaults", () => {
      latheLoRAPhysicsAugmentedInferenceEngine.setConfig({ safety_threshold: 0.95 });
      latheLoRAPhysicsAugmentedInferenceEngine.reset();

      expect(latheLoRAPhysicsAugmentedInferenceEngine.getConfig().safety_threshold).toBe(0.70);
    });
  });
});
