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

    it("supports EA12D (JM EDM-02) with the correct identity header, not the EA12V default", () => {
      const r = ppSinkerEDMPostEngine.generate({
        machine_model: "EA12D",
        operations: [{ stage: "rough", target_depth_mm: 5 }],
      });
      expect(r.gcode_text).toContain("MITSUBISHI EA12D");
      expect(r.gcode_text).not.toContain("EA12V"); // regression: EA12D must not fall back to the default
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

  // ==========================================================================
  // NON-FINITE EMIT GUARD (U-PP-NONFINITE-EMIT-SWEEP) -- a NaN/Infinity start
  // coord, plunge depth, retract, or orbit radius must never leak a literal
  // XNaN/ZInfinity the Mitsubishi sinker control rejects. Sinker-EDM arm of the
  // bug-class sweep; sibling of the OkumaB250/OkumaOSP/HurcoV11/Mitsubishi/PPOkuma/
  // PPWireEDM/FiveAxis fixes.
  // ==========================================================================
  describe("non-finite emit guard (U-PP-NONFINITE-EMIT-SWEEP)", () => {
    const gen = (op: Record<string, unknown>) =>
      ppSinkerEDMPostEngine.generate({ machine_id: "jmdie-mitsubishi-ea12", operations: [{ stage: "rough", target_depth_mm: 10, ...op }] as never });
    // Danger = a non-finite EXECUTABLE token (`XNaN`/`ZInfinity`); the ERROR comment
    // intentionally echoes field=value as the fail-loud signal (R12).
    const noBadToken = (g: string) => {
      expect(g).not.toMatch(/[XYZQRIJ]NaN/);
      expect(g).not.toMatch(/[XYZQRIJ]Infinity/);
    };

    it("[regression] a finite op emits real plunge motion with NO non-finite warning", () => {
      const r = gen({ start_x: 5, start_y: 5, target_depth_mm: 8 });
      expect(/G8[123] Z/.test(r.gcode_text)).toBe(true);
      expect(r.warnings.some(w => w.includes("non-finite"))).toBe(false);
      expect(r.gcode_text).not.toContain("DO NOT RUN");
    });

    it("NaN start_x halts the op with an ERROR marker -- no literal XNaN", () => {
      const r = gen({ start_x: NaN, start_y: 5 });
      noBadToken(r.gcode_text);
      expect(r.warnings.some(w => w.includes("non-finite emit field"))).toBe(true);
      expect(r.gcode_text).toContain("DO NOT RUN");
    });

    it("Infinity target_depth_mm halts the op -- no literal ZInfinity", () => {
      const r = gen({ target_depth_mm: Infinity });
      noBadToken(r.gcode_text);
      expect(r.warnings.some(w => w.includes("non-finite emit field"))).toBe(true);
    });

    it("NaN orbit_radius_mm halts the op -- no literal RNaN", () => {
      const r = gen({ orbit_radius_mm: NaN, orbit_pattern: "circular" });
      noBadToken(r.gcode_text);
      expect(r.warnings.some(w => w.includes("non-finite emit field"))).toBe(true);
    });

    it("a non-finite op is dropped but valid neighbors still emit", () => {
      const r = ppSinkerEDMPostEngine.generate({
        machine_id: "jmdie-mitsubishi-ea12",
        operations: [
          { stage: "rough", target_depth_mm: NaN } as never,
          { stage: "finish", target_depth_mm: 6 } as never,
        ],
      });
      noBadToken(r.gcode_text);
      expect(r.gcode_text).toContain("DO NOT RUN");          // bad op flagged
      expect(/G8[123] Z/.test(r.gcode_text)).toBe(true);     // good op emits
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // U-PP-EDM-MATERIAL-WIRE -- the sinker post is now material-aware via the
  // canonical EDM material DB (src/data/edm-material-db.ts). The wiring is
  // ADVISORY ONLY: header comments + warnings + burn-time estimate. The SAFETY
  // INVARIANT (proven below) is that material NEVER changes the emitted pulse
  // params (IP/ON/OF/SV) or motion blocks that reach real iron.
  // ══════════════════════════════════════════════════════════════════════
  describe("material-aware wiring (U-PP-EDM-MATERIAL-WIRE)", () => {
    const roughOp = { stage: "rough" as const, target_depth_mm: 10 };

    it("emits a MAT PROPS header line resolved from the canonical DB", () => {
      const r = ppSinkerEDMPostEngine.generate({ material: "H13", operations: [roughOp] });
      // H13 is a die-steel grade -> tool_steel multipass bucket (mrr 0.90), H13 bi-props
      // (machinability 0.92, melt 1427C).
      expect(r.gcode_text).toContain("(MAT PROPS: TOOL_STEEL | MRR 0.90x | MACHINABILITY 0.92 | MELT 1427C)");
      expect(r.material_resolved).toBe("tool_steel");
    });

    it("preserves the raw operator material string in the MATERIAL header", () => {
      const r = ppSinkerEDMPostEngine.generate({ material: "P20", operations: [roughOp] });
      expect(r.gcode_text).toContain("(MATERIAL: P20)"); // operator grade not lost
      expect(r.material_resolved).toBe("tool_steel");     // resolved bucket
    });

    it("die-steel grades (H13/D2/A2/S7/M2) resolve to the tool_steel bucket, never undefined", () => {
      for (const grade of ["H13", "D2", "A2", "S7", "M2"]) {
        const r = ppSinkerEDMPostEngine.generate({ material: grade, operations: [roughOp] });
        expect(r.material_resolved).toBe("tool_steel");
        expect(r.gcode_text).toContain("MRR 0.90x"); // tool_steel mrr_factor
      }
    });

    it("an alias die-steel grade (P20) shows die-steel bi-props in the header, not plain steel's", () => {
      // P20 -> tool_steel bucket; the bi table has no tool_steel key, so it would fall back to
      // STEEL (machinability 1.00, melt 1500C). The fix substitutes H13's die-steel profile so
      // the TOOL_STEEL header is consistent (H13: machinability 0.92, melt 1427C).
      const r = ppSinkerEDMPostEngine.generate({ material: "P20", operations: [roughOp] });
      expect(r.gcode_text).toContain("MACHINABILITY 0.92"); // H13 die-steel, NOT steel's 1.00
      expect(r.gcode_text).toContain("MELT 1427C");          // H13, NOT steel's 1500C
      expect(r.gcode_text).not.toContain("MACHINABILITY 1.00");
    });

    it("plain steel (1018) keeps the steel bucket + steel bi-props (not substituted)", () => {
      const r = ppSinkerEDMPostEngine.generate({ material: "1018", operations: [roughOp] });
      expect(r.material_resolved).toBe("steel");
      expect(r.gcode_text).toContain("MACHINABILITY 1.00"); // steel, correctly unchanged
    });

    it("flags a distortion-prone workpiece (H13) with a header advisory", () => {
      const r = ppSinkerEDMPostEngine.generate({ material: "H13", operations: [roughOp] });
      expect(r.gcode_text).toContain("DISTORTION-PRONE");
    });

    it("does NOT flag distortion for a non-prone material (aluminum)", () => {
      const r = ppSinkerEDMPostEngine.generate({ material: "6061", operations: [roughOp] });
      expect(r.material_resolved).toBe("aluminum");
      expect(r.gcode_text).not.toContain("DISTORTION-PRONE");
    });

    it("flags an aggressive-flush material (carbide, flush 1.4) with a header advisory", () => {
      const r = ppSinkerEDMPostEngine.generate({ material: "carbide", operations: [roughOp] });
      expect(r.material_resolved).toBe("tungsten_carbide");
      expect(r.gcode_text).toContain("AGGRESSIVE FLUSH");
      expect(r.gcode_text).toContain("factor 1.40");
    });

    it("does NOT flag aggressive flush for a low-flush material (copper, 0.85)", () => {
      const r = ppSinkerEDMPostEngine.generate({ material: "copper", operations: [roughOp] });
      expect(r.material_resolved).toBe("copper");
      expect(r.gcode_text).not.toContain("AGGRESSIVE FLUSH");
    });

    it("scales the burn-time estimate by the material MRR factor (carbide ~3x slower than steel)", () => {
      const steel = ppSinkerEDMPostEngine.generate({ material: "1018", operations: [roughOp] });
      const carbide = ppSinkerEDMPostEngine.generate({ material: "carbide", operations: [roughOp] });
      // steel mrr 1.0 -> 1000/(200*1.0)=5 min ; carbide mrr 0.35 -> 1000/(200*0.35)=14.3 -> 14 min
      expect(steel.estimated_burn_time_min).toBe(5);
      expect(carbide.estimated_burn_time_min).toBe(14);
      expect(carbide.estimated_burn_time_min!).toBeGreaterThan(steel.estimated_burn_time_min!);
    });

    it("adds a material-aware over-current warning when peak current exceeds the material max", () => {
      // carbide max_current_A = 200; use semi_finish so the rough-only 64A check does not fire
      const r = ppSinkerEDMPostEngine.generate({
        material: "carbide",
        operations: [{ stage: "semi_finish", target_depth_mm: 10, peak_current_a: 250 }],
      });
      expect(r.warnings.some(w => w.includes("tungsten_carbide max safe current (200A"))).toBe(true);
    });

    it("an unknown material falls back to steel without crashing", () => {
      const r = ppSinkerEDMPostEngine.generate({ material: "ZZZ-NOT-A-MATERIAL", operations: [roughOp] });
      expect(r.material_resolved).toBe("steel");
      expect(r.gcode_text).toContain("MRR 1.00x");
      expect(r.gcode_text).not.toContain("DISTORTION-PRONE");
    });

    it("SAFETY INVARIANT: material changes NO executable G-code (only comments/warnings/estimate)", () => {
      const execLines = (m: string) =>
        ppSinkerEDMPostEngine
          .generate({ material: m, operations: [{ ...roughOp, peak_current_a: 30 }] })
          .gcode_lines.filter(l => l.trim() !== "" && !l.trim().startsWith("("));
      // copper vs steel vs carbide -- the emitted pulse/motion blocks must be byte-identical;
      // only the (...) comment lines and warnings/estimate differ by material.
      const steel = execLines("1018");
      const copper = execLines("copper");
      const carbide = execLines("carbide");
      expect(copper).toEqual(steel);
      expect(carbide).toEqual(steel);
      // and the pulse params are the stage-default rough values regardless of material
      expect(steel.join("\n")).toContain("IP30"); // caller-supplied 30A, unchanged by material
    });
  });
});
