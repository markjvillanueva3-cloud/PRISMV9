/**
 * Tests for WEDMPostSodickEngine — LN-control AQ + AL dialects.
 * MS-P1.5-ONESHOT/U-P1.5-OS-04
 */

import { describe, it, expect } from "vitest";
import { wedmPostSodickEngine } from "../engines/WEDMPostSodickEngine.js";
import type { WEDMController, WEDMPostInput } from "../engines/WEDMPostTypes.js";

const BASE: WEDMPostInput = {
  controller: "sodick_aq",
  program_number: "3012",
  part_description: "DIE CAVITY",
  material: "SKD11",
  thickness_mm: 32,
  wire_diameter_mm: 0.25,
  operations: [
    {
      type: "profile",
      pass: "rough",
      start_x: 5, start_y: 5,
      profile_points: [{ x: 5, y: 5 }, { x: 45, y: 5 }, { x: 45, y: 45 }, { x: 5, y: 45 }, { x: 5, y: 5 }],
      auto_thread: true,
      submerged: true,
    },
  ],
  units: "metric",
};

describe("WEDMPostSodickEngine", () => {
  describe("controller support", () => {
    it("supports sodick_aq and sodick_al only", () => {
      expect(wedmPostSodickEngine.supportedControllers).toEqual(["sodick_aq", "sodick_al"]);
    });

    it("rejects non-Sodick controllers", () => {
      const out = wedmPostSodickEngine.generate({ ...BASE, controller: "makino_u" as WEDMController });
      expect(out.success).toBe(false);
    });

    it("returns 'Sodick AQ' and 'Sodick AL' display names", () => {
      expect(wedmPostSodickEngine.dialectNameFor("sodick_aq")).toBe("Sodick AQ");
      expect(wedmPostSodickEngine.dialectNameFor("sodick_al")).toBe("Sodick AL");
    });
  });

  describe("tech table (E + S codes)", () => {
    it("exposes 4 distinct E-codes — one per pass", () => {
      const t = wedmPostSodickEngine.getTechTable();
      expect(t.rough.e).toBe("E510");
      expect(t.skim1.e).toBe("E520");
      expect(t.skim2.e).toBe("E530");
      expect(t.skim3.e).toBe("E540");
    });

    it("emits both E-code and S-code blocks in the rough op", () => {
      const out = wedmPostSodickEngine.generate(BASE);
      expect(out.gcode_text).toContain("E510");
      expect(out.gcode_text).toContain("S04");
    });

    it("uses S-code servo reference that decreases with finer passes", () => {
      const t = wedmPostSodickEngine.getTechTable();
      expect(Number(t.rough.s.slice(1))).toBeGreaterThan(Number(t.skim3.s.slice(1)));
    });
  });

  describe("M-code emission", () => {
    it("uses AWT M50/M51 wire codes", () => {
      const out = wedmPostSodickEngine.generate(BASE);
      expect(out.gcode_text).toContain("M50 (AWT AUTO WIRE THREAD)");
      expect(out.gcode_text).toContain("M51 (AWT CUT)");
    });

    it("uses M78/M79 submerge pair", () => {
      const out = wedmPostSodickEngine.generate(BASE);
      expect(out.gcode_text).toContain("M78 (SUBMERGE ON)");
      expect(out.gcode_text).toContain("M79 (SUBMERGE OFF)");
    });

    it("emits G82/G81 nozzle positioning on submerged ops", () => {
      const out = wedmPostSodickEngine.generate(BASE);
      expect(out.gcode_text).toContain("G82 (NOZZLE DOWN)");
      expect(out.gcode_text).toContain("G81 (NOZZLE UP)");
    });
  });

  describe("corner control", () => {
    it("emits CC2 for rough passes", () => {
      const out = wedmPostSodickEngine.generate(BASE);
      expect(out.gcode_text).toContain("CC2 (CORNER CONTROL MEDIUM)");
    });

    it("skips corner control on skim passes", () => {
      const out = wedmPostSodickEngine.generate({
        ...BASE,
        operations: [{ type: "profile", pass: "skim1", start_x: 0, start_y: 0, profile_points: [{ x: 1, y: 1 }] }],
      });
      expect(out.gcode_text).not.toContain("CC2");
    });
  });

  describe("offset (G41/G42 with Hnnn µm register)", () => {
    it("emits H<um> offset word — 0.152mm → H152", () => {
      const out = wedmPostSodickEngine.generate({
        ...BASE,
        operations: [{ ...BASE.operations[0], offset_mm: 0.152 }],
      });
      expect(out.gcode_text).toContain("H152");
    });

    it("uses G42 when direction is right", () => {
      const out = wedmPostSodickEngine.generate({
        ...BASE,
        operations: [{ ...BASE.operations[0], offset_direction: "right" }],
      });
      expect(out.gcode_text).toMatch(/G42 H/);
    });
  });

  describe("taper (G51 P<deg>)", () => {
    it("emits G51 P<deg> form (not A-word)", () => {
      const out = wedmPostSodickEngine.generate({
        ...BASE,
        operations: [{ type: "taper", pass: "rough", taper_angle_deg: 4.2, start_x: 0, start_y: 0 }],
      });
      expect(out.gcode_text).toContain("G51 P4.200");
      expect(out.gcode_text).not.toContain("G51 A");
    });
  });

  describe("coordinates", () => {
    it("metric uses 3 decimals", () => {
      const out = wedmPostSodickEngine.generate({
        ...BASE,
        operations: [{ type: "profile", pass: "rough", start_x: 9.8765, start_y: 0, profile_points: [{ x: 9.8765, y: 0 }] }],
      });
      expect(out.gcode_text).toMatch(/X9\.877/);
    });

    it("imperial emits G20 and converts 50.8mm → 2.00000in", () => {
      const out = wedmPostSodickEngine.generate({
        ...BASE,
        units: "imperial",
        operations: [{ type: "profile", pass: "rough", start_x: 50.8, start_y: 0, profile_points: [{ x: 50.8, y: 0 }] }],
      });
      expect(out.gcode_text).toContain("G20");
      expect(out.gcode_text).toMatch(/X2\.00000/);
    });
  });

  describe("footer", () => {
    it("emits M30 program-end and % sentinels", () => {
      const out = wedmPostSodickEngine.generate(BASE);
      expect(out.gcode_text.startsWith("%")).toBe(true);
      expect(out.gcode_text.trim().endsWith("%")).toBe(true);
      expect(out.gcode_text).toContain("M30");
    });
  });

  describe("warnings", () => {
    it("warns on > 150mm (AQ/SL max)", () => {
      const out = wedmPostSodickEngine.generate({ ...BASE, thickness_mm: 180 });
      expect(out.warnings.some((w) => w.includes("150mm") || w.includes("AQ/SL"))).toBe(true);
    });

    it("warns on negative thickness", () => {
      const out = wedmPostSodickEngine.generate({ ...BASE, thickness_mm: -1 });
      expect(out.warnings.some((w) => w.toLowerCase().includes("invalid"))).toBe(true);
    });
  });

  describe("parse roundtrip", () => {
    it("recovers pass id from E-code", () => {
      const out = wedmPostSodickEngine.generate({
        ...BASE,
        operations: [
          { type: "profile", pass: "rough" },
          { type: "profile", pass: "skim1" },
          { type: "profile", pass: "skim3" },
        ],
      });
      const parsed = wedmPostSodickEngine.parse(out.gcode_text);
      expect(parsed.operations.map((o) => o.pass)).toEqual(["rough", "skim1", "skim3"]);
    });

    it("recovers offset in mm from printed Hnnn value", () => {
      const out = wedmPostSodickEngine.generate({
        ...BASE,
        operations: [{ ...BASE.operations[0], offset_mm: 0.180 }],
      });
      const parsed = wedmPostSodickEngine.parse(out.gcode_text);
      expect(parsed.operations[0].offset_mm).toBeCloseTo(0.180, 3);
    });

    it("recovers taper angle", () => {
      const out = wedmPostSodickEngine.generate({
        ...BASE,
        operations: [{ type: "taper", pass: "rough", taper_angle_deg: 3.5, start_x: 0, start_y: 0 }],
      });
      const parsed = wedmPostSodickEngine.parse(out.gcode_text);
      expect(parsed.operations[0].taper_angle_deg).toBeCloseTo(3.5, 3);
    });

    it("recovers operation count = input operation count", () => {
      const out = wedmPostSodickEngine.generate({
        ...BASE,
        operations: [
          { type: "profile", pass: "rough" },
          { type: "profile", pass: "skim1" },
          { type: "profile", pass: "skim2" },
          { type: "profile", pass: "skim3" },
        ],
      });
      const parsed = wedmPostSodickEngine.parse(out.gcode_text);
      expect(parsed.operations.length).toBe(4);
    });
  });

  describe("dialect_specific payload", () => {
    it("flags uses_e_codes=true, uses_s_codes=true, uses_c_codes=false", () => {
      const out = wedmPostSodickEngine.generate(BASE);
      expect(out.dialect_specific.uses_e_codes).toBe(true);
      expect(out.dialect_specific.uses_s_codes).toBe(true);
      expect(out.dialect_specific.uses_c_codes).toBe(false);
    });

    it("records the corner-control codes used", () => {
      const out = wedmPostSodickEngine.generate(BASE);
      expect(out.dialect_specific.corner_control).toContain("CC2");
    });
  });
});
