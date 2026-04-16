/**
 * PPWireEDMPostEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPWireEDMPostEngine,
  ppWireEDMPostEngine,
} from "../engines/PPWireEDMPostEngine.js";

describe("PPWireEDMPostEngine", () => {
  it("exports singleton", () => {
    expect(ppWireEDMPostEngine).toBeInstanceOf(PPWireEDMPostEngine);
  });

  describe("generate — basic profile", () => {
    it("produces valid program", () => {
      const r = ppWireEDMPostEngine.generate({
        thickness_mm: 25,
        material: "D2",
        wire_diameter_mm: 0.25,
        operations: [{ type: "profile", pass: "rough", submerged: true }],
      });
      expect(r.gcode_text.length).toBeGreaterThan(100);
      expect(r.line_count).toBeGreaterThan(10);
    });

    it("contains % wrapper", () => {
      const r = ppWireEDMPostEngine.generate({
        thickness_mm: 25,
        operations: [{ type: "profile", pass: "rough" }],
      });
      expect(r.gcode_lines[0]).toBe("%");
      expect(r.gcode_lines[r.gcode_lines.length - 1]).toBe("%");
    });

    it("contains G90 G21 setup", () => {
      const r = ppWireEDMPostEngine.generate({
        thickness_mm: 25,
        operations: [{ type: "profile", pass: "rough" }],
      });
      expect(r.gcode_text).toContain("G90");
      expect(r.gcode_text).toContain("G21");
    });

    it("contains auto wire thread M6", () => {
      const r = ppWireEDMPostEngine.generate({
        thickness_mm: 25,
        operations: [{ type: "profile", pass: "rough", auto_thread: true }],
      });
      expect(r.gcode_text).toContain("M6");
    });

    it("contains submerged mode M28/M29", () => {
      const r = ppWireEDMPostEngine.generate({
        thickness_mm: 25,
        operations: [{ type: "profile", pass: "rough", submerged: true }],
      });
      expect(r.gcode_text).toContain("M28");
      expect(r.gcode_text).toContain("M29");
    });

    it("contains wire offset G41/G42", () => {
      const r = ppWireEDMPostEngine.generate({
        thickness_mm: 25,
        operations: [{ type: "profile", pass: "rough", offset_direction: "left" }],
      });
      expect(r.gcode_text).toContain("G41");
    });

    it("contains wire cut M7", () => {
      const r = ppWireEDMPostEngine.generate({
        thickness_mm: 25,
        operations: [{ type: "profile", pass: "rough" }],
      });
      expect(r.gcode_text).toContain("M7");
    });

    it("contains program end M2", () => {
      const r = ppWireEDMPostEngine.generate({
        thickness_mm: 25,
        operations: [{ type: "profile", pass: "rough" }],
      });
      expect(r.gcode_text).toContain("M2");
    });

    it("contains EDM condition comments", () => {
      const r = ppWireEDMPostEngine.generate({
        thickness_mm: 25,
        operations: [{ type: "profile", pass: "rough" }],
      });
      expect(r.gcode_text).toContain("POWER=");
      expect(r.gcode_text).toContain("WIRE:");
    });
  });

  describe("generate — taper cutting", () => {
    it("includes G51 taper on", () => {
      const r = ppWireEDMPostEngine.generate({
        thickness_mm: 25,
        operations: [{
          type: "taper", pass: "rough",
          taper_angle_deg: 3, taper_height_mm: 25,
        }],
      });
      expect(r.gcode_text).toContain("G51");
      expect(r.gcode_text).toContain("G50"); // taper off
    });
  });

  describe("generate — multi-pass", () => {
    it("handles 4 passes", () => {
      const r = ppWireEDMPostEngine.generate({
        thickness_mm: 25,
        operations: [
          { type: "profile", pass: "rough" },
          { type: "profile", pass: "skim1" },
          { type: "profile", pass: "skim2" },
          { type: "profile", pass: "skim3" },
        ],
      });
      expect(r.total_passes).toBe(4);
      expect(r.operation_count).toBe(4);
    });

    it("skim passes use lower power", () => {
      const r = ppWireEDMPostEngine.generate({
        thickness_mm: 25,
        operations: [
          { type: "profile", pass: "rough" },
          { type: "profile", pass: "skim3" },
        ],
      });
      // Skim3 should have POWER=1 while rough has POWER=12
      expect(r.gcode_text).toContain("POWER=12");
      expect(r.gcode_text).toContain("POWER=1 ");
    });
  });

  describe("generateStandard4Pass", () => {
    it("produces 4-pass program", () => {
      const r = ppWireEDMPostEngine.generateStandard4Pass(30, "D2");
      expect(r.total_passes).toBe(4);
    });

    it("includes material in header", () => {
      const r = ppWireEDMPostEngine.generateStandard4Pass(30, "M2");
      expect(r.gcode_text).toContain("M2");
    });

    it("includes thickness in header", () => {
      const r = ppWireEDMPostEngine.generateStandard4Pass(45);
      expect(r.gcode_text).toContain("45mm");
    });
  });

  describe("generate — with profile points", () => {
    it("outputs G1 moves for profile geometry", () => {
      const r = ppWireEDMPostEngine.generate({
        thickness_mm: 25,
        operations: [{
          type: "profile", pass: "rough",
          start_x: 0, start_y: 0,
          profile_points: [
            { x: 10, y: 0 },
            { x: 10, y: 20 },
            { x: 0, y: 20 },
            { x: 0, y: 0 },
          ],
        }],
      });
      expect(r.gcode_text).toContain("G1 X10.000 Y0.000");
      expect(r.gcode_text).toContain("G1 X10.000 Y20.000");
    });

    it("outputs UV axes for taper points", () => {
      const r = ppWireEDMPostEngine.generate({
        thickness_mm: 25,
        operations: [{
          type: "taper", pass: "rough",
          taper_angle_deg: 2,
          profile_points: [{ x: 10, y: 0, u: 10.5, v: 0 }],
        }],
      });
      expect(r.gcode_text).toContain("U10.500");
    });
  });

  describe("warnings", () => {
    it("warns on thick workpiece", () => {
      const r = ppWireEDMPostEngine.generate({
        thickness_mm: 150,
        operations: [{ type: "profile", pass: "rough" }],
      });
      expect(r.warnings.some(w => w.includes("150mm"))).toBe(true);
    });
  });

  describe("getWireOffset", () => {
    it("returns offset for 0.25mm wire rough", () => {
      expect(ppWireEDMPostEngine.getWireOffset(0.25, "rough")).toBe(0.160);
    });

    it("skim passes have smaller offset", () => {
      const rough = ppWireEDMPostEngine.getWireOffset(0.25, "rough");
      const skim3 = ppWireEDMPostEngine.getWireOffset(0.25, "skim3");
      expect(skim3).toBeLessThan(rough);
    });

    it("thinner wire has smaller offset", () => {
      const thick = ppWireEDMPostEngine.getWireOffset(0.25, "rough");
      const thin = ppWireEDMPostEngine.getWireOffset(0.10, "rough");
      expect(thin).toBeLessThan(thick);
    });
  });

  describe("getPassDefaults", () => {
    it("rough has highest power", () => {
      const rough = ppWireEDMPostEngine.getPassDefaults("rough");
      const skim3 = ppWireEDMPostEngine.getPassDefaults("skim3");
      expect(rough.power).toBeGreaterThan(skim3.power);
    });

    it("rough has highest wire tension", () => {
      const rough = ppWireEDMPostEngine.getPassDefaults("rough");
      const skim3 = ppWireEDMPostEngine.getPassDefaults("skim3");
      expect(rough.wire_tension).toBeGreaterThan(skim3.wire_tension);
    });
  });

  describe("listWireDiameters", () => {
    it("returns standard wire sizes", () => {
      const sizes = ppWireEDMPostEngine.listWireDiameters();
      expect(sizes).toContain(0.25);
      expect(sizes).toContain(0.20);
      expect(sizes).toContain(0.10);
    });
  });
});
