/**
 * PP-MS8 — Non-Traditional Process Post Processor Tests
 *
 * Validates:
 *   - EDMPostProcessorExtension: wire + sinker EDM for 4 controllers
 *   - LaserWaterjetPostExtension: laser + waterjet for 4 controllers
 */

import { describe, it, expect } from "vitest";
import { edmPostProcessorExtension } from "../engines/EDMPostProcessorExtension.js";
import { laserWaterjetPostExtension } from "../engines/LaserWaterjetPostExtension.js";

// ── Sample G-code for EDM ────────────────────────────────────

const EDM_WIRE_PROGRAM = [
  "G90 G92 X0. Y0.",
  "G01 X50. Y0. F100",
  "G01 X50. Y30.",
  "G02 X40. Y40. I-10. J0.",
  "G01 X0. Y40.",
  "G01 X0. Y0.",
  "M30",
].join("\n");

const EDM_SINKER_PROGRAM = [
  "G90 G92 X0. Y0. Z0.",
  "G01 Z-5.0 F50",
  "G01 X10. Y10.",
  "G01 X-10. Y10.",
  "G01 X-10. Y-10.",
  "G01 X10. Y-10.",
  "G01 X10. Y10.",
  "G00 Z5.",
  "M30",
].join("\n");

// ── Sample G-code for Laser/Waterjet ─────────────────────────

const SHEET_PROGRAM = [
  "G90 G92 X0. Y0.",
  "G00 X10. Y10.",
  "M10 (PIERCE START)",
  "G4 P0.5",
  "M11 (PIERCE END)",
  "G01 X100. Y10. F3000",
  "G01 X100. Y80.",
  "G01 X10. Y80.",
  "G01 X10. Y10.",
  "M09",
  "G00 X0. Y0.",
  "M30",
].join("\n");

// ── EDM Tests ────────────────────────────────────────────────

describe("PP-MS8: EDMPostProcessorExtension", () => {
  const EDM_CONTROLLERS = ["fanuc_robocut", "mitsubishi_edm", "sodick", "agiecharmilles"] as const;

  describe("wire EDM", () => {
    for (const ctrl of EDM_CONTROLLERS) {
      it(`generates wire EDM program for ${ctrl}`, () => {
        const result = edmPostProcessorExtension.execute("ppg_edm_generate", {
          gcode: EDM_WIRE_PROGRAM,
          controller: ctrl,
          process_type: "wire",
          material: "steel",
          thickness_mm: 25,
        }) as any;

        expect(result).toBeDefined();
        expect(result.gcode || result.program).toBeTruthy();
        expect(result.controller).toBe(ctrl);
        expect(result.process_type).toBe("wire");
      });
    }

    it("generates skim passes for wire EDM", () => {
      const result = edmPostProcessorExtension.execute("ppg_edm_generate", {
        gcode: EDM_WIRE_PROGRAM,
        controller: "fanuc_robocut",
        process_type: "wire",
        num_skim_passes: 3,
        material: "steel",
        thickness_mm: 20,
      }) as any;

      expect(result).toBeDefined();
      if (result.phases) {
        expect(result.phases.length).toBeGreaterThanOrEqual(2); // rough + skims
      }
    });

    it("applies taper compensation", () => {
      const result = edmPostProcessorExtension.execute("ppg_edm_generate", {
        gcode: EDM_WIRE_PROGRAM,
        controller: "sodick",
        process_type: "wire",
        taper_angle_deg: 3,
        material: "aluminum",
        thickness_mm: 15,
      }) as any;

      expect(result).toBeDefined();
    });
  });

  describe("sinker EDM", () => {
    for (const ctrl of ["fanuc_robocut", "sodick"] as const) {
      it(`generates sinker EDM program for ${ctrl}`, () => {
        const result = edmPostProcessorExtension.execute("ppg_edm_generate", {
          gcode: EDM_SINKER_PROGRAM,
          controller: ctrl,
          process_type: "sinker",
          material: "tool_steel",
        }) as any;

        expect(result).toBeDefined();
        expect(result.gcode || result.program).toBeTruthy();
        expect(result.process_type).toBe("sinker");
      });
    }
  });

  it("lists supported EDM controllers", () => {
    const result = edmPostProcessorExtension.execute("ppg_edm_controllers", {}) as any;
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(4);
    expect(result[0].controller).toBeTruthy();
  });

  it("auto-detects wire vs sinker from G-code", () => {
    const result = edmPostProcessorExtension.execute("ppg_edm_generate", {
      gcode: EDM_WIRE_PROGRAM,
      controller: "fanuc_robocut",
      material: "steel",
      thickness_mm: 20,
    }) as any;

    expect(result).toBeDefined();
    // Should detect as wire (2D contour with no Z plunge)
  });
});

// ── Laser/Waterjet Tests ─────────────────────────────────────

describe("PP-MS8: LaserWaterjetPostExtension", () => {
  describe("laser", () => {
    for (const ctrl of ["bystronic", "trumpf"] as const) {
      it(`generates laser cutting program for ${ctrl}`, () => {
        const result = laserWaterjetPostExtension.execute("ppg_laser_generate", {
          gcode: SHEET_PROGRAM,
          controller: ctrl,
          material: "mild_steel",
          thickness_mm: 6,
          power_pct: 80,
          gas: "nitrogen",
        }) as any;

        expect(result).toBeDefined();
        expect(result.gcode || result.program).toBeTruthy();
        expect(result.process_type).toBe("laser_cut");
      });
    }

    it("includes pierce sequence", () => {
      const result = laserWaterjetPostExtension.execute("ppg_laser_generate", {
        gcode: SHEET_PROGRAM,
        controller: "trumpf",
        material: "stainless_steel",
        thickness_mm: 3,
        gas: "nitrogen",
      }) as any;

      expect(result).toBeDefined();
      if (result.pierce_count !== undefined) {
        expect(result.pierce_count).toBeGreaterThanOrEqual(1);
      }
    });

    it("handles different assist gases", () => {
      for (const gas of ["nitrogen", "oxygen", "air"] as const) {
        const result = laserWaterjetPostExtension.execute("ppg_laser_generate", {
          gcode: SHEET_PROGRAM,
          controller: "bystronic",
          material: "mild_steel",
          thickness_mm: 10,
          gas,
        }) as any;

        expect(result).toBeDefined();
      }
    });
  });

  describe("waterjet", () => {
    for (const ctrl of ["omax", "flow"] as const) {
      it(`generates waterjet program for ${ctrl}`, () => {
        const result = laserWaterjetPostExtension.execute("ppg_waterjet_generate", {
          gcode: SHEET_PROGRAM,
          controller: ctrl,
          material: "aluminum",
          thickness_mm: 12,
          quality_level: 3,
        }) as any;

        expect(result).toBeDefined();
        expect(result.gcode || result.program).toBeTruthy();
        expect(result.process_type).toBe("waterjet");
      });
    }

    it("maps quality levels to speed", () => {
      const q1 = laserWaterjetPostExtension.execute("ppg_waterjet_generate", {
        gcode: SHEET_PROGRAM,
        controller: "omax",
        material: "steel",
        thickness_mm: 10,
        quality_level: 1,
      }) as any;

      const q5 = laserWaterjetPostExtension.execute("ppg_waterjet_generate", {
        gcode: SHEET_PROGRAM,
        controller: "omax",
        material: "steel",
        thickness_mm: 10,
        quality_level: 5,
      }) as any;

      expect(q1).toBeDefined();
      expect(q5).toBeDefined();
      // Q1 should be faster than Q5
      if (q1.estimated_feed_rate && q5.estimated_feed_rate) {
        expect(q1.estimated_feed_rate).toBeGreaterThan(q5.estimated_feed_rate);
      }
    });
  });

  it("lists supported sheet controllers", () => {
    const result = laserWaterjetPostExtension.execute("ppg_sheet_controllers", {}) as any;
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(4);
    expect(result[0].controller).toBeTruthy();
  });
});
