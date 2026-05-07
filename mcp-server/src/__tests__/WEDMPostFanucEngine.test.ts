/**
 * Tests for WEDMPostFanucEngine — ROBOCUT α-CiA/CiB dialect.
 * MS-P1.5-ONESHOT/U-P1.5-OS-04
 */

import { describe, it, expect } from "vitest";
import { wedmPostFanucEngine } from "../engines/WEDMPostFanucEngine.js";
import type { WEDMController, WEDMPostInput } from "../engines/WEDMPostTypes.js";

const BASE: WEDMPostInput = {
  controller: "fanuc_robocut",
  program_number: "1205",
  part_description: "COOLANT JET HOUSING",
  material: "Tungsten Carbide",
  thickness_mm: 22,
  wire_diameter_mm: 0.25,
  operations: [
    {
      type: "profile",
      pass: "rough",
      start_x: 0, start_y: 0,
      profile_points: [{ x: 0, y: 0 }, { x: 15, y: 0 }, { x: 15, y: 15 }, { x: 0, y: 15 }, { x: 0, y: 0 }],
      auto_thread: true,
      submerged: true,
    },
  ],
  units: "metric",
};

describe("WEDMPostFanucEngine", () => {
  describe("controller support", () => {
    it("supports fanuc_robocut only", () => {
      expect(wedmPostFanucEngine.supportedControllers).toEqual(["fanuc_robocut"]);
    });

    it("rejects any non-Fanuc controller", () => {
      const out = wedmPostFanucEngine.generate({ ...BASE, controller: "mitsubishi_fa" as WEDMController });
      expect(out.success).toBe(false);
    });

    it("returns 'Fanuc ROBOCUT' display name", () => {
      expect(wedmPostFanucEngine.dialectNameFor("fanuc_robocut")).toBe("Fanuc ROBOCUT");
    });
  });

  describe("condition labels", () => {
    it("exposes a COND= label per pass (readability-only)", () => {
      const labels = wedmPostFanucEngine.getConditionLabels();
      expect(labels.rough).toContain("ROUGH");
      expect(labels.skim1).toContain("SKIM1");
      expect(labels.skim2).toContain("SKIM2");
      expect(labels.skim3).toContain("SKIM3");
    });
  });

  describe("Macro-variable condition loading", () => {
    it("writes #501 (power) from power_setting or pass default", () => {
      const out = wedmPostFanucEngine.generate({
        ...BASE,
        operations: [{ ...BASE.operations[0], power_setting: 15 }],
      });
      expect(out.gcode_text).toContain("#501=15");
    });

    it("writes #502/#503 on/off-time from op parameters", () => {
      const out = wedmPostFanucEngine.generate({
        ...BASE,
        operations: [{ ...BASE.operations[0], on_time_us: 6, off_time_us: 18 }],
      });
      expect(out.gcode_text).toContain("#502=6");
      expect(out.gcode_text).toContain("#503=18");
    });

    it("writes #506 offset in micrometers (0.215mm → 215)", () => {
      const out = wedmPostFanucEngine.generate({
        ...BASE,
        operations: [{ ...BASE.operations[0], offset_mm: 0.215 }],
      });
      expect(out.gcode_text).toContain("#506=215");
    });

    it("calls G65 P9010 to apply condition subprogram", () => {
      const out = wedmPostFanucEngine.generate(BASE);
      expect(out.gcode_text).toContain("G65 P9010");
    });
  });

  describe("M-code emission", () => {
    it("uses M60 wire thread + M61 wire cut", () => {
      const out = wedmPostFanucEngine.generate(BASE);
      expect(out.gcode_text).toContain("M60 (AUTO WIRE THREAD)");
      expect(out.gcode_text).toContain("M61 (WIRE CUT)");
    });

    it("uses M50/M51 submerge pair (Fanuc numbering)", () => {
      const out = wedmPostFanucEngine.generate(BASE);
      expect(out.gcode_text).toContain("M50 (SUBMERGE ON)");
      expect(out.gcode_text).toContain("M51 (SUBMERGE OFF)");
    });

    it("emits M30 program-end", () => {
      const out = wedmPostFanucEngine.generate(BASE);
      expect(out.gcode_text).toContain("M30");
    });
  });

  describe("offset (G41/G42 with Dnn)", () => {
    it("emits G41 Dnn by default (left offset)", () => {
      const out = wedmPostFanucEngine.generate(BASE);
      expect(out.gcode_text).toMatch(/G41 D01/);
    });

    it("switches to G42 on right offset", () => {
      const out = wedmPostFanucEngine.generate({
        ...BASE,
        operations: [{ ...BASE.operations[0], offset_direction: "right" }],
      });
      expect(out.gcode_text).toMatch(/G42 D01/);
    });
  });

  describe("taper (G51.1 / G50.1 — Fanuc decimal variant)", () => {
    it("uses G51.1 X<deg> not G51 A<deg>", () => {
      const out = wedmPostFanucEngine.generate({
        ...BASE,
        operations: [{ type: "taper", pass: "rough", taper_angle_deg: 4.5, start_x: 0, start_y: 0 }],
      });
      expect(out.gcode_text).toContain("G51.1 X4.500");
      expect(out.gcode_text).not.toContain("G51 A");
    });

    it("uses G50.1 to cancel taper", () => {
      const out = wedmPostFanucEngine.generate({
        ...BASE,
        operations: [{ type: "taper", pass: "rough", taper_angle_deg: 2, start_x: 0, start_y: 0 }],
      });
      expect(out.gcode_text).toContain("G50.1");
    });
  });

  describe("coordinate precision", () => {
    it("metric uses 3 decimals", () => {
      const out = wedmPostFanucEngine.generate({
        ...BASE,
        operations: [{ type: "profile", pass: "rough", start_x: 12.3456, start_y: 0, profile_points: [{ x: 12.3456, y: 0 }] }],
      });
      expect(out.gcode_text).toMatch(/X12\.346/);
    });

    it("imperial (G20) converts 25.4mm → 1.00000in", () => {
      const out = wedmPostFanucEngine.generate({
        ...BASE,
        units: "imperial",
        operations: [{ type: "profile", pass: "rough", start_x: 25.4, start_y: 0, profile_points: [{ x: 25.4, y: 0 }] }],
      });
      expect(out.gcode_text).toContain("G20");
      expect(out.gcode_text).toMatch(/X1\.00000/);
    });
  });

  describe("warnings", () => {
    it("warns on > 300mm thickness (α-C600iB Z-travel)", () => {
      const out = wedmPostFanucEngine.generate({ ...BASE, thickness_mm: 320 });
      expect(out.warnings.some((w) => w.includes("300mm") || w.includes("α-C600iB"))).toBe(true);
    });

    it("warns on NaN thickness", () => {
      const out = wedmPostFanucEngine.generate({ ...BASE, thickness_mm: NaN });
      expect(out.warnings.some((w) => w.toLowerCase().includes("invalid"))).toBe(true);
    });

    it("warns when pass has no profile_points", () => {
      const out = wedmPostFanucEngine.generate({
        ...BASE,
        operations: [{ type: "profile", pass: "rough" }],
      });
      expect(out.warnings.some((w) => w.includes("no profile_points"))).toBe(true);
    });
  });

  describe("parse roundtrip", () => {
    it("recovers pass id from COND= label", () => {
      const out = wedmPostFanucEngine.generate({
        ...BASE,
        operations: [{ type: "profile", pass: "skim2" }],
      });
      const parsed = wedmPostFanucEngine.parse(out.gcode_text);
      expect(parsed.operations[0].pass).toBe("skim2");
    });

    it("recovers power, on-time, off-time from #501/#502/#503", () => {
      const out = wedmPostFanucEngine.generate({
        ...BASE,
        operations: [{ ...BASE.operations[0], power_setting: 10, on_time_us: 7, off_time_us: 22 }],
      });
      const parsed = wedmPostFanucEngine.parse(out.gcode_text);
      expect(parsed.operations[0].power).toBe(10);
      expect(parsed.operations[0].on_us).toBe(7);
      expect(parsed.operations[0].off_us).toBe(22);
    });

    it("recovers offset_mm from #506 µm variable", () => {
      const out = wedmPostFanucEngine.generate({
        ...BASE,
        operations: [{ ...BASE.operations[0], offset_mm: 0.180 }],
      });
      const parsed = wedmPostFanucEngine.parse(out.gcode_text);
      expect(parsed.operations[0].offset_mm).toBeCloseTo(0.180, 3);
    });

    it("recovers Fanuc taper angle from G51.1 X", () => {
      const out = wedmPostFanucEngine.generate({
        ...BASE,
        operations: [{ type: "taper", pass: "rough", taper_angle_deg: 6.125, start_x: 0, start_y: 0 }],
      });
      const parsed = wedmPostFanucEngine.parse(out.gcode_text);
      expect(parsed.operations[0].taper_angle_deg).toBeCloseTo(6.125, 3);
    });
  });

  describe("dialect_specific payload", () => {
    it("flags uses_macro_vars=true, uses_e_codes=false, uses_c_codes=false", () => {
      const out = wedmPostFanucEngine.generate(BASE);
      expect(out.dialect_specific.uses_macro_vars).toBe(true);
      expect(out.dialect_specific.uses_e_codes).toBe(false);
      expect(out.dialect_specific.uses_c_codes).toBe(false);
    });

    it("names the condition subprogram O9010", () => {
      const out = wedmPostFanucEngine.generate(BASE);
      expect(out.dialect_specific.condition_subprogram).toBe("O9010");
    });
  });
});
