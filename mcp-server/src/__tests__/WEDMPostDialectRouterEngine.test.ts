/**
 * Tests for the refactored WEDMPostDialectRouterEngine — now a thin
 * dispatcher over five per-vendor engines. Tests focus on the router
 * contract (delegation, shop-profile selection, conversion, roundtrip).
 * Per-vendor emission details live in the per-engine test files.
 *
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

describe("WEDMPostDialectRouterEngine (thin dispatcher)", () => {
  describe("Supported Controllers", () => {
    it("lists all 9 controllers covering 5 vendor engines", () => {
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

    it("returns dialect config with manufacturer + engine for each controller", () => {
      const controllers = wedmPostDialectRouterEngine.getSupportedControllers();
      for (const ctrl of controllers) {
        const config = wedmPostDialectRouterEngine.getDialectConfig(ctrl);
        expect(config).toBeDefined();
        expect(config?.name).toBeDefined();
        expect(config?.manufacturer).toBeDefined();
        expect(config?.engine).toBeDefined();
        expect(config?.engine.supportedControllers).toContain(ctrl);
      }
    });

    it("returns undefined for an unknown dialect config", () => {
      const config = wedmPostDialectRouterEngine.getDialectConfig("unknown" as WEDMController);
      expect(config).toBeUndefined();
    });
  });

  describe("Delegation to Vendor Engines", () => {
    it("delegates Mitsubishi FA to the Mitsubishi engine (M6/M7 wire codes)", () => {
      const out = wedmPostDialectRouterEngine.generate({
        ...SAMPLE_INPUT,
        controller: "mitsubishi_fa",
      });
      expect(out.success).toBe(true);
      expect(out.dialect_name).toBe("Mitsubishi FA");
      expect(out.gcode_text).toContain("M6 (AUTO WIRE THREAD)");
      expect(out.gcode_text).toContain("M7 (WIRE CUT)");
      expect(out.dialect_specific.manufacturer).toBe("Mitsubishi Electric");
    });

    it("delegates Sodick AQ to the Sodick engine (M50/M51 wire codes + E-table)", () => {
      const out = wedmPostDialectRouterEngine.generate({
        ...SAMPLE_INPUT,
        controller: "sodick_aq",
      });
      expect(out.success).toBe(true);
      expect(out.dialect_name).toBe("Sodick AQ");
      expect(out.gcode_text).toContain("M50 (AWT AUTO WIRE THREAD)");
      expect(out.gcode_text).toContain("M51 (AWT CUT)");
      expect(out.dialect_specific.uses_e_codes).toBe(true);
    });

    it("delegates Makino U to the Makino engine (HyperDrive E+C pair)", () => {
      const out = wedmPostDialectRouterEngine.generate({
        ...SAMPLE_INPUT,
        controller: "makino_u",
      });
      expect(out.success).toBe(true);
      expect(out.dialect_name).toBe("Makino U");
      expect(out.gcode_text).toContain("M06 (AUTO WIRE THREAD)");
      expect(out.gcode_text).toContain("M07 (WIRE CUT)");
      expect(out.dialect_specific.uses_e_codes).toBe(true);
      expect(out.dialect_specific.uses_c_codes).toBe(true);
    });

    it("delegates AgieCharmilles CUT to the Agie engine (%PM frame + M17)", () => {
      const out = wedmPostDialectRouterEngine.generate({
        ...SAMPLE_INPUT,
        controller: "agie_cut",
      });
      expect(out.success).toBe(true);
      expect(out.dialect_name).toBe("AgieCharmilles CUT");
      expect(out.gcode_text.startsWith("%PM")).toBe(true);
      expect(out.gcode_text).toContain("M20 (AWT AUTO WIRE THREAD)");
      expect(out.gcode_text).toContain("M21 (AWT CUT)");
      expect(out.gcode_text).toContain("M17");
      expect(out.dialect_specific.uses_tec_codes).toBe(true);
    });

    it("delegates Fanuc ROBOCUT to the Fanuc engine (macro vars + M60/M61)", () => {
      const out = wedmPostDialectRouterEngine.generate({
        ...SAMPLE_INPUT,
        controller: "fanuc_robocut",
      });
      expect(out.success).toBe(true);
      expect(out.dialect_name).toBe("Fanuc ROBOCUT");
      expect(out.gcode_text).toContain("#501=");
      expect(out.gcode_text).toContain("G65 P9010");
      expect(out.gcode_text).toContain("M60 (AUTO WIRE THREAD)");
      expect(out.gcode_text).toContain("M61 (WIRE CUT)");
      expect(out.dialect_specific.uses_macro_vars).toBe(true);
    });
  });

  describe("Shop-Profile Machine Selection (OS-04 exit criterion 2)", () => {
    it("selects mitsubishi_fa from 'Mitsubishi FA20S Advance'", () => {
      expect(wedmPostDialectRouterEngine.selectByMachine("Mitsubishi FA20S Advance")).toBe("mitsubishi_fa");
    });

    it("selects mitsubishi_mv from 'Mitsubishi MV2400R'", () => {
      expect(wedmPostDialectRouterEngine.selectByMachine("Mitsubishi MV2400R")).toBe("mitsubishi_mv");
    });

    it("selects sodick_aq from 'Sodick AQ535L'", () => {
      expect(wedmPostDialectRouterEngine.selectByMachine("Sodick AQ535L")).toBe("sodick_aq");
    });

    it("selects makino_u from 'Makino U6 HEAT'", () => {
      expect(wedmPostDialectRouterEngine.selectByMachine("Makino U6 HEAT")).toBe("makino_u");
    });

    it("selects agie_cut from 'AgieCharmilles CUT P 550'", () => {
      expect(wedmPostDialectRouterEngine.selectByMachine("AgieCharmilles CUT P 550")).toBe("agie_cut");
    });

    it("selects fanuc_robocut from 'Fanuc ROBOCUT α-C600iB'", () => {
      expect(wedmPostDialectRouterEngine.selectByMachine("Fanuc ROBOCUT α-C600iB")).toBe("fanuc_robocut");
    });

    it("returns undefined for an unrelated machine name", () => {
      expect(wedmPostDialectRouterEngine.selectByMachine("Haas VF-2 Milling Machine")).toBeUndefined();
      expect(wedmPostDialectRouterEngine.selectByMachine("")).toBeUndefined();
    });
  });

  describe("Imperial Units (delegated)", () => {
    it("emits G20 and converts coordinates when imperial is selected", () => {
      const out = wedmPostDialectRouterEngine.generate({
        ...SAMPLE_INPUT,
        units: "imperial",
        operations: [
          { type: "profile", pass: "rough", start_x: 25.4, start_y: 50.8, profile_points: [{ x: 25.4, y: 50.8 }] },
        ],
      });
      expect(out.gcode_text).toContain("G20");
      expect(out.gcode_text).toContain("INCH");
      // 25.4 mm = 1.000 inch exactly.
      expect(out.gcode_text).toMatch(/X1\.0{3,}/);
      expect(out.gcode_text).toMatch(/Y2\.0{3,}/);
    });

    it("emits G21 for metric", () => {
      const out = wedmPostDialectRouterEngine.generate({ ...SAMPLE_INPUT, units: "metric" });
      expect(out.gcode_text).toContain("G21");
      expect(out.gcode_text).toContain("METRIC");
    });
  });

  describe("Taper Cutting (dialect-specific codes)", () => {
    it("Mitsubishi taper emits G51/G50 with A-word", () => {
      const out = wedmPostDialectRouterEngine.generate({
        ...SAMPLE_INPUT,
        controller: "mitsubishi_fa",
        operations: [
          { type: "taper", pass: "rough", taper_angle_deg: 3, taper_height_mm: 25, start_x: 10, start_y: 10 },
        ],
      });
      expect(out.gcode_text).toContain("G51 A3.000");
      expect(out.gcode_text).toContain("G50");
    });

    it("Fanuc taper emits G51.1/G50.1", () => {
      const out = wedmPostDialectRouterEngine.generate({
        ...SAMPLE_INPUT,
        controller: "fanuc_robocut",
        operations: [{ type: "taper", pass: "rough", taper_angle_deg: 5, start_x: 10, start_y: 10 }],
      });
      expect(out.gcode_text).toContain("G51.1 X5.000");
      expect(out.gcode_text).toContain("G50.1");
    });

    it("Agie taper emits G08/G09 (not G51/G50)", () => {
      const out = wedmPostDialectRouterEngine.generate({
        ...SAMPLE_INPUT,
        controller: "agie_cut",
        operations: [{ type: "taper", pass: "rough", taper_angle_deg: 7, start_x: 10, start_y: 10 }],
      });
      expect(out.gcode_text).toContain("G08 A7.000");
      expect(out.gcode_text).toContain("G09");
    });
  });

  describe("Wire Offset G41/G42", () => {
    it("uses G41 for left offset", () => {
      const out = wedmPostDialectRouterEngine.generate({
        ...SAMPLE_INPUT,
        operations: [{ type: "profile", pass: "rough", offset_direction: "left", start_x: 0, start_y: 0, profile_points: [{ x: 1, y: 1 }] }],
      });
      expect(out.gcode_text).toContain("G41");
      expect(out.gcode_text).not.toMatch(/\bG42\b/);
    });

    it("uses G42 for right offset", () => {
      const out = wedmPostDialectRouterEngine.generate({
        ...SAMPLE_INPUT,
        operations: [{ type: "profile", pass: "rough", offset_direction: "right", start_x: 0, start_y: 0, profile_points: [{ x: 1, y: 1 }] }],
      });
      expect(out.gcode_text).toContain("G42");
    });
  });

  describe("Dialect Conversion", () => {
    it("convert() produces distinct outputs for source vs target dialect", () => {
      const { source, target } = wedmPostDialectRouterEngine.convert(
        "mitsubishi_fa",
        "sodick_aq",
        SAMPLE_INPUT
      );
      expect(source.success).toBe(true);
      expect(target.success).toBe(true);
      expect(source.gcode_text).toContain("M6 (AUTO WIRE THREAD)");
      expect(target.gcode_text).toContain("M50 (AWT AUTO WIRE THREAD)");
      expect(source.gcode_text).not.toEqual(target.gcode_text);
    });

    it("convert() preserves operation count across dialects", () => {
      const { source, target } = wedmPostDialectRouterEngine.convert(
        "makino_u",
        "fanuc_robocut",
        SAMPLE_INPUT
      );
      expect(source.operation_count).toBe(target.operation_count);
      expect(source.operation_count).toBe(2);
    });
  });

  describe("Roundtrip (OS-04 exit criterion 4)", () => {
    it.each([
      ["mitsubishi_fa"],
      ["sodick_aq"],
      ["makino_u"],
      ["agie_cut"],
      ["fanuc_robocut"],
    ] as const)("generate → parse keeps operation count equivalent for %s", (controller) => {
      const { output, parsed } = wedmPostDialectRouterEngine.roundtrip({ ...SAMPLE_INPUT, controller });
      expect(output.success).toBe(true);
      expect(parsed.operations.length).toBe(SAMPLE_INPUT.operations.length);
    });

    it("roundtrip preserves program number in parsed plan", () => {
      const { parsed } = wedmPostDialectRouterEngine.roundtrip({
        ...SAMPLE_INPUT,
        controller: "sodick_aq",
        program_number: "2045",
      });
      expect(parsed.program_number).toBe("2045");
    });

    it("roundtrip recovers offset direction per op", () => {
      const { parsed } = wedmPostDialectRouterEngine.roundtrip({
        ...SAMPLE_INPUT,
        controller: "mitsubishi_fa",
        operations: [
          { type: "profile", pass: "rough", offset_direction: "right", start_x: 0, start_y: 0, profile_points: [{ x: 1, y: 1 }] },
          { type: "profile", pass: "skim1", offset_direction: "left",  start_x: 0, start_y: 0, profile_points: [{ x: 1, y: 1 }] },
        ],
      });
      expect(parsed.operations[0].offset_direction).toBe("right");
      expect(parsed.operations[1].offset_direction).toBe("left");
    });
  });

  describe("Error Handling", () => {
    it("returns success=false for unsupported controller", () => {
      const out = wedmPostDialectRouterEngine.generate({
        ...SAMPLE_INPUT,
        controller: "unknown_controller" as WEDMController,
      });
      expect(out.success).toBe(false);
      expect(out.warnings.length).toBeGreaterThan(0);
      expect(out.warnings[0]).toContain("Unsupported controller");
    });

    it("warns on thick material (>100mm) for Mitsubishi FA", () => {
      const out = wedmPostDialectRouterEngine.generate({
        ...SAMPLE_INPUT,
        controller: "mitsubishi_fa",
        thickness_mm: 150,
      });
      expect(out.warnings.some((w) => w.includes("100mm"))).toBe(true);
    });
  });

  describe("Pass Parameters", () => {
    it("emits distinct pass-id blocks for rough + skim1 + skim2 + skim3", () => {
      const out = wedmPostDialectRouterEngine.generate({
        ...SAMPLE_INPUT,
        controller: "mitsubishi_fa",
        operations: [
          { type: "profile", pass: "rough" },
          { type: "profile", pass: "skim1" },
          { type: "profile", pass: "skim2" },
          { type: "profile", pass: "skim3" },
        ],
      });
      expect(out.success).toBe(true);
      expect(out.operation_count).toBe(4);
      expect(out.gcode_text).toContain("ROUGH");
      expect(out.gcode_text).toContain("SKIM1");
      expect(out.gcode_text).toContain("SKIM2");
      expect(out.gcode_text).toContain("SKIM3");
    });
  });

  describe("Route Method (alias)", () => {
    it("route() is equivalent to generate()", () => {
      const generated = wedmPostDialectRouterEngine.generate(SAMPLE_INPUT);
      const routed = wedmPostDialectRouterEngine.route(SAMPLE_INPUT);
      expect(generated.gcode_text).toBe(routed.gcode_text);
    });
  });
});
