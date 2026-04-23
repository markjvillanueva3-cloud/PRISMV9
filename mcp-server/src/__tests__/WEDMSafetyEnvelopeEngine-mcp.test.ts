/**
 * U-P2PFS21: WEDMSafetyEnvelopeEngine MCP Wiring Tests
 * Verifies dispatcher actions wedm_safety_envelope_check, wedm_safety_envelope_get, wedm_safety_envelope_clean
 */
import { describe, it, expect } from "vitest";
import { wedmSafetyEnvelopeEngine, WEDMSafetyEnvelopeEngine } from "../engines/WEDMSafetyEnvelopeEngine.js";

describe("WEDMSafetyEnvelopeEngine MCP Wiring (U-P2PFS21)", () => {
  describe("check()", () => {
    it("returns EnvelopeReport structure", () => {
      const result = wedmSafetyEnvelopeEngine.check({
        wire_tension_gf: 1000,
        gap_V: 50,
      });

      expect(result).toHaveProperty("envelopeId");
      expect(result).toHaveProperty("reading");
      expect(result).toHaveProperty("pass");
      expect(result).toHaveProperty("violations");
    });

    it("passes for readings within limits", () => {
      const result = wedmSafetyEnvelopeEngine.check({
        wire_tension_gf: 1000,
        gap_V: 50,
        resistivity_Mohm_cm: 5,
        tank_level_pct: 90,
      });

      expect(result.pass).toBe(true);
      expect(result.violations.filter(v => v.severity === "critical")).toHaveLength(0);
    });

    it("fails for wire tension below minimum", () => {
      const result = wedmSafetyEnvelopeEngine.check({
        wire_tension_gf: 400, // Below min 500
      });

      expect(result.pass).toBe(false);
      const criticals = result.violations.filter(v => v.severity === "critical");
      expect(criticals.length).toBeGreaterThan(0);
      expect(criticals[0].param).toBe("wire_tension_gf");
    });

    it("fails for wire tension above maximum", () => {
      const result = wedmSafetyEnvelopeEngine.check({
        wire_tension_gf: 2500, // Above max 2000
      });

      expect(result.pass).toBe(false);
      const criticals = result.violations.filter(v => v.severity === "critical");
      expect(criticals.length).toBeGreaterThan(0);
    });

    it("warns for readings near soft band", () => {
      const result = wedmSafetyEnvelopeEngine.check({
        wire_tension_gf: 520, // Within soft band of min 500 (band = 50)
      });

      expect(result.pass).toBe(true);
      const warnings = result.violations.filter(v => v.severity === "warning");
      expect(warnings.length).toBeGreaterThan(0);
    });

    it("fails for low gap voltage", () => {
      const result = wedmSafetyEnvelopeEngine.check({
        gap_V: 15, // Below min 20
      });

      expect(result.pass).toBe(false);
    });

    it("fails for high gap voltage", () => {
      const result = wedmSafetyEnvelopeEngine.check({
        gap_V: 90, // Above max 80
      });

      expect(result.pass).toBe(false);
    });

    it("fails for low dielectric resistivity", () => {
      const result = wedmSafetyEnvelopeEngine.check({
        resistivity_Mohm_cm: 2, // Below min 3
      });

      expect(result.pass).toBe(false);
    });

    it("fails for low tank level", () => {
      const result = wedmSafetyEnvelopeEngine.check({
        tank_level_pct: 70, // Below min 80
      });

      expect(result.pass).toBe(false);
    });

    it("fails for too many wire breaks", () => {
      const result = wedmSafetyEnvelopeEngine.check({
        wire_breaks_in_window: 3, // Max is 2
      });

      expect(result.pass).toBe(false);
    });

    it("handles partial readings", () => {
      const result = wedmSafetyEnvelopeEngine.check({
        wire_tension_gf: 1000,
        // Other params omitted - should not cause errors
      });

      expect(result).toHaveProperty("pass");
    });

    it("reports multiple violations", () => {
      const result = wedmSafetyEnvelopeEngine.check({
        wire_tension_gf: 400,
        gap_V: 15,
        tank_level_pct: 50,
      });

      expect(result.pass).toBe(false);
      expect(result.violations.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("getEnvelope()", () => {
    it("returns envelope configuration", () => {
      const envelope = wedmSafetyEnvelopeEngine.getEnvelope();

      expect(envelope).toHaveProperty("id");
      expect(envelope).toHaveProperty("description");
      expect(envelope).toHaveProperty("limits");
    });

    it("includes wire tension limits", () => {
      const envelope = wedmSafetyEnvelopeEngine.getEnvelope();

      expect(envelope.limits.wire_tension_gf).toBeDefined();
      expect(envelope.limits.wire_tension_gf?.min).toBe(500);
      expect(envelope.limits.wire_tension_gf?.max).toBe(2000);
    });

    it("includes gap voltage limits", () => {
      const envelope = wedmSafetyEnvelopeEngine.getEnvelope();

      expect(envelope.limits.gap_V).toBeDefined();
      expect(envelope.limits.gap_V?.min).toBe(20);
      expect(envelope.limits.gap_V?.max).toBe(80);
    });
  });

  describe("isClean()", () => {
    it("returns true for fully clean readings", () => {
      const result = wedmSafetyEnvelopeEngine.isClean({
        wire_tension_gf: 1000,
        gap_V: 50,
        resistivity_Mohm_cm: 10,
        tank_level_pct: 95,
      });

      expect(result).toBe(true);
    });

    it("returns false for readings with warnings", () => {
      const result = wedmSafetyEnvelopeEngine.isClean({
        wire_tension_gf: 520, // Within soft band
        gap_V: 50,
      });

      expect(result).toBe(false);
    });

    it("returns false for readings with violations", () => {
      const result = wedmSafetyEnvelopeEngine.isClean({
        wire_tension_gf: 400, // Critical violation
      });

      expect(result).toBe(false);
    });
  });

  describe("static mapViolationToException()", () => {
    it("maps wire tension to wire_tension_out", () => {
      const violation = {
        param: "wire_tension_gf" as const,
        severity: "critical" as const,
        value: 400,
        limit: { min: 500, max: 2000 },
        edge: "low" as const,
        reason: "test",
      };

      const exception = wedmSafetyEnvelopeEngine.constructor.prototype.constructor.mapViolationToException(violation);
      expect(exception).toBe("wire_tension_out");
    });

    it("maps low gap_V to short_circuit", () => {
      const violation = {
        param: "gap_V" as const,
        severity: "critical" as const,
        value: 15,
        limit: { min: 20, max: 80 },
        edge: "low" as const,
        reason: "test",
      };

      const exception = WEDMSafetyEnvelopeEngine.mapViolationToException(violation);
      expect(exception).toBe("short_circuit");
    });

    it("maps high gap_V to open_circuit", () => {
      const violation = {
        param: "gap_V" as const,
        severity: "critical" as const,
        value: 90,
        limit: { min: 20, max: 80 },
        edge: "high" as const,
        reason: "test",
      };

      const exception = WEDMSafetyEnvelopeEngine.mapViolationToException(violation);
      expect(exception).toBe("open_circuit");
    });
  });
});
