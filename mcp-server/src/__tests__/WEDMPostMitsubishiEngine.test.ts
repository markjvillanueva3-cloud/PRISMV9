/**
 * Tests for WEDMPostMitsubishiEngine — MELDAS/MELCUT FA + MV dialects.
 * MS-P1.5-ONESHOT/U-P1.5-OS-04
 */

import { describe, it, expect } from "vitest";
import { wedmPostMitsubishiEngine } from "../engines/WEDMPostMitsubishiEngine.js";
import type { WEDMController, WEDMPostInput } from "../engines/WEDMPostTypes.js";

const BASE: WEDMPostInput = {
  controller: "mitsubishi_fa",
  program_number: "4501",
  part_description: "PUNCH CAVITY",
  material: "D2",
  thickness_mm: 25.4,
  wire_diameter_mm: 0.25,
  operations: [
    {
      type: "profile",
      pass: "rough",
      start_x: 0, start_y: 0,
      profile_points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 0, y: 0 }],
      auto_thread: true,
      submerged: true,
    },
  ],
  units: "metric",
};

describe("WEDMPostMitsubishiEngine", () => {
  describe("controller support", () => {
    it("supports mitsubishi_fa and mitsubishi_mv only", () => {
      expect(wedmPostMitsubishiEngine.supportedControllers).toEqual(["mitsubishi_fa", "mitsubishi_mv"]);
    });

    it("rejects a non-Mitsubishi controller", () => {
      const out = wedmPostMitsubishiEngine.generate({ ...BASE, controller: "sodick_aq" as WEDMController });
      expect(out.success).toBe(false);
      expect(out.warnings[0]).toContain("does not support");
    });

    it("returns 'Mitsubishi FA' display name for mitsubishi_fa", () => {
      expect(wedmPostMitsubishiEngine.dialectNameFor("mitsubishi_fa")).toBe("Mitsubishi FA");
    });

    it("returns 'Mitsubishi MV' display name for mitsubishi_mv", () => {
      expect(wedmPostMitsubishiEngine.dialectNameFor("mitsubishi_mv")).toBe("Mitsubishi MV");
    });
  });

  describe("E-table (pass → E-code)", () => {
    it("exposes an E-code for every pass id", () => {
      const table = wedmPostMitsubishiEngine.getETable();
      expect(table.rough.e).toBe("E110");
      expect(table.skim1.e).toBe("E120");
      expect(table.skim2.e).toBe("E130");
      expect(table.skim3.e).toBe("E140");
    });

    it("emits E110 on the rough pass block", () => {
      const out = wedmPostMitsubishiEngine.generate(BASE);
      expect(out.gcode_text).toContain("E110");
    });

    it("emits E120 on skim1 blocks", () => {
      const out = wedmPostMitsubishiEngine.generate({
        ...BASE,
        operations: [{ type: "profile", pass: "skim1", start_x: 0, start_y: 0 }],
      });
      expect(out.gcode_text).toContain("E120");
    });
  });

  describe("M-code emission", () => {
    it("emits wire-thread M6 when auto_thread is enabled", () => {
      const out = wedmPostMitsubishiEngine.generate(BASE);
      expect(out.gcode_text).toContain("M6 (AUTO WIRE THREAD)");
    });

    it("emits wire-cut M7 after each op", () => {
      const out = wedmPostMitsubishiEngine.generate(BASE);
      expect(out.gcode_text).toContain("M7 (WIRE CUT)");
    });

    it("emits submerge M28/M29 pair when submerged", () => {
      const out = wedmPostMitsubishiEngine.generate(BASE);
      expect(out.gcode_text).toContain("M28 (SUBMERGE ON)");
      expect(out.gcode_text).toContain("M29 (SUBMERGE OFF)");
    });

    it("skips wire-thread when auto_thread=false", () => {
      const out = wedmPostMitsubishiEngine.generate({
        ...BASE,
        operations: [{ ...BASE.operations[0], auto_thread: false }],
      });
      expect(out.gcode_text).not.toContain("M6 (AUTO WIRE THREAD)");
    });
  });

  describe("offset (G41/G42 with Hnn register)", () => {
    it("defaults to G41 (left) when direction unset", () => {
      const out = wedmPostMitsubishiEngine.generate(BASE);
      expect(out.gcode_text).toMatch(/G41 H01/);
    });

    it("switches to G42 on right offset", () => {
      const out = wedmPostMitsubishiEngine.generate({
        ...BASE,
        operations: [{ ...BASE.operations[0], offset_direction: "right" }],
      });
      expect(out.gcode_text).toMatch(/G42 H01/);
    });

    it("uses sequential H01, H02, H03 registers across ops", () => {
      const out = wedmPostMitsubishiEngine.generate({
        ...BASE,
        operations: [
          { type: "profile", pass: "rough" },
          { type: "profile", pass: "skim1" },
          { type: "profile", pass: "skim2" },
        ],
      });
      expect(out.gcode_text).toContain("H01");
      expect(out.gcode_text).toContain("H02");
      expect(out.gcode_text).toContain("H03");
    });

    it("loads offset value (micrometers) into Hnn register block", () => {
      const out = wedmPostMitsubishiEngine.generate({
        ...BASE,
        operations: [{ ...BASE.operations[0], offset_mm: 0.152 }],
      });
      expect(out.gcode_text).toContain("#01=152");
    });
  });

  describe("taper", () => {
    it("emits G51 A<deg> for taper on + G50 for off", () => {
      const out = wedmPostMitsubishiEngine.generate({
        ...BASE,
        operations: [{ type: "taper", pass: "rough", taper_angle_deg: 2.5, taper_height_mm: 30, start_x: 0, start_y: 0 }],
      });
      expect(out.gcode_text).toContain("G51 A2.500");
      expect(out.gcode_text).toContain("G50");
    });
  });

  describe("coordinates", () => {
    it("uses 3 decimals for metric", () => {
      const out = wedmPostMitsubishiEngine.generate({
        ...BASE,
        operations: [{ type: "profile", pass: "rough", start_x: 12.3456, start_y: 0, profile_points: [{ x: 12.3456, y: 0 }] }],
      });
      expect(out.gcode_text).toMatch(/X12\.346/);
    });

    it("uses 5 decimals for imperial and converts mm→inch", () => {
      const out = wedmPostMitsubishiEngine.generate({
        ...BASE,
        units: "imperial",
        operations: [{ type: "profile", pass: "rough", start_x: 25.4, start_y: 25.4, profile_points: [{ x: 25.4, y: 25.4 }] }],
      });
      expect(out.gcode_text).toMatch(/X1\.00000/);
      expect(out.gcode_text).toContain("G20");
    });
  });

  describe("footer + anti-electrolysis", () => {
    it("emits T84/T85 anti-electrolysis pair + M30 footer", () => {
      const out = wedmPostMitsubishiEngine.generate(BASE);
      expect(out.gcode_text).toContain("T84 (ANTI-ELECTROLYSIS ON)");
      expect(out.gcode_text).toContain("T85 (ANTI-ELECTROLYSIS OFF)");
      expect(out.gcode_text.trim().endsWith("%")).toBe(true);
      expect(out.gcode_text).toContain("M30");
    });
  });

  describe("warnings", () => {
    it("warns on thickness > 100mm", () => {
      const out = wedmPostMitsubishiEngine.generate({ ...BASE, thickness_mm: 120 });
      expect(out.warnings.some((w) => w.includes("100mm"))).toBe(true);
    });

    it("warns on invalid thickness", () => {
      const out = wedmPostMitsubishiEngine.generate({ ...BASE, thickness_mm: -5 });
      expect(out.warnings.some((w) => w.toLowerCase().includes("invalid"))).toBe(true);
    });

    it("warns when an op has no profile_points", () => {
      const out = wedmPostMitsubishiEngine.generate({
        ...BASE,
        operations: [{ type: "profile", pass: "rough" }],
      });
      expect(out.warnings.some((w) => w.includes("no profile_points"))).toBe(true);
    });
  });

  describe("parse roundtrip", () => {
    it("recovers the program number", () => {
      const out = wedmPostMitsubishiEngine.generate(BASE);
      const parsed = wedmPostMitsubishiEngine.parse(out.gcode_text);
      expect(parsed.program_number).toBe("4501");
    });

    it("recovers offset direction per op", () => {
      const out = wedmPostMitsubishiEngine.generate({
        ...BASE,
        operations: [
          { type: "profile", pass: "rough",  offset_direction: "right", start_x: 0, start_y: 0, profile_points: [{ x: 1, y: 1 }] },
          { type: "profile", pass: "skim1",  offset_direction: "left",  start_x: 0, start_y: 0, profile_points: [{ x: 1, y: 1 }] },
        ],
      });
      const parsed = wedmPostMitsubishiEngine.parse(out.gcode_text);
      expect(parsed.operations[0].offset_direction).toBe("right");
      expect(parsed.operations[1].offset_direction).toBe("left");
    });

    it("recovers point-count per op", () => {
      const out = wedmPostMitsubishiEngine.generate(BASE);
      const parsed = wedmPostMitsubishiEngine.parse(out.gcode_text);
      // 5 profile_points in BASE's op.
      expect(parsed.operations[0].point_count).toBe(5);
    });

    it("recovers offset_mm with mm precision", () => {
      const out = wedmPostMitsubishiEngine.generate({
        ...BASE,
        operations: [{ ...BASE.operations[0], offset_mm: 0.215 }],
      });
      const parsed = wedmPostMitsubishiEngine.parse(out.gcode_text);
      expect(parsed.operations[0].offset_mm).toBeCloseTo(0.215, 3);
    });

    it("recovers submerged flag", () => {
      const out = wedmPostMitsubishiEngine.generate(BASE);
      const parsed = wedmPostMitsubishiEngine.parse(out.gcode_text);
      expect(parsed.operations[0].submerged).toBe(true);
    });
  });

  describe("dialect_specific payload", () => {
    it("declares uses_e_codes=true and manufacturer=Mitsubishi Electric", () => {
      const out = wedmPostMitsubishiEngine.generate(BASE);
      expect(out.dialect_specific.manufacturer).toBe("Mitsubishi Electric");
      expect(out.dialect_specific.uses_e_codes).toBe(true);
      expect(out.dialect_specific.uses_c_codes).toBe(false);
      expect(out.dialect_specific.wire_thread_code).toBe("M6");
      expect(out.dialect_specific.wire_cut_code).toBe("M7");
    });

    it("lists all emitted E-codes across 3 passes", () => {
      const out = wedmPostMitsubishiEngine.generate({
        ...BASE,
        operations: [
          { type: "profile", pass: "rough" },
          { type: "profile", pass: "skim1" },
          { type: "profile", pass: "skim2" },
        ],
      });
      expect(out.dialect_specific.e_codes_used).toEqual(["E110", "E120", "E130"]);
    });
  });
});
