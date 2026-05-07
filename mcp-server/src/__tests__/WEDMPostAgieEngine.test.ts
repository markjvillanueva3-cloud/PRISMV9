/**
 * Tests for WEDMPostAgieEngine — AgieCharmilles CUT / Charm dialect.
 * MS-P1.5-ONESHOT/U-P1.5-OS-04
 */

import { describe, it, expect } from "vitest";
import { wedmPostAgieEngine } from "../engines/WEDMPostAgieEngine.js";
import type { WEDMController, WEDMPostInput } from "../engines/WEDMPostTypes.js";

const BASE: WEDMPostInput = {
  controller: "agie_cut",
  program_number: "2201",
  part_description: "STAMP DIE INSERT",
  material: "D2",
  thickness_mm: 28,
  wire_diameter_mm: 0.25,
  operations: [
    {
      type: "profile",
      pass: "rough",
      start_x: 0, start_y: 0,
      profile_points: [{ x: 0, y: 0 }, { x: 12, y: 0 }, { x: 12, y: 12 }, { x: 0, y: 12 }, { x: 0, y: 0 }],
      auto_thread: true,
      submerged: true,
    },
  ],
  units: "metric",
};

describe("WEDMPostAgieEngine", () => {
  describe("controller support", () => {
    it("supports agie_cut and agie_charm only", () => {
      expect(wedmPostAgieEngine.supportedControllers).toEqual(["agie_cut", "agie_charm"]);
    });

    it("rejects a non-Agie controller", () => {
      const out = wedmPostAgieEngine.generate({ ...BASE, controller: "fanuc_robocut" as WEDMController });
      expect(out.success).toBe(false);
    });

    it("returns 'AgieCharmilles CUT' and 'AgieCharmilles Charm' display names", () => {
      expect(wedmPostAgieEngine.dialectNameFor("agie_cut")).toBe("AgieCharmilles CUT");
      expect(wedmPostAgieEngine.dialectNameFor("agie_charm")).toBe("AgieCharmilles Charm");
    });
  });

  describe("GF program frame (%PM header, M17 footer)", () => {
    it("starts with %PM (not plain %)", () => {
      const out = wedmPostAgieEngine.generate(BASE);
      expect(out.gcode_text.startsWith("%PM")).toBe(true);
    });

    it("ends with M17 (end + rewind)", () => {
      const out = wedmPostAgieEngine.generate(BASE);
      expect(out.gcode_text).toContain("M17");
      expect(out.gcode_text).not.toContain("M30");
      expect(out.gcode_text).not.toContain("M02");
    });

    it("uses G70/G71 (DIN) unit codes, not ISO G20/G21", () => {
      const metric = wedmPostAgieEngine.generate(BASE);
      const imperial = wedmPostAgieEngine.generate({ ...BASE, units: "imperial" });
      expect(metric.gcode_text).toContain("G71");
      expect(imperial.gcode_text).toContain("G70");
    });
  });

  describe("TEC tech table + pulse codes", () => {
    it("exposes 4 distinct TEC codes", () => {
      const t = wedmPostAgieEngine.getTecTable();
      expect(t.rough.tec).toBe("TEC 0255");
      expect(t.skim1.tec).toBe("TEC 0270");
      expect(t.skim2.tec).toBe("TEC 0285");
      expect(t.skim3.tec).toBe("TEC 0295");
    });

    it("pairs TEC with P-pulse descriptor", () => {
      const t = wedmPostAgieEngine.getTecTable();
      expect(t.rough.pulse).toBe("P12");
      expect(t.skim3.pulse).toBe("P01");
    });

    it("emits TEC NNNN + Pnn on the rough block", () => {
      const out = wedmPostAgieEngine.generate(BASE);
      expect(out.gcode_text).toContain("TEC 0255 P12");
    });
  });

  describe("M-code emission", () => {
    it("uses M20/M21 AWT codes (distinct from Sodick's M50/M51)", () => {
      const out = wedmPostAgieEngine.generate(BASE);
      expect(out.gcode_text).toContain("M20 (AWT AUTO WIRE THREAD)");
      expect(out.gcode_text).toContain("M21 (AWT CUT)");
    });

    it("uses M24/M25 submerge pair", () => {
      const out = wedmPostAgieEngine.generate(BASE);
      expect(out.gcode_text).toContain("M24 (SUBMERGE ON)");
      expect(out.gcode_text).toContain("M25 (SUBMERGE OFF)");
    });
  });

  describe("offset (.O contour attribute)", () => {
    it("emits '.O = <um>' GF contour attribute form", () => {
      const out = wedmPostAgieEngine.generate({
        ...BASE,
        operations: [{ ...BASE.operations[0], offset_mm: 0.152 }],
      });
      expect(out.gcode_text).toMatch(/\.O = 152/);
    });

    it("G41/G42 emitted without Dnn register (Agie uses .O attribute)", () => {
      const out = wedmPostAgieEngine.generate(BASE);
      expect(out.gcode_text).toMatch(/G41 \(COMP ON/);
    });
  });

  describe("taper (G08/G09 — GF-specific)", () => {
    it("uses G08 A<deg> for taper on (not ISO G51)", () => {
      const out = wedmPostAgieEngine.generate({
        ...BASE,
        operations: [{ type: "taper", pass: "rough", taper_angle_deg: 3.5, start_x: 0, start_y: 0 }],
      });
      expect(out.gcode_text).toContain("G08 A3.500");
      expect(out.gcode_text).not.toContain("G51 A");
    });

    it("uses G09 to cancel taper", () => {
      const out = wedmPostAgieEngine.generate({
        ...BASE,
        operations: [{ type: "taper", pass: "rough", taper_angle_deg: 2, start_x: 0, start_y: 0 }],
      });
      expect(out.gcode_text).toContain("G09");
    });
  });

  describe("corner control (CIRU / CORO)", () => {
    it("emits CIRU 2 on rough pass", () => {
      const out = wedmPostAgieEngine.generate(BASE);
      expect(out.gcode_text).toContain("CIRU 2");
    });

    it("emits CORO 1 on skim passes", () => {
      const out = wedmPostAgieEngine.generate({
        ...BASE,
        operations: [{ type: "profile", pass: "skim2", start_x: 0, start_y: 0, profile_points: [{ x: 1, y: 1 }] }],
      });
      expect(out.gcode_text).toContain("CORO 1");
    });
  });

  describe("warnings", () => {
    it("warns on > 400mm (CUT P 800 Z-travel)", () => {
      const out = wedmPostAgieEngine.generate({ ...BASE, thickness_mm: 450 });
      expect(out.warnings.some((w) => w.includes("400mm") || w.includes("CUT P 800"))).toBe(true);
    });

    it("warns on invalid thickness (NaN)", () => {
      const out = wedmPostAgieEngine.generate({ ...BASE, thickness_mm: NaN });
      expect(out.warnings.some((w) => w.toLowerCase().includes("invalid"))).toBe(true);
    });
  });

  describe("parse roundtrip", () => {
    it("recovers pass id from TEC code", () => {
      const out = wedmPostAgieEngine.generate({
        ...BASE,
        operations: [
          { type: "profile", pass: "rough" },
          { type: "profile", pass: "skim3" },
        ],
      });
      const parsed = wedmPostAgieEngine.parse(out.gcode_text);
      expect(parsed.operations.map((o) => o.pass)).toEqual(["rough", "skim3"]);
    });

    it("recovers offset_mm from '.O = <um>' block", () => {
      const out = wedmPostAgieEngine.generate({
        ...BASE,
        operations: [{ ...BASE.operations[0], offset_mm: 0.195 }],
      });
      const parsed = wedmPostAgieEngine.parse(out.gcode_text);
      expect(parsed.operations[0].offset_mm).toBeCloseTo(0.195, 3);
    });

    it("recovers Agie-specific taper angle from G08", () => {
      const out = wedmPostAgieEngine.generate({
        ...BASE,
        operations: [{ type: "taper", pass: "rough", taper_angle_deg: 9.125, start_x: 0, start_y: 0 }],
      });
      const parsed = wedmPostAgieEngine.parse(out.gcode_text);
      expect(parsed.operations[0].taper_angle_deg).toBeCloseTo(9.125, 3);
    });

    it("recovers point count", () => {
      const out = wedmPostAgieEngine.generate(BASE);
      const parsed = wedmPostAgieEngine.parse(out.gcode_text);
      expect(parsed.operations[0].point_count).toBe(5);
    });
  });

  describe("dialect_specific payload", () => {
    it("flags uses_e_codes=false, uses_c_codes=true, uses_tec_codes=true", () => {
      const out = wedmPostAgieEngine.generate(BASE);
      expect(out.dialect_specific.uses_e_codes).toBe(false);
      expect(out.dialect_specific.uses_c_codes).toBe(true);
      expect(out.dialect_specific.uses_tec_codes).toBe(true);
    });

    it("lists TEC codes used in dialect_specific.tec_codes_used", () => {
      const out = wedmPostAgieEngine.generate({
        ...BASE,
        operations: [
          { type: "profile", pass: "rough" },
          { type: "profile", pass: "skim2" },
        ],
      });
      expect(out.dialect_specific.tec_codes_used).toEqual(["TEC 0255", "TEC 0285"]);
    });

    it("names program frame as 'PM / M17'", () => {
      const out = wedmPostAgieEngine.generate(BASE);
      expect(out.dialect_specific.program_frame).toBe("PM / M17");
    });
  });
});
