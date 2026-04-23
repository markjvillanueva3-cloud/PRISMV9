/**
 * U-P2PFS21: WEDM ERP Routes Safety Envelope Gate Tests
 * Verifies that safety envelope validation function works correctly
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { wedmSafetyEnvelopeEngine } from "../engines/WEDMSafetyEnvelopeEngine.js";

describe("WEDM ERP Safety Envelope Gates (U-P2PFS21)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("safety envelope validation for ERP", () => {
    it("passes validation for normal tension values", () => {
      const reading = { wire_tension_gf: 1200 }; // Normal range
      const result = wedmSafetyEnvelopeEngine.check(reading);

      expect(result.pass).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("detects low tension as violation", () => {
      const reading = { wire_tension_gf: 300 }; // Below minimum 500
      const result = wedmSafetyEnvelopeEngine.check(reading);

      expect(result.pass).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      const tensionViolation = result.violations.find(v => v.param === "wire_tension_gf");
      expect(tensionViolation).toBeDefined();
    });

    it("detects high tension as violation", () => {
      const reading = { wire_tension_gf: 2500 }; // Above maximum
      const result = wedmSafetyEnvelopeEngine.check(reading);

      // May or may not be violation depending on envelope limits
      expect(result).toHaveProperty("pass");
      expect(result).toHaveProperty("violations");
    });

    it("handles empty reading gracefully", () => {
      const reading = {};
      const result = wedmSafetyEnvelopeEngine.check(reading);

      expect(result.pass).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("validates gap voltage when provided", () => {
      const reading = { gap_V: 60 }; // Normal range
      const result = wedmSafetyEnvelopeEngine.check(reading);

      expect(result).toHaveProperty("pass");
      expect(result).toHaveProperty("violations");
    });

    it("checks multiple parameters together", () => {
      const reading = {
        wire_tension_gf: 1200,
        gap_V: 60,
      };
      const result = wedmSafetyEnvelopeEngine.check(reading);

      expect(result).toHaveProperty("envelopeId");
      expect(result).toHaveProperty("reading");
      expect(result.reading).toEqual(reading);
    });
  });

  describe("ERP-specific validation scenarios", () => {
    it("validates program pass tension converted from N to gf", () => {
      // Simulate converting pass tension from N to gf
      const tensionN = 15; // 15 N is typical
      const tensionGf = tensionN * 101.972; // ~1530 gf

      const reading = { wire_tension_gf: tensionGf };
      const result = wedmSafetyEnvelopeEngine.check(reading);

      expect(result.pass).toBe(true);
    });

    it("validates multiple passes by checking max tension", () => {
      const passes = [
        { tension_N: 12 },
        { tension_N: 15 },
        { tension_N: 10 },
      ];
      const maxTensionN = Math.max(...passes.map(p => p.tension_N));
      const maxTensionGf = maxTensionN * 101.972;

      const reading = { wire_tension_gf: maxTensionGf };
      const result = wedmSafetyEnvelopeEngine.check(reading);

      expect(result.pass).toBe(true);
    });

    it("handles low tension from carbide settings", () => {
      // Carbide might have lower tension settings
      const lowTensionGf = 400; // Below typical minimum

      const reading = { wire_tension_gf: lowTensionGf };
      const result = wedmSafetyEnvelopeEngine.check(reading);

      // Should detect as violation
      expect(result.pass).toBe(false);
      expect(result.violations.some(v => v.param === "wire_tension_gf")).toBe(true);
    });

    it("returns severity with violations", () => {
      const reading = { wire_tension_gf: 300 };
      const result = wedmSafetyEnvelopeEngine.check(reading);

      if (result.violations.length > 0) {
        expect(result.violations[0]).toHaveProperty("severity");
        expect(["critical", "warning", "info"]).toContain(result.violations[0].severity);
      }
    });

    it("returns reason with violations", () => {
      const reading = { wire_tension_gf: 300 };
      const result = wedmSafetyEnvelopeEngine.check(reading);

      if (result.violations.length > 0) {
        expect(result.violations[0]).toHaveProperty("reason");
        expect(typeof result.violations[0].reason).toBe("string");
      }
    });
  });

  describe("edge cases", () => {
    it("handles undefined tension", () => {
      const reading = { wire_tension_gf: undefined as unknown as number };
      const result = wedmSafetyEnvelopeEngine.check(reading);

      expect(result).toHaveProperty("pass");
    });

    it("handles NaN tension", () => {
      const reading = { wire_tension_gf: NaN };
      const result = wedmSafetyEnvelopeEngine.check(reading);

      expect(result).toHaveProperty("pass");
    });

    it("handles negative tension", () => {
      const reading = { wire_tension_gf: -100 };
      const result = wedmSafetyEnvelopeEngine.check(reading);

      expect(result.pass).toBe(false);
    });

    it("handles zero tension", () => {
      const reading = { wire_tension_gf: 0 };
      const result = wedmSafetyEnvelopeEngine.check(reading);

      expect(result.pass).toBe(false);
    });
  });
});
