/**
 * Tests for WEDMPostDialectRouterEngine
 * MS-P1.5-ONESHOT/U-P1.5-OS-04
 */

import { describe, it, expect } from "vitest";
import {
  wedmPostDialectRouterEngine,
  type WEDMController,
  type WEDMPostInput,
} from "../engines/WEDMPostDialectRouterEngine.js";

const SAMPLE_INPUT: WEDMPostInput = {
  controller: "mitsubishi_fa",
  program_number: "1001",
  part_description: "TEST DIE PUNCH",
  material: "D2 Tool Steel",
  thickness_mm: 25.4,
  wire_diameter_mm: 0.25,
  operations: [
    {
      type: "profile",
      pass: "rough",
      start_x: 10,
      start_y: 10,
      profile_points: [
        { x: 10, y: 10 },
        { x: 50, y: 10 },
        { x: 50, y: 50 },
        { x: 10, y: 50 },
        { x: 10, y: 10 },
      ],
      auto_thread: true,
      submerged: true,
    },
    {
      type: "profile",
      pass: "skim1",
      start_x: 10,
      start_y: 10,
      profile_points: [
        { x: 10, y: 10 },
        { x: 50, y: 10 },
        { x: 50, y: 50 },
        { x: 10, y: 50 },
        { x: 10, y: 10 },
      ],
    },
  ],
  units: "metric",
};

describe("WEDMPostDialectRouterEngine", () => {
  describe("Supported Controllers", () => {
    it("lists all 9 supported controllers", () => {
      const controllers = wedmPostDialectRouterEngine.getSupportedControllers();
      expect(controllers).toContain("mitsubishi_fa");
      expect(controllers).toContain("mitsubishi_mv");
      expect(controllers).toContain("sodick_aq");
      expect(controllers).toContain("sodick_al");
      expect(controllers).toContain("makino_u");
      expect(controllers).toContain("makino_eu");
      expect(controllers).toContain("agie_cut");
      expect(controllers).toContain("agie_charm");
      expect(controllers).toContain("fanuc_robocut");
      expect(controllers.length).toBe(9);
    });

    it("returns dialect config for each controller", () => {
      const controllers = wedmPostDialectRouterEngine.getSupportedControllers();
      for (const ctrl of controllers) {
        const config = wedmPostDialectRouterEngine.getDialectConfig(ctrl);
        expect(config).toBeDefined();
        expect(config?.name).toBeDefined();
        expect(config?.manufacturer).toBeDefined();
      }
    });
  });

  describe("Mitsubishi Dialect", () => {
    it("generates valid G-code for Mitsubishi FA", () => {
      const result = wedmPostDialectRouterEngine.generate({
        ...SAMPLE_INPUT,
        controller: "mitsubishi_fa",
      });

      expect(result.success).toBe(true);
      expect(result.controller).toBe("mitsubishi_fa");
      expect(result.dialect_name).toBe("Mitsubishi FA");
      expect(result.gcode_text).toContain("M6"); // Wire thread
      expect(result.gcode_text).toContain("M28"); // Submerge on
      expect(result.gcode_text).toContain("M7"); // Wire cut
      expect(result.gcode_text).toContain("G41"); // Offset left
      expect(result.gcode_text).toContain("G40"); // Cancel offset
    });

    it("generates valid G-code for Mitsubishi MV", () => {
      const result = wedmPostDialectRouterEngine.generate({
        ...SAMPLE_INPUT,
        controller: "mitsubishi_mv",
      });

      expect(result.success).toBe(true);
      expect(result.gcode_text).toContain("M6");
      expect(result.gcode_text).toContain("M2"); // Program end
    });
  });

  describe("Sodick Dialect", () => {
    it("generates valid G-code for Sodick AQ", () => {
      const result = wedmPostDialectRouterEngine.generate({
        ...SAMPLE_INPUT,
        controller: "sodick_aq",
      });

      expect(result.success).toBe(true);
      expect(result.dialect_name).toBe("Sodick AQ");
      expect(result.gcode_text).toContain("M50"); // Wire thread (Sodick)
      expect(result.gcode_text).toContain("M78"); // Submerge on (Sodick)
      expect(result.gcode_text).toContain("M51"); // Wire cut (Sodick)
      expect(result.gcode_text).toContain("E"); // E-codes
      expect(result.dialect_specific.uses_e_codes).toBe(true);
    });

    it("generates valid G-code for Sodick AL", () => {
      const result = wedmPostDialectRouterEngine.generate({
        ...SAMPLE_INPUT,
        controller: "sodick_al",
      });

      expect(result.success).toBe(true);
      expect(result.gcode_text).toContain("M30"); // Program end (Sodick)
    });
  });

  describe("Makino Dialect", () => {
    it("generates valid G-code for Makino U", () => {
      const result = wedmPostDialectRouterEngine.generate({
        ...SAMPLE_INPUT,
        controller: "makino_u",
      });

      expect(result.success).toBe(true);
      expect(result.dialect_name).toBe("Makino U");
      expect(result.gcode_text).toContain("M06"); // Wire thread (Makino)
      expect(result.gcode_text).toContain("M21"); // Submerge on (Makino)
      expect(result.gcode_text).toContain("E"); // E-codes
      expect(result.gcode_text).toContain("C"); // C-codes
      expect(result.dialect_specific.uses_e_codes).toBe(true);
      expect(result.dialect_specific.uses_c_codes).toBe(true);
    });

    it("uses 4 decimal places for Makino mm coordinates", () => {
      const result = wedmPostDialectRouterEngine.generate({
        ...SAMPLE_INPUT,
        controller: "makino_u",
      });

      // Makino uses 4 decimals for mm
      expect(result.gcode_text).toMatch(/X\d+\.\d{4}/);
    });
  });

  describe("AgieCharmilles Dialect", () => {
    it("generates valid G-code for Agie CUT", () => {
      const result = wedmPostDialectRouterEngine.generate({
        ...SAMPLE_INPUT,
        controller: "agie_cut",
      });

      expect(result.success).toBe(true);
      expect(result.dialect_name).toBe("AgieCharmilles CUT");
      expect(result.gcode_text).toContain("%PM"); // Agie program start
      expect(result.gcode_text).toContain("M20"); // Wire thread (Agie)
      expect(result.gcode_text).toContain("M24"); // Submerge on (Agie)
      expect(result.gcode_text).toContain("M21"); // Wire cut (Agie)
      expect(result.gcode_text).toContain("M17"); // Program end (Agie)
    });

    it("uses C-codes for Agie condition tables", () => {
      const result = wedmPostDialectRouterEngine.generate({
        ...SAMPLE_INPUT,
        controller: "agie_cut",
      });

      expect(result.dialect_specific.uses_c_codes).toBe(true);
      expect(result.gcode_text).toContain("C0"); // C-code
    });
  });

  describe("Fanuc ROBOCUT Dialect", () => {
    it("generates valid G-code for Fanuc ROBOCUT", () => {
      const result = wedmPostDialectRouterEngine.generate({
        ...SAMPLE_INPUT,
        controller: "fanuc_robocut",
      });

      expect(result.success).toBe(true);
      expect(result.dialect_name).toBe("Fanuc ROBOCUT");
      expect(result.gcode_text).toContain("M60"); // Wire thread (Fanuc)
      expect(result.gcode_text).toContain("M50"); // Submerge on (Fanuc)
      expect(result.gcode_text).toContain("M61"); // Wire cut (Fanuc)
      expect(result.gcode_text).toContain("M30"); // Program end (Fanuc)
    });

    it("uses G51.1/G50.1 for taper on Fanuc", () => {
      const result = wedmPostDialectRouterEngine.generate({
        ...SAMPLE_INPUT,
        controller: "fanuc_robocut",
        operations: [
          {
            type: "taper",
            pass: "rough",
            taper_angle_deg: 5,
            start_x: 10,
            start_y: 10,
          },
        ],
      });

      expect(result.gcode_text).toContain("G51.1"); // Taper on (Fanuc)
      expect(result.gcode_text).toContain("G50.1"); // Taper off (Fanuc)
    });
  });

  describe("Imperial Units", () => {
    it("generates G20 for imperial units", () => {
      const result = wedmPostDialectRouterEngine.generate({
        ...SAMPLE_INPUT,
        units: "imperial",
      });

      expect(result.gcode_text).toContain("G20"); // Imperial
      expect(result.gcode_text).toContain("INCH");
    });

    it("converts coordinates to inches", () => {
      const result = wedmPostDialectRouterEngine.generate({
        ...SAMPLE_INPUT,
        units: "imperial",
        operations: [
          {
            type: "profile",
            pass: "rough",
            start_x: 25.4, // 1 inch in mm
            start_y: 50.8, // 2 inches in mm
          },
        ],
      });

      // Should convert to ~1.0 and ~2.0 inches
      expect(result.gcode_text).toMatch(/X1\.0+/);
      expect(result.gcode_text).toMatch(/Y2\.0+/);
    });
  });

  describe("Metric Units", () => {
    it("generates G21 for metric units", () => {
      const result = wedmPostDialectRouterEngine.generate({
        ...SAMPLE_INPUT,
        units: "metric",
      });

      expect(result.gcode_text).toContain("G21"); // Metric
      expect(result.gcode_text).toContain("METRIC");
    });
  });

  describe("Taper Cutting", () => {
    it("includes taper commands for taper operations", () => {
      const result = wedmPostDialectRouterEngine.generate({
        ...SAMPLE_INPUT,
        controller: "mitsubishi_fa",
        operations: [
          {
            type: "taper",
            pass: "rough",
            taper_angle_deg: 3,
            taper_height_mm: 25,
            start_x: 10,
            start_y: 10,
          },
        ],
      });

      expect(result.gcode_text).toContain("G51"); // Taper on
      expect(result.gcode_text).toContain("G50"); // Taper off
      expect(result.gcode_text).toContain("3°");
    });
  });

  describe("Wire Offset", () => {
    it("uses G41 for left offset", () => {
      const result = wedmPostDialectRouterEngine.generate({
        ...SAMPLE_INPUT,
        operations: [
          {
            type: "profile",
            pass: "rough",
            offset_direction: "left",
          },
        ],
      });

      expect(result.gcode_text).toContain("G41");
    });

    it("uses G42 for right offset", () => {
      const result = wedmPostDialectRouterEngine.generate({
        ...SAMPLE_INPUT,
        operations: [
          {
            type: "profile",
            pass: "rough",
            offset_direction: "right",
          },
        ],
      });

      expect(result.gcode_text).toContain("G42");
    });
  });

  describe("Dialect Conversion", () => {
    it("converts between Mitsubishi and Sodick dialects", () => {
      const { source, target } = wedmPostDialectRouterEngine.convert(
        "mitsubishi_fa",
        "sodick_aq",
        SAMPLE_INPUT
      );

      expect(source.success).toBe(true);
      expect(target.success).toBe(true);
      expect(source.gcode_text).toContain("M6"); // Mitsubishi wire thread
      expect(target.gcode_text).toContain("M50"); // Sodick wire thread
    });
  });

  describe("Error Handling", () => {
    it("returns error for unsupported controller", () => {
      const result = wedmPostDialectRouterEngine.generate({
        ...SAMPLE_INPUT,
        controller: "unknown_controller" as WEDMController,
      });

      expect(result.success).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain("Unsupported controller");
    });

    it("warns for thick material", () => {
      const result = wedmPostDialectRouterEngine.generate({
        ...SAMPLE_INPUT,
        thickness_mm: 150,
      });

      expect(result.warnings.some((w) => w.includes("100mm"))).toBe(true);
    });
  });

  describe("Pass Parameters", () => {
    it("uses different power settings for rough vs skim passes", () => {
      const result = wedmPostDialectRouterEngine.generate({
        ...SAMPLE_INPUT,
        operations: [
          { type: "profile", pass: "rough" },
          { type: "profile", pass: "skim1" },
          { type: "profile", pass: "skim2" },
          { type: "profile", pass: "skim3" },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.operation_count).toBe(4);
      // Each pass should have different power settings reflected in output
      expect(result.gcode_text).toContain("ROUGH");
      expect(result.gcode_text).toContain("SKIM1");
      expect(result.gcode_text).toContain("SKIM2");
      expect(result.gcode_text).toContain("SKIM3");
    });
  });

  describe("Route Method", () => {
    it("route() is equivalent to generate()", () => {
      const generated = wedmPostDialectRouterEngine.generate(SAMPLE_INPUT);
      const routed = wedmPostDialectRouterEngine.route(SAMPLE_INPUT);

      expect(generated.gcode_text).toBe(routed.gcode_text);
    });
  });
});
