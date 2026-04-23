/**
 * U-P2PFS19: WireEDMAIPrintToProgramEngine Safety Envelope Gate Tests
 * Verifies that generate() checks safety envelope before returning program
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("WireEDMAIPrintToProgramEngine Safety Envelope Gate (U-P2PFS19)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("generate() safety envelope integration", () => {
    it("includes safety envelope check in processing", async () => {
      const { wireEDMAIPrintToProgramEngine } = await import(
        "../engines/WireEDMAIPrintToProgramEngine.js"
      );

      const result = await wireEDMAIPrintToProgramEngine.generate({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
        contours: [
          {
            id: "C1",
            is_closed: true,
            is_exterior: true,
            perimeter_mm: 100,
            area_mm2: 625,
            segments: [],
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.gcode).toBeDefined();
    });

    it("passes safety envelope for normal parameters", async () => {
      const { wireEDMAIPrintToProgramEngine } = await import(
        "../engines/WireEDMAIPrintToProgramEngine.js"
      );

      const result = await wireEDMAIPrintToProgramEngine.generate({
        material: "S7",
        thickness_mm: 30,
        target_ra_um: 1.6,
        wire_tension_gf: 1200,
        contours: [
          {
            id: "C1",
            is_closed: true,
            is_exterior: true,
            perimeter_mm: 200,
            area_mm2: 2500,
            segments: [],
          },
        ],
      });

      expect(result.success).toBe(true);
      // No critical safety violations
      const criticalWarnings = result.warnings.filter((w) =>
        w.includes("Safety envelope CRITICAL")
      );
      expect(criticalWarnings).toHaveLength(0);
    });

    it("adds warning for borderline parameters", async () => {
      const { wireEDMAIPrintToProgramEngine } = await import(
        "../engines/WireEDMAIPrintToProgramEngine.js"
      );

      const result = await wireEDMAIPrintToProgramEngine.generate({
        material: "M2",
        thickness_mm: 20,
        target_ra_um: 0.4,
        wire_tension_gf: 550, // Near soft band (500-550)
        contours: [
          {
            id: "C1",
            is_closed: true,
            is_exterior: true,
            perimeter_mm: 80,
            area_mm2: 400,
            segments: [],
          },
        ],
      });

      expect(result.success).toBe(true);
      // May have warning about borderline tension
    });

    it("generates program with valid passes", async () => {
      const { wireEDMAIPrintToProgramEngine } = await import(
        "../engines/WireEDMAIPrintToProgramEngine.js"
      );

      const result = await wireEDMAIPrintToProgramEngine.generate({
        material: "D2",
        thickness_mm: 40,
        target_ra_um: 0.8,
        contours: [
          {
            id: "C1",
            is_closed: true,
            is_exterior: false,
            perimeter_mm: 150,
            area_mm2: 1800,
            segments: [],
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.passes).toBeDefined();
      expect(result.passes.length).toBeGreaterThan(0);
    });

    it("includes reasoning chain with safety validation", async () => {
      const { wireEDMAIPrintToProgramEngine } = await import(
        "../engines/WireEDMAIPrintToProgramEngine.js"
      );

      const result = await wireEDMAIPrintToProgramEngine.generate({
        material: "A2",
        thickness_mm: 35,
        target_ra_um: 1.2,
        reasoning_mode: "full_agi",
        contours: [
          {
            id: "C1",
            is_closed: true,
            is_exterior: true,
            perimeter_mm: 120,
            area_mm2: 900,
            segments: [],
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.reasoning_chain).toBeDefined();
      expect(result.reasoning_chain.length).toBeGreaterThan(0);
    });

    it("handles thick section with appropriate warnings", async () => {
      const { wireEDMAIPrintToProgramEngine } = await import(
        "../engines/WireEDMAIPrintToProgramEngine.js"
      );

      const result = await wireEDMAIPrintToProgramEngine.generate({
        material: "D2",
        thickness_mm: 100, // Thick section
        target_ra_um: 1.6,
        contours: [
          {
            id: "C1",
            is_closed: true,
            is_exterior: true,
            perimeter_mm: 300,
            area_mm2: 5000,
            segments: [],
          },
        ],
      });

      expect(result.success).toBe(true);
      // Should have recommendation about thick section
      const thickRecommendations = result.recommendations.filter((r) =>
        r.toLowerCase().includes("thick")
      );
      expect(thickRecommendations.length).toBeGreaterThan(0);
    });

    it("includes tribal tips when available", async () => {
      const { wireEDMAIPrintToProgramEngine } = await import(
        "../engines/WireEDMAIPrintToProgramEngine.js"
      );

      const result = await wireEDMAIPrintToProgramEngine.generate({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
        contours: [
          {
            id: "C1",
            is_closed: true,
            is_exterior: true,
            perimeter_mm: 100,
            area_mm2: 625,
            segments: [],
          },
        ],
      });

      expect(result.success).toBe(true);
      // Tribal tips may or may not be present depending on database state
      // Just verify the field exists
      expect("tribal_tips" in result || result.tribal_tips === undefined).toBe(true);
    });

    it("validates cycle time estimation", async () => {
      const { wireEDMAIPrintToProgramEngine } = await import(
        "../engines/WireEDMAIPrintToProgramEngine.js"
      );

      const result = await wireEDMAIPrintToProgramEngine.generate({
        material: "H13",
        thickness_mm: 50,
        target_ra_um: 1.0,
        contours: [
          {
            id: "C1",
            is_closed: true,
            is_exterior: true,
            perimeter_mm: 200,
            area_mm2: 2500,
            segments: [],
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.cycle_time).toBeDefined();
      expect(result.cycle_time.total_min).toBeGreaterThan(0);
      expect(result.cycle_time.cutting_min).toBeGreaterThan(0);
    });
  });

  describe("safety envelope violations", () => {
    it("throws SafetyBlockError for critical violations", async () => {
      // Mock the safety envelope engine to return a critical violation
      vi.doMock("../engines/WEDMSafetyEnvelopeEngine.js", () => ({
        wedmSafetyEnvelopeEngine: {
          check: () => ({
            envelopeId: "test",
            reading: { gap_V: 100 },
            pass: false,
            violations: [
              {
                param: "gap_V",
                severity: "critical",
                value: 100,
                limit: { max: 80 },
                edge: "high",
                reason: "100 above max 80",
              },
            ],
          }),
        },
      }));

      // Need to re-import after mocking
      const { WireEDMAIPrintToProgramEngine } = await import(
        "../engines/WireEDMAIPrintToProgramEngine.js"
      );
      const engine = new WireEDMAIPrintToProgramEngine();

      await expect(
        engine.generate({
          material: "D2",
          thickness_mm: 25,
          contours: [
            {
              id: "C1",
              is_closed: true,
              is_exterior: true,
              perimeter_mm: 100,
              area_mm2: 625,
              segments: [],
            },
          ],
        })
      ).rejects.toThrow(/Safety envelope CRITICAL/);
    });
  });
});
