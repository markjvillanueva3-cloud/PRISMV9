/**
 * U-P2PFS20: WEDMPrintToProgramEngine Safety Envelope Gate Tests
 * Verifies that generate() checks safety envelope before returning program
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const basicDxf = `0
SECTION
2
ENTITIES
0
LWPOLYLINE
8
0
90
4
70
1
10
0.0
20
0.0
10
25.0
20
0.0
10
25.0
20
25.0
10
0.0
20
25.0
0
ENDSEC
0
EOF`;

describe("WEDMPrintToProgramEngine Safety Envelope Gate (U-P2PFS20)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("generate() safety envelope integration", () => {
    it("includes safety envelope check in processing", async () => {
      const { wedmPrintToProgramEngine } = await import(
        "../engines/WEDMPrintToProgramEngine.js"
      );

      const result = await wedmPrintToProgramEngine.generate({
        dxf_content: basicDxf,
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
      });

      expect(result.success).toBe(true);
      expect(result.program_text).toBeDefined();
    });

    it("passes safety envelope for normal parameters", async () => {
      const { wedmPrintToProgramEngine } = await import(
        "../engines/WEDMPrintToProgramEngine.js"
      );

      const result = await wedmPrintToProgramEngine.generate({
        dxf_content: basicDxf,
        material: "D2",
        thickness_mm: 30,
        target_ra_um: 1.6,
      });

      expect(result.success).toBe(true);
      const criticalWarnings = result.warnings.filter((w) =>
        w.includes("Safety envelope CRITICAL")
      );
      expect(criticalWarnings).toHaveLength(0);
    });

    it("adds stage for safety envelope check", async () => {
      const { wedmPrintToProgramEngine } = await import(
        "../engines/WEDMPrintToProgramEngine.js"
      );

      const result = await wedmPrintToProgramEngine.generate({
        dxf_content: basicDxf,
        material: "M2",
        thickness_mm: 20,
        target_ra_um: 0.4,
      });

      expect(result.success).toBe(true);
      expect(result.stages_completed).toContain("safety_envelope_checked");
    });

    it("generates program with valid passes", async () => {
      const { wedmPrintToProgramEngine } = await import(
        "../engines/WEDMPrintToProgramEngine.js"
      );

      const result = await wedmPrintToProgramEngine.generate({
        dxf_content: basicDxf,
        material: "D2",
        thickness_mm: 40,
        target_ra_um: 0.8,
      });

      expect(result.success).toBe(true);
      expect(result.pass_details).toBeDefined();
      expect(result.pass_details!.length).toBeGreaterThan(0);
    });

    it("includes setup sheet with proper wire settings", async () => {
      const { wedmPrintToProgramEngine } = await import(
        "../engines/WEDMPrintToProgramEngine.js"
      );

      const result = await wedmPrintToProgramEngine.generate({
        dxf_content: basicDxf,
        material: "A2",
        thickness_mm: 35,
        target_ra_um: 1.2,
      });

      expect(result.success).toBe(true);
      expect(result.setup_sheet).toBeDefined();
      expect(result.setup_sheet!.wire_type).toBeDefined();
    });

    it("handles thick section with appropriate warnings", async () => {
      const { wedmPrintToProgramEngine } = await import(
        "../engines/WEDMPrintToProgramEngine.js"
      );

      const result = await wedmPrintToProgramEngine.generate({
        dxf_content: basicDxf,
        material: "D2",
        thickness_mm: 100,
        target_ra_um: 1.6,
      });

      expect(result.success).toBe(true);
      const thickWarnings = result.warnings.filter((w) =>
        w.toLowerCase().includes("thick") || w.toLowerCase().includes("flushing")
      );
      expect(thickWarnings.length).toBeGreaterThan(0);
    });

    it("validates cycle time estimation", async () => {
      const { wedmPrintToProgramEngine } = await import(
        "../engines/WEDMPrintToProgramEngine.js"
      );

      const result = await wedmPrintToProgramEngine.generate({
        dxf_content: basicDxf,
        material: "H13",
        thickness_mm: 50,
        target_ra_um: 1.0,
      });

      expect(result.success).toBe(true);
      expect(result.cycle_time_breakdown).toBeDefined();
      expect(result.cycle_time_breakdown!.total_time_min).toBeGreaterThan(0);
    });

    it("includes confidence score in result", async () => {
      const { wedmPrintToProgramEngine } = await import(
        "../engines/WEDMPrintToProgramEngine.js"
      );

      const result = await wedmPrintToProgramEngine.generate({
        dxf_content: basicDxf,
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
      });

      expect(result.success).toBe(true);
      expect(result.confidence_score).toBeDefined();
      expect(result.confidence_score!.overall).toBeGreaterThan(0);
    });

    it("includes geometry summary in result", async () => {
      const { wedmPrintToProgramEngine } = await import(
        "../engines/WEDMPrintToProgramEngine.js"
      );

      const result = await wedmPrintToProgramEngine.generate({
        dxf_content: basicDxf,
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
      });

      expect(result.success).toBe(true);
      expect(result.geometry_summary).toBeDefined();
      expect(result.geometry_summary!.num_contours).toBeGreaterThan(0);
    });

    it("includes all expected stages in processing", async () => {
      const { wedmPrintToProgramEngine } = await import(
        "../engines/WEDMPrintToProgramEngine.js"
      );

      const result = await wedmPrintToProgramEngine.generate({
        dxf_content: basicDxf,
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
      });

      expect(result.success).toBe(true);
      expect(result.stages_completed).toContain("dxf_parsed");
      expect(result.stages_completed).toContain("settings_calculated");
      expect(result.stages_completed).toContain("multipass_planned");
      expect(result.stages_completed).toContain("gcode_generated");
      expect(result.stages_completed).toContain("safety_envelope_checked");
    });
  });

  describe("safety envelope violations", () => {
    it("throws SafetyBlockError for critical violations", async () => {
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

      const { WEDMPrintToProgramEngine } = await import(
        "../engines/WEDMPrintToProgramEngine.js"
      );
      const engine = new WEDMPrintToProgramEngine();

      await expect(
        engine.generate({
          dxf_content: basicDxf,
          material: "D2",
          thickness_mm: 25,
        })
      ).rejects.toThrow(/Safety envelope CRITICAL/);
    });
  });
});
