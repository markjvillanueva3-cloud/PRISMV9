/**
 * PPSinkerEDMPostEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPSinkerEDMPostEngine,
  ppSinkerEDMPostEngine,
} from "../engines/PPSinkerEDMPostEngine.js";

describe("PPSinkerEDMPostEngine", () => {
  it("exports singleton", () => {
    expect(ppSinkerEDMPostEngine).toBeInstanceOf(PPSinkerEDMPostEngine);
  });

  describe("generate — basic rough burn", () => {
    it("produces valid program", () => {
      const r = ppSinkerEDMPostEngine.generate({
        machine_model: "EA12V",
        material: "H13",
        operations: [{
          stage: "rough", electrode_number: 1,
          target_depth_mm: 10,
          orbit_pattern: "circle", orbit_radius_mm: 0.3,
        }],
      });
      expect(r.gcode_text.length).toBeGreaterThan(100);
      expect(r.line_count).toBeGreaterThan(10);
      expect(r.operation_count).toBe(1);
    });

    it("wraps with % markers", () => {
      const r = ppSinkerEDMPostEngine.generate({
        operations: [{ stage: "rough", target_depth_mm: 5 }],
      });
      expect(r.gcode_lines[0]).toBe("%");
      expect(r.gcode_lines[r.gcode_lines.length - 1]).toBe("%");
    });

    it("contains G90 G21 G54 setup", () => {
      const r = ppSinkerEDMPostEngine.generate({
        operations: [{ stage: "rough", target_depth_mm: 5 }],
      });
      expect(r.gcode_text).toContain("G90");
      expect(r.gcode_text).toContain("G21");
      expect(r.gcode_text).toContain("G54");
    });

    it("contains dielectric fill M80", () => {
      const r = ppSinkerEDMPostEngine.generate({
        operations: [{ stage: "rough", target_depth_mm: 5 }],
      });
      expect(r.gcode_text).toContain("M80");
    });

    it("contains dielectric drain M81", () => {
      const r = ppSinkerEDMPostEngine.generate({
        operations: [{ stage: "rough", target_depth_mm: 5 }],
      });
      expect(r.gcode_text).toContain("M81");
    });

    it("contains program end M30", () => {
      const r = ppSinkerEDMPostEngine.generate({
        operations: [{ stage: "rough", target_depth_mm: 5 }],
      });
      expect(r.gcode_text).toContain("M30");
    });

    it("contains E-pack condition code", () => {
      const r = ppSinkerEDMPostEngine.generate({
        operations: [{ stage: "rough", target_depth_mm: 5 }],
      });
      // Rough stage -> C100
      expect(r.gcode_text).toContain("C100");
    });

    it("contains pulse parameters IP, ON, OF, SV", () => {
      const r = ppSinkerEDMPostEngine.generate({
        operations: [{ stage: "rough", target_depth_mm: 5 }],
      });
      expect(r.gcode_text).toContain("IP");
      expect(r.gcode_text).toContain("ON");
      expect(r.gcode_text).toContain("OF");
      expect(r.gcode_text).toContain("SV");
    });
  });

  describe("generate — servo plunge", () => {
    it("uses G81 for continuous servo plunge", () => {
      const r = ppSinkerEDMPostEngine.generate({
        operations: [{
          stage: "rough", target_depth_mm: 10,
          flush_cycle_sec: 0, // continuous
        }],
      });
      expect(r.gcode_text).toContain("G81");
    });

    it("uses G83 for peck burn with flush cycle", () => {
      const r = ppSinkerEDMPostEngine.generate({
        operations: [{
          stage: "rough", target_depth_mm: 10,
          flush_cycle_sec: 5, retract_depth_mm: 2,
        }],
      });
      expect(r.gcode_text).toContain("G83");
    });

    it("computes final Z including over-burn", () => {
      const r = ppSinkerEDMPostEngine.generate({
        operations: [{
          stage: "rough", target_depth_mm: 10,
          start_z: 5, over_burn_mm: 0.5,
        }],
      });
      // start_z(5) - target(10) - overburn(0.5) = -5.5
      expect(r.gcode_text).toContain("Z-5.500");
    });
  });

  describe("generate — orbit patterns", () => {
    it("circle orbit uses G41.1", () => {
      const r = ppSinkerEDMPostEngine.generate({
        operations: [{
          stage: "rough", target_depth_mm: 10,
          orbit_pattern: "circle", orbit_radius_mm: 0.3,
        }],
      });
      expect(r.gcode_text).toContain("G41.1");
      expect(r.gcode_text).toContain("G40.1"); // orbit cancel
    });

    it("square orbit uses G41.2", () => {
      const r = ppSinkerEDMPostEngine.generate({
        operations: [{
          stage: "rough", target_depth_mm: 10,
          orbit_pattern: "square", orbit_radius_mm: 0.3,
        }],
      });
      expect(r.gcode_text).toContain("G41.2");
    });

    it("star orbit uses G41.4", () => {
      const r = ppSinkerEDMPostEngine.generate({
        operations: [{
          stage: "rough", target_depth_mm: 10,
          orbit_pattern: "star", orbit_radius_mm: 0.3,
        }],
      });
      expect(r.gcode_text).toContain("G41.4");
    });

    it("no orbit omits orbit codes", () => {
      const r = ppSinkerEDMPostEngine.generate({
        operations: [{ stage: "rough", target_depth_mm: 10, orbit_pattern: "none" }],
      });
      expect(r.gcode_text).not.toContain("G41.1");
      expect(r.gcode_text).not.toContain("G40.1");
    });

    it("emits G03 for orbit revolutions", () => {
      const r = ppSinkerEDMPostEngine.generate({
        operations: [{
          stage: "rough", target_depth_mm: 10,
          orbit_pattern: "circle", orbit_radius_mm: 0.2,
          orbit_revolutions: 3,
        }],
      });
      const g03Count = (r.gcode_text.match(/G03/g) || []).length;
      expect(g03Count).toBe(3);
    });
  });

  describe("generate — polarity", () => {
    it("negative polarity uses M41", () => {
      const r = ppSinkerEDMPostEngine.generate({
        operations: [{ stage: "rough", target_depth_mm: 5, polarity: "negative" }],
      });
      expect(r.gcode_text).toContain("M41");
    });

    it("positive polarity uses M40", () => {
      const r = ppSinkerEDMPostEngine.generate({
        operations: [{ stage: "rough", target_depth_mm: 5, polarity: "positive" }],
      });
      expect(r.gcode_text).toContain("M40");
    });
  });

  describe("generate — multi-electrode", () => {
    it("handles rough + finish electrodes", () => {
      const r = ppSinkerEDMPostEngine.generate({
        operations: [
          { stage: "rough", electrode_number: 1, target_depth_mm: 9.8 },
          { stage: "finish", electrode_number: 2, target_depth_mm: 10 },
        ],
      });
      expect(r.electrode_count).toBe(2);
      expect(r.gcode_text).toContain("T01 M6");
      expect(r.gcode_text).toContain("T02 M6");
    });

    it("inserts M0 stop for electrode change", () => {
      const r = ppSinkerEDMPostEngine.generate({
        operations: [
          { stage: "rough", electrode_number: 1, target_depth_mm: 9.8 },
          { stage: "finish", electrode_number: 2, target_depth_mm: 10 },
        ],
      });
      expect(r.gcode_text).toContain("M0");
    });

    it("reuses same electrode without M0 extra", () => {
      const r = ppSinkerEDMPostEngine.generate({
        operations: [
          { stage: "rough", electrode_number: 1, target_depth_mm: 8 },
          { stage: "semi_finish", electrode_number: 1, target_depth_mm: 9.5 },
        ],
      });
      const m0Count = (r.gcode_text.match(/M0 /g) || []).length;
      // Only one electrode change (the initial one)
      expect(m0Count).toBe(1);
    });
  });

  describe("generate — flushing", () => {
    it("enables suction with M48/M49", () => {
      const r = ppSinkerEDMPostEngine.generate({
        operations: [{
          stage: "rough", target_depth_mm: 10,
          suction_enabled: true,
        }],
      });
      expect(r.gcode_text).toContain("M48");
      expect(r.gcode_text).toContain("M49");
    });

    it("sets flush pressure P-code", () => {
      const r = ppSinkerEDMPostEngine.generate({
        operations: [{
          stage: "rough", target_depth_mm: 10,
          flush_pressure_bar: 4.5,
        }],
      });
      expect(r.gcode_text).toContain("P4.5");
    });
  });

  describe("generateStandard3Stage", () => {
    it("produces 3-stage program", () => {
      const r = ppSinkerEDMPostEngine.generateStandard3Stage(20, "H13");
      expect(r.operation_count).toBe(3);
      expect(r.electrode_count).toBe(3);
    });

    it("includes material in header", () => {
      const r = ppSinkerEDMPostEngine.generateStandard3Stage(15, "P20");
      expect(r.gcode_text).toContain("P20");
    });

    it("rough depth is less than cavity depth (leaves stock)", () => {
      const r = ppSinkerEDMPostEngine.generateStandard3Stage(20, "H13");
      // Rough leaves 0.15mm, final reaches full depth
      // start_z=2, so final Z for rough = 2 - (20 - 0.15) = -17.85
      expect(r.gcode_text).toContain("Z-17.850");
      // Finish reaches Z-18 (start_z 2 - 20)
      expect(r.gcode_text).toContain("Z-18.000");
    });
  });

  describe("warnings", () => {
    it("warns on excessive depth", () => {
      const r = ppSinkerEDMPostEngine.generate({
        operations: [{ stage: "rough", target_depth_mm: 75 }],
      });
      expect(r.warnings.some(w => w.includes("75mm"))).toBe(true);
    });

    it("warns on excessive peak current for EA12V", () => {
      const r = ppSinkerEDMPostEngine.generate({
        operations: [{ stage: "rough", target_depth_mm: 10, peak_current_a: 80 }],
      });
      expect(r.warnings.some(w => w.includes("64A"))).toBe(true);
    });
  });

  describe("getEpackNumber", () => {
    it("rough -> 100, semi_finish -> 200, finish -> 300, super_finish -> 400", () => {
      expect(ppSinkerEDMPostEngine.getEpackNumber("rough")).toBe(100);
      expect(ppSinkerEDMPostEngine.getEpackNumber("semi_finish")).toBe(200);
      expect(ppSinkerEDMPostEngine.getEpackNumber("finish")).toBe(300);
      expect(ppSinkerEDMPostEngine.getEpackNumber("super_finish")).toBe(400);
    });
  });

  describe("getStageDefaults", () => {
    it("rough has highest peak current", () => {
      const rough = ppSinkerEDMPostEngine.getStageDefaults("rough");
      const finish = ppSinkerEDMPostEngine.getStageDefaults("finish");
      expect(rough.peak_current).toBeGreaterThan(finish.peak_current);
    });

    it("rough has largest orbit radius", () => {
      const rough = ppSinkerEDMPostEngine.getStageDefaults("rough");
      const superFinish = ppSinkerEDMPostEngine.getStageDefaults("super_finish");
      expect(rough.orbit_radius).toBeGreaterThan(superFinish.orbit_radius);
    });

    it("rough has highest flush pressure", () => {
      const rough = ppSinkerEDMPostEngine.getStageDefaults("rough");
      const finish = ppSinkerEDMPostEngine.getStageDefaults("finish");
      expect(rough.flush_pressure).toBeGreaterThan(finish.flush_pressure);
    });
  });

  describe("getOrbitCode", () => {
    it("returns correct codes", () => {
      expect(ppSinkerEDMPostEngine.getOrbitCode("circle")).toBe("G41.1");
      expect(ppSinkerEDMPostEngine.getOrbitCode("square")).toBe("G41.2");
      expect(ppSinkerEDMPostEngine.getOrbitCode("planetary")).toBe("G41.5");
    });

    it("returns G40.1 for cancel", () => {
      expect(ppSinkerEDMPostEngine.getOrbitCode("circle", true)).toBe("G40.1");
    });
  });

  describe("listStages and listOrbitPatterns", () => {
    it("lists 4 stages", () => {
      expect(ppSinkerEDMPostEngine.listStages().length).toBe(4);
    });

    it("lists 6 orbit patterns", () => {
      expect(ppSinkerEDMPostEngine.listOrbitPatterns().length).toBe(6);
    });
  });

  describe("summary metrics", () => {
    it("tracks total burn depth", () => {
      const r = ppSinkerEDMPostEngine.generate({
        operations: [
          { stage: "rough", target_depth_mm: 10 },
          { stage: "finish", target_depth_mm: 10 },
        ],
      });
      expect(r.total_burn_depth_mm).toBe(20);
    });

    it("estimates burn time", () => {
      const r = ppSinkerEDMPostEngine.generate({
        operations: [{ stage: "rough", target_depth_mm: 10 }],
      });
      expect(r.estimated_burn_time_min).toBeGreaterThan(0);
    });
  });

  describe("machine model variants", () => {
    it("supports EA12V", () => {
      const r = ppSinkerEDMPostEngine.generate({
        machine_model: "EA12V",
        operations: [{ stage: "rough", target_depth_mm: 5 }],
      });
      expect(r.gcode_text).toContain("EA12V");
    });

    it("supports EA28V", () => {
      const r = ppSinkerEDMPostEngine.generate({
        machine_model: "EA28V",
        operations: [{ stage: "rough", target_depth_mm: 5 }],
      });
      expect(r.gcode_text).toContain("EA28V");
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // U-WGAP01: Imperial coordinate conversion tests
  // ══════════════════════════════════════════════════════════════════════

  describe("generate — imperial units (U-WGAP01)", () => {
    it("emits G20 for imperial mode", () => {
      const r = ppSinkerEDMPostEngine.generate({
        units: "imperial",
        operations: [{ stage: "rough", target_depth_mm: 25.4 }],
      });
      expect(r.gcode_text).toContain("G20");
      expect(r.gcode_text).not.toContain("G21");
    });

    it("emits G21 for metric mode (default)", () => {
      const r = ppSinkerEDMPostEngine.generate({
        units: "metric",
        operations: [{ stage: "rough", target_depth_mm: 25.4 }],
      });
      expect(r.gcode_text).toContain("G21");
      expect(r.gcode_text).not.toContain("G20");
    });

    it("converts XY coordinates to inches when imperial", () => {
      const r = ppSinkerEDMPostEngine.generate({
        units: "imperial",
        operations: [{
          stage: "rough",
          target_depth_mm: 10,
          start_x: 25.4, // 1 inch
          start_y: 50.8, // 2 inches
        }],
      });
      // 25.4mm = 1.00000 inches, 50.8mm = 2.00000 inches
      expect(r.gcode_text).toContain("X1.00000");
      expect(r.gcode_text).toContain("Y2.00000");
    });

    it("keeps XY coordinates in mm when metric", () => {
      const r = ppSinkerEDMPostEngine.generate({
        units: "metric",
        operations: [{
          stage: "rough",
          target_depth_mm: 10,
          start_x: 25.4,
          start_y: 50.8,
        }],
      });
      // Should be 25.400 and 50.800 (3 decimals for metric)
      expect(r.gcode_text).toContain("X25.400");
      expect(r.gcode_text).toContain("Y50.800");
    });

    it("converts Z coordinates to inches when imperial", () => {
      const r = ppSinkerEDMPostEngine.generate({
        units: "imperial",
        operations: [{
          stage: "rough",
          target_depth_mm: 25.4, // 1 inch target depth
          start_z: 12.7, // 0.5 inch retract plane
        }],
      });
      // Retract Z = 12.7mm = 0.5 inch
      expect(r.gcode_text).toContain("Z0.50000");
    });

    it("converts orbit radius to inches when imperial", () => {
      const r = ppSinkerEDMPostEngine.generate({
        units: "imperial",
        operations: [{
          stage: "rough",
          target_depth_mm: 10,
          orbit_pattern: "circle",
          orbit_radius_mm: 2.54, // 0.1 inch
        }],
      });
      expect(r.gcode_text).toContain("R0.10000");
    });

    it("uses 5 decimal places for imperial, 3 for metric", () => {
      const rImperial = ppSinkerEDMPostEngine.generate({
        units: "imperial",
        operations: [{
          stage: "rough",
          target_depth_mm: 10,
          start_x: 25.4, // 1 inch
          start_y: 0,
        }],
      });
      // Imperial uses 5 decimals
      expect(rImperial.gcode_text).toMatch(/X1\.00000/);

      const rMetric = ppSinkerEDMPostEngine.generate({
        units: "metric",
        operations: [{
          stage: "rough",
          target_depth_mm: 10,
          start_x: 25.4,
          start_y: 0,
        }],
      });
      // Metric uses 3 decimals
      expect(rMetric.gcode_text).toMatch(/X25\.400/);
    });

    it("labels output as INCH in comments when imperial", () => {
      const r = ppSinkerEDMPostEngine.generate({
        units: "imperial",
        operations: [{ stage: "rough", target_depth_mm: 10 }],
      });
      expect(r.gcode_text).toContain("INCH");
    });

    it("converts final retract Z to inches when imperial", () => {
      const r = ppSinkerEDMPostEngine.generate({
        units: "imperial",
        operations: [{ stage: "rough", target_depth_mm: 10 }],
      });
      // 50mm retract = ~1.9685 inches
      expect(r.gcode_text).toMatch(/Z1\.9685\d/);
    });

    it("converts peck retract Q to inches when imperial", () => {
      const r = ppSinkerEDMPostEngine.generate({
        units: "imperial",
        operations: [{
          stage: "rough",
          target_depth_mm: 10,
          flush_cycle_sec: 5,
          retract_depth_mm: 2.54, // 0.1 inch
        }],
      });
      expect(r.gcode_text).toContain("Q0.10000");
    });
  });
});
