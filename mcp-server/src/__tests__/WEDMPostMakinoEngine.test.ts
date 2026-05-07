/**
 * Tests for WEDMPostMakinoEngine — Professional 6 / HyperDrive dialect.
 * MS-P1.5-ONESHOT/U-P1.5-OS-04
 */

import { describe, it, expect } from "vitest";
import { wedmPostMakinoEngine } from "../engines/WEDMPostMakinoEngine.js";
import type { WEDMController, WEDMPostInput } from "../engines/WEDMPostTypes.js";

const BASE: WEDMPostInput = {
  controller: "makino_u",
  program_number: "7105",
  part_description: "INSERT POCKET",
  material: "SKD11",
  thickness_mm: 40,
  wire_diameter_mm: 0.25,
  operations: [
    {
      type: "profile",
      pass: "rough",
      start_x: 0, start_y: 0,
      profile_points: [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 20 }, { x: 0, y: 20 }, { x: 0, y: 0 }],
      auto_thread: true,
      submerged: true,
    },
  ],
  units: "metric",
};

describe("WEDMPostMakinoEngine", () => {
  describe("controller support", () => {
    it("supports makino_u and makino_eu only", () => {
      expect(wedmPostMakinoEngine.supportedControllers).toEqual(["makino_u", "makino_eu"]);
    });

    it("rejects a non-Makino controller", () => {
      const out = wedmPostMakinoEngine.generate({ ...BASE, controller: "agie_cut" as WEDMController });
      expect(out.success).toBe(false);
    });

    it("returns 'Makino U' and 'Makino EU' display names", () => {
      expect(wedmPostMakinoEngine.dialectNameFor("makino_u")).toBe("Makino U");
      expect(wedmPostMakinoEngine.dialectNameFor("makino_eu")).toBe("Makino EU");
    });
  });

  describe("HyperDrive E+C tech pair", () => {
    it("emits an E-code paired with a C-code in one block (HyperDrive pattern)", () => {
      const out = wedmPostMakinoEngine.generate(BASE);
      expect(out.gcode_text).toMatch(/E450 C12/);
    });

    it("tech table has one C-code per pass", () => {
      const t = wedmPostMakinoEngine.getTechTable();
      expect(t.rough.c).toBe("C12");
      expect(t.skim1.c).toBe("C08");
      expect(t.skim2.c).toBe("C05");
      expect(t.skim3.c).toBe("C02");
    });

    it("header announces HyperDrive power supply", () => {
      const out = wedmPostMakinoEngine.generate(BASE);
      expect(out.gcode_text).toContain("POWER: HYPERDRIVE DIGITAL");
    });
  });

  describe("M-code emission (leading zero)", () => {
    it("uses M06 wire thread (not M6)", () => {
      const out = wedmPostMakinoEngine.generate(BASE);
      expect(out.gcode_text).toContain("M06 (AUTO WIRE THREAD)");
    });

    it("uses M07 wire cut", () => {
      const out = wedmPostMakinoEngine.generate(BASE);
      expect(out.gcode_text).toContain("M07 (WIRE CUT)");
    });

    it("uses M21/M22 submerge pair (not M28/M29)", () => {
      const out = wedmPostMakinoEngine.generate(BASE);
      expect(out.gcode_text).toContain("M21 (SUBMERGE ON)");
      expect(out.gcode_text).toContain("M22 (SUBMERGE OFF)");
    });

    it("emits M02 footer with leading zero", () => {
      const out = wedmPostMakinoEngine.generate(BASE);
      expect(out.gcode_text).toContain("M02");
    });
  });

  describe("offset (Dnn register)", () => {
    it("emits Dnn register word on compensation-on line", () => {
      const out = wedmPostMakinoEngine.generate(BASE);
      expect(out.gcode_text).toMatch(/G41 D01/);
    });

    it("loads offset value (µm) into Dnn preamble block", () => {
      const out = wedmPostMakinoEngine.generate({
        ...BASE,
        operations: [{ ...BASE.operations[0], offset_mm: 0.205 }],
      });
      expect(out.gcode_text).toContain("#01=205");
    });

    it("uses G42 for right offset", () => {
      const out = wedmPostMakinoEngine.generate({
        ...BASE,
        operations: [{ ...BASE.operations[0], offset_direction: "right" }],
      });
      expect(out.gcode_text).toMatch(/G42 D01/);
    });
  });

  describe("taper (G51 X<deg>)", () => {
    it("emits G51 X<deg> form (4-axis pure-X taper)", () => {
      const out = wedmPostMakinoEngine.generate({
        ...BASE,
        operations: [{ type: "taper", pass: "rough", taper_angle_deg: 6.25, start_x: 0, start_y: 0 }],
      });
      expect(out.gcode_text).toContain("G51 X6.2500");
    });
  });

  describe("coordinate precision", () => {
    it("metric uses 4 decimals (distinct from the 3-decimal vendors)", () => {
      const out = wedmPostMakinoEngine.generate({
        ...BASE,
        operations: [{ type: "profile", pass: "rough", start_x: 12.3456, start_y: 0, profile_points: [{ x: 12.3456, y: 0 }] }],
      });
      expect(out.gcode_text).toMatch(/X12\.3456/);
    });

    it("imperial converts mm → inch with 5 decimals", () => {
      const out = wedmPostMakinoEngine.generate({
        ...BASE,
        units: "imperial",
        operations: [{ type: "profile", pass: "rough", start_x: 25.4, start_y: 0, profile_points: [{ x: 25.4, y: 0 }] }],
      });
      expect(out.gcode_text).toMatch(/X1\.00000/);
    });
  });

  describe("4-axis U/V emission", () => {
    it("appends U/V words when profile points supply them", () => {
      const out = wedmPostMakinoEngine.generate({
        ...BASE,
        operations: [{ type: "profile", pass: "rough", start_x: 0, start_y: 0, profile_points: [{ x: 10, y: 10, u: 0.5, v: 0.5 }] }],
      });
      expect(out.gcode_text).toMatch(/G1 X10\.0000 Y10\.0000 U0\.5000 V0\.5000/);
    });
  });

  describe("warnings", () => {
    it("warns on > 300mm thickness", () => {
      const out = wedmPostMakinoEngine.generate({ ...BASE, thickness_mm: 350 });
      expect(out.warnings.some((w) => w.includes("300mm") || w.includes("U3"))).toBe(true);
    });

    it("warns when a pass has no profile_points", () => {
      const out = wedmPostMakinoEngine.generate({
        ...BASE,
        operations: [{ type: "profile", pass: "rough" }],
      });
      expect(out.warnings.some((w) => w.includes("no profile_points"))).toBe(true);
    });
  });

  describe("parse roundtrip", () => {
    it("recovers pass id from E-code", () => {
      const out = wedmPostMakinoEngine.generate({
        ...BASE,
        operations: [{ type: "profile", pass: "skim2" }],
      });
      const parsed = wedmPostMakinoEngine.parse(out.gcode_text);
      expect(parsed.operations[0].pass).toBe("skim2");
    });

    it("recovers offset_mm via 'OFS=Dnn mm' regex", () => {
      const out = wedmPostMakinoEngine.generate({
        ...BASE,
        operations: [{ ...BASE.operations[0], offset_mm: 0.175 }],
      });
      const parsed = wedmPostMakinoEngine.parse(out.gcode_text);
      expect(parsed.operations[0].offset_mm).toBeCloseTo(0.175, 3);
    });

    it("recovers taper angle", () => {
      const out = wedmPostMakinoEngine.generate({
        ...BASE,
        operations: [{ type: "taper", pass: "rough", taper_angle_deg: 8.75, start_x: 0, start_y: 0 }],
      });
      const parsed = wedmPostMakinoEngine.parse(out.gcode_text);
      expect(parsed.operations[0].taper_angle_deg).toBeCloseTo(8.75, 3);
    });
  });

  describe("dialect_specific payload", () => {
    it("flags uses_e_codes=true, uses_c_codes=true, power_supply=HyperDrive", () => {
      const out = wedmPostMakinoEngine.generate(BASE);
      expect(out.dialect_specific.uses_e_codes).toBe(true);
      expect(out.dialect_specific.uses_c_codes).toBe(true);
      expect(out.dialect_specific.power_supply).toContain("HyperDrive");
    });
  });
});
