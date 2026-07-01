/**
 * PP-MS8: Non-Traditional Process Posts — Test Suite
 *
 * Tests EDMPostProcessorExtension and LaserWaterjetPostExtension
 * for controller-native G-code generation across 8 controllers.
 *
 * Coverage:
 *   EDM Wire:    Fanuc ROBOcut, Mitsubishi, Sodick, AgieCharmilles
 *   EDM Sinker:  Mitsubishi EA, Sodick AG, AgieCharmilles FORM
 *   Laser:       Bystronic ByStar, TRUMPF TruLaser
 *   Waterjet:    OMAX IntelliMAX, Flow Mach
 */
import { describe, it, expect } from "vitest";
import { edmPostProcessorExtension } from "../engines/EDMPostProcessorExtension.js";
import { laserWaterjetPostExtension } from "../engines/LaserWaterjetPostExtension.js";

// ── Sample G-code inputs ────────────────────────────────────────────────

const WIRE_EDM_GCODE = `%
O0001 (WIRE EDM TEST)
G90 G21
G92 X0 Y0
M06 (WIRE THREAD)
M50 (WIRE RUN)
G42 H01
G01 X10.000 Y0.000
G01 X10.000 Y10.000
G01 X0.000 Y10.000
G01 X0.000 Y0.000
G40
M51
M02
%`;

const SINKER_EDM_GCODE = `%
O0001 (SINKER EDM TEST)
G90 G21
G54
(ELECTRODE POSITION)
G00 X25.000 Y15.000
(BURN SEQUENCE)
G01 Z-5.000 F0.5
G01 Z-10.000 F0.3
G73 Z2.0 (RETRACT)
G01 Z-15.000 F0.2
M30
%`;

const LASER_CUT_GCODE = `%
O0001 (LASER CUT)
G90 G21
G00 X50.000 Y30.000
G01 X100.000 Y30.000 F2000
G01 X100.000 Y80.000
G01 X50.000 Y80.000
G01 X50.000 Y30.000
G00 X150.000 Y30.000
G01 X200.000 Y30.000 F2000
G01 X200.000 Y80.000
G01 X150.000 Y80.000
G01 X150.000 Y30.000
M30
%`;

const WATERJET_GCODE = `; WATERJET CUT
G90 G21
G00 X10.000 Y10.000
G01 X60.000 Y10.000 F120
G01 X60.000 Y60.000
G01 X10.000 Y60.000
G01 X10.000 Y10.000
M30`;

// ════════════════════════════════════════════════════════════════════════
// EDMPostProcessorExtension
// ════════════════════════════════════════════════════════════════════════

describe("PP-MS8: EDMPostProcessorExtension", () => {

  // ── Detection ──────────────────────────────────────────────────────

  describe("Process Type Detection", () => {
    it("detects wire EDM from M50/M51/WIRE markers", () => {
      expect(edmPostProcessorExtension.detectProcessType(WIRE_EDM_GCODE)).toBe("wire");
    });

    it("detects sinker EDM from ELECTRODE/BURN/G73 markers", () => {
      expect(edmPostProcessorExtension.detectProcessType(SINKER_EDM_GCODE)).toBe("sinker");
    });

    it("defaults to wire for ambiguous input", () => {
      expect(edmPostProcessorExtension.detectProcessType("G01 X10 Y10")).toBe("wire");
    });
  });

  // ── Wire EDM: Fanuc ROBOcut ────────────────────────────────────────

  describe("Wire EDM — Fanuc ROBOcut", () => {
    it("generates valid program with E-code conditions", () => {
      const result = edmPostProcessorExtension.postProcess({
        gcode: WIRE_EDM_GCODE,
        controller: "fanuc_robocut",
        process_type: "wire",
        num_skim_passes: 2,
      });
      expect(result.controller).toBe("fanuc_robocut");
      expect(result.process_type).toBe("wire");
      expect(result.gcode).toContain("FANUC ROBOCUT");
      expect(result.gcode).toContain("E0001"); // rough condition
      expect(result.gcode).toContain("E0002"); // skim 1
      expect(result.gcode).toContain("E0003"); // skim 2
      expect(result.gcode).toContain("M06");   // auto thread
      expect(result.gcode).toContain("M50");   // wire run
      expect(result.gcode).toContain("G42 H"); // wire offset
      expect(result.gcode).toContain("G40");   // cancel offset
      expect(result.stats.skim_passes).toBe(2);
      expect(result.stats.cutting_moves).toBeGreaterThan(0);
    });

    it("includes taper codes when taper angle specified", () => {
      const result = edmPostProcessorExtension.postProcess({
        gcode: WIRE_EDM_GCODE,
        controller: "fanuc_robocut",
        process_type: "wire",
        taper_angle_deg: 3.5,
        num_skim_passes: 1,
      });
      expect(result.gcode).toContain("G51 U3.500"); // taper on
      expect(result.gcode).toContain("G50");          // taper off
    });

    it("warns when sinker requested on wire-only ROBOcut", () => {
      const result = edmPostProcessorExtension.postProcess({
        gcode: SINKER_EDM_GCODE,
        controller: "fanuc_robocut",
        process_type: "sinker",
      });
      expect(result.warnings.some(w => /wire EDM only/i.test(w))).toBe(true);
    });
  });

  // ── Wire EDM: Sodick ───────────────────────────────────────────────

  describe("Wire EDM — Sodick", () => {
    it("generates valid program with C-code conditions", () => {
      const result = edmPostProcessorExtension.postProcess({
        gcode: WIRE_EDM_GCODE,
        controller: "sodick",
        process_type: "wire",
        num_skim_passes: 3,
      });
      expect(result.controller).toBe("sodick");
      expect(result.gcode).toContain("SODICK");
      expect(result.gcode).toContain("C100"); // rough
      expect(result.gcode).toContain("C200"); // skim1
      expect(result.gcode).toContain("C300"); // skim2
      expect(result.gcode).toContain("C400"); // skim3
      expect(result.stats.skim_passes).toBe(3);
    });

    it("generates 4 skim passes when requested", () => {
      const result = edmPostProcessorExtension.postProcess({
        gcode: WIRE_EDM_GCODE,
        controller: "sodick",
        process_type: "wire",
        num_skim_passes: 4,
      });
      expect(result.gcode).toContain("C500"); // skim4
      expect(result.stats.skim_passes).toBe(4);
    });
  });

  // ── Wire EDM: Mitsubishi ───────────────────────────────────────────

  describe("Wire EDM — Mitsubishi", () => {
    it("generates valid program with E+C code conditions", () => {
      const result = edmPostProcessorExtension.postProcess({
        gcode: WIRE_EDM_GCODE,
        controller: "mitsubishi_edm",
        process_type: "wire",
      });
      expect(result.gcode).toContain("MITSUBISHI");
      expect(result.gcode).toContain("E0100 C0001"); // rough
      expect(result.gcode).toContain("E0200 C0002"); // skim1
    });
  });

  // ── Wire EDM: AgieCharmilles ───────────────────────────────────────

  describe("Wire EDM — AgieCharmilles", () => {
    it("generates valid program with T-code tech tables", () => {
      const result = edmPostProcessorExtension.postProcess({
        gcode: WIRE_EDM_GCODE,
        controller: "agiecharmilles",
        process_type: "wire",
      });
      expect(result.gcode).toContain("AGIECHARMILLES");
      expect(result.gcode).toContain("T0101"); // rough tech table
      expect(result.gcode).toContain("T0102"); // trim 1
    });
  });

  // ── Sinker EDM ─────────────────────────────────────────────────────

  describe("Sinker EDM — Sodick AG", () => {
    it("generates valid sinker program with burn phases", () => {
      const result = edmPostProcessorExtension.postProcess({
        gcode: SINKER_EDM_GCODE,
        controller: "sodick",
        process_type: "sinker",
      });
      expect(result.process_type).toBe("sinker");
      expect(result.gcode).toContain("SODICK AG");
      expect(result.gcode).toContain("C100"); // rough burn
      expect(result.gcode).toContain("C200"); // semi-finish
      expect(result.gcode).toContain("C300"); // finish
      expect(result.gcode).toContain("G43");  // wear comp
      expect(result.gcode).toContain("M62");  // adaptive on
    });

    it("includes orbit codes for semi-finish/finish", () => {
      const result = edmPostProcessorExtension.postProcess({
        gcode: SINKER_EDM_GCODE,
        controller: "sodick",
        process_type: "sinker",
        orbit_radius_mm: 0.2,
      });
      expect(result.gcode).toContain("P9010 R0.200"); // orbit start
      expect(result.gcode).toContain("P9011");         // orbit cancel
    });
  });

  describe("Sinker EDM — AgieCharmilles FORM", () => {
    it("generates valid program with FORM series codes", () => {
      const result = edmPostProcessorExtension.postProcess({
        gcode: SINKER_EDM_GCODE,
        controller: "agiecharmilles",
        process_type: "sinker",
      });
      expect(result.gcode).toContain("AGIECHARMILLES FORM");
      expect(result.gcode).toContain("T1001"); // tech table rough
      expect(result.gcode).toContain("T1002"); // semi-finish
      expect(result.gcode).toContain("P7700"); // ISPG orbit
    });
  });

  // ── Input Validation ───────────────────────────────────────────────

  describe("Input Validation", () => {
    it("throws on empty gcode", () => {
      expect(() => edmPostProcessorExtension.postProcess({
        gcode: "",
        controller: "fanuc_robocut",
      })).toThrow(/gcode.*required/i);
    });

    it("throws on missing controller", () => {
      expect(() => edmPostProcessorExtension.postProcess({
        gcode: WIRE_EDM_GCODE,
        controller: "" as any,
      })).toThrow(/controller.*required/i);
    });
  });

  // ── Execute router ─────────────────────────────────────────────────

  describe("Execute Router", () => {
    it("routes ppg_edm_generate", () => {
      const result = edmPostProcessorExtension.execute("ppg_edm_generate", {
        gcode: WIRE_EDM_GCODE,
        controller: "fanuc_robocut",
        process_type: "wire",
      });
      expect((result as any).controller).toBe("fanuc_robocut");
    });

    it("routes ppg_edm_controllers", () => {
      const result = edmPostProcessorExtension.execute("ppg_edm_controllers", {});
      expect(Array.isArray(result)).toBe(true);
      expect((result as any[]).length).toBe(4);
    });

    it("throws on unknown action", () => {
      expect(() => edmPostProcessorExtension.execute("bad_action", {})).toThrow(/unknown action/i);
    });
  });

  // ── List Controllers ───────────────────────────────────────────────

  describe("List Controllers", () => {
    it("returns 4 controllers with wire/sinker capabilities", () => {
      const list = edmPostProcessorExtension.listControllers();
      expect(list).toHaveLength(4);
      const fanuc = list.find(c => c.controller === "fanuc_robocut")!;
      expect(fanuc.wire).toBe(true);
      expect(fanuc.sinker).toBe(false); // ROBOcut = wire only
      const sodick = list.find(c => c.controller === "sodick")!;
      expect(sodick.wire).toBe(true);
      expect(sodick.sinker).toBe(true);
    });
  });
});

// ════════════════════════════════════════════════════════════════════════
// LaserWaterjetPostExtension
// ════════════════════════════════════════════════════════════════════════

describe("PP-MS8: LaserWaterjetPostExtension", () => {

  // ── Detection ──────────────────────────────────────────────────────

  describe("Process Type Detection", () => {
    it("detects laser from SHUTTER/BEAM/M10 markers", () => {
      const gcode = "M10 (SHUTTER OPEN)\nG01 X10 Y10\nM11 (SHUTTER CLOSE)";
      expect(laserWaterjetPostExtension.detectProcessType(gcode)).toBe("laser_cut");
    });

    it("detects waterjet from ABRASIVE/PUMP markers", () => {
      const gcode = "M08 (ABRASIVE ON)\nG01 X10 Y10\nM09 (ABRASIVE OFF)\n; PUMP pressure";
      expect(laserWaterjetPostExtension.detectProcessType(gcode)).toBe("waterjet");
    });

    it("detects laser marking from MARK/ENGRAV markers", () => {
      const gcode = "LASER MARK PROGRAM\nG01 X10 Y10";
      expect(laserWaterjetPostExtension.detectProcessType(gcode)).toBe("laser_mark");
    });
  });

  // ── Laser: Bystronic ──────────────────────────────────────────────

  describe("Laser Cut — Bystronic ByStar", () => {
    it("generates valid program with Bystronic M-codes", () => {
      const result = laserWaterjetPostExtension.postProcess({
        gcode: LASER_CUT_GCODE,
        controller: "bystronic",
        process_type: "laser_cut",
        material: "mild_steel",
        thickness_mm: 6,
      });
      expect(result.controller).toBe("bystronic");
      expect(result.process_type).toBe("laser_cut");
      expect(result.gcode).toContain("BYSTRONIC BYSTAR");
      expect(result.gcode).toContain("M17");  // laser ready
      expect(result.gcode).toContain("M10");  // shutter open
      expect(result.gcode).toContain("M11");  // shutter close
      expect(result.gcode).toContain("M41");  // oxygen gas (mild steel medium)
      expect(result.stats.cutting_moves).toBeGreaterThan(0);
      expect(result.stats.pierce_count).toBeGreaterThanOrEqual(1);
    });

    it("uses ramp pierce for medium thickness mild steel", () => {
      const result = laserWaterjetPostExtension.postProcess({
        gcode: LASER_CUT_GCODE,
        controller: "bystronic",
        process_type: "laser_cut",
        material: "mild_steel",
        thickness_mm: 6,
      });
      // Medium thickness mild steel → ramp pierce
      expect(result.gcode).toContain("RAMP");
    });

    it("uses nitrogen for stainless steel", () => {
      const result = laserWaterjetPostExtension.postProcess({
        gcode: LASER_CUT_GCODE,
        controller: "bystronic",
        process_type: "laser_cut",
        material: "stainless_steel",
        thickness_mm: 3,
      });
      expect(result.gcode).toContain("M40"); // nitrogen
      expect(result.gcode).toContain("NITROGEN");
    });

    it("warns on thick material near limit", () => {
      const result = laserWaterjetPostExtension.postProcess({
        gcode: LASER_CUT_GCODE,
        controller: "bystronic",
        process_type: "laser_cut",
        thickness_mm: 30,
      });
      expect(result.warnings.some(w => /limit/i.test(w))).toBe(true);
    });
  });

  // ── Laser: TRUMPF ─────────────────────────────────────────────────

  describe("Laser Cut — TRUMPF TruLaser", () => {
    it("generates valid program with TRUMPF LO=/LS= codes", () => {
      const result = laserWaterjetPostExtension.postProcess({
        gcode: LASER_CUT_GCODE,
        controller: "trumpf",
        process_type: "laser_cut",
        material: "aluminum",
        thickness_mm: 4,
      });
      expect(result.controller).toBe("trumpf");
      expect(result.gcode).toContain("TRUMPF TRULASER");
      expect(result.gcode).toContain("M20");  // laser enable
      expect(result.gcode).toContain("M21");  // beam on
      expect(result.gcode).toContain("LO=");  // laser output
      expect(result.gcode).toContain("GS=");  // gas select
      expect(result.gcode).toContain("GP=");  // gas pressure
      expect(result.gcode).toContain("FP=");  // focus position
    });

    it("uses pulse pierce for thick aluminum", () => {
      const result = laserWaterjetPostExtension.postProcess({
        gcode: LASER_CUT_GCODE,
        controller: "trumpf",
        process_type: "laser_cut",
        material: "aluminum",
        thickness_mm: 12,
        pierce_strategy: "pulse",
      });
      expect(result.gcode).toContain("LS=2"); // pulse mode
    });

    it("allows pierce strategy override", () => {
      const result = laserWaterjetPostExtension.postProcess({
        gcode: LASER_CUT_GCODE,
        controller: "trumpf",
        process_type: "laser_cut",
        pierce_strategy: "pre_pierce",
      });
      expect(result.gcode).toContain("PRE-PIERCE");
    });
  });

  // ── Waterjet: OMAX ────────────────────────────────────────────────

  describe("Waterjet — OMAX IntelliMAX", () => {
    it("generates valid program with OMAX format", () => {
      const result = laserWaterjetPostExtension.postProcess({
        gcode: WATERJET_GCODE,
        controller: "omax",
        process_type: "waterjet",
        material: "mild_steel",
        thickness_mm: 25,
        quality_level: 3,
      });
      expect(result.controller).toBe("omax");
      expect(result.process_type).toBe("waterjet");
      expect(result.gcode).toContain("OMAX");
      expect(result.gcode).toContain("M03");  // pump on
      expect(result.gcode).toContain("M08");  // abrasive on
      expect(result.gcode).toContain("M09");  // abrasive off
      expect(result.stats.cutting_moves).toBeGreaterThan(0);
      expect(result.stats.pierce_count).toBeGreaterThanOrEqual(1);
    });

    it("adjusts feed rate based on quality level", () => {
      const q1 = laserWaterjetPostExtension.postProcess({
        gcode: WATERJET_GCODE,
        controller: "omax",
        process_type: "waterjet",
        material: "mild_steel",
        thickness_mm: 25,
        quality_level: 1,
      });
      const q5 = laserWaterjetPostExtension.postProcess({
        gcode: WATERJET_GCODE,
        controller: "omax",
        process_type: "waterjet",
        material: "mild_steel",
        thickness_mm: 25,
        quality_level: 5,
      });
      // Q1 (rough) should have higher feed than Q5 (fine)
      const extractFeed = (gc: string) => {
        const m = gc.match(/G01.*F(\d+)/);
        return m ? parseInt(m[1]) : 0;
      };
      expect(extractFeed(q1.gcode)).toBeGreaterThan(extractFeed(q5.gcode));
    });

    it("includes taper compensation when requested", () => {
      const result = laserWaterjetPostExtension.postProcess({
        gcode: WATERJET_GCODE,
        controller: "omax",
        process_type: "waterjet",
        taper_angle_deg: 2.0,
      });
      expect(result.gcode).toContain("G68"); // taper comp on
      expect(result.gcode).toContain("G69"); // taper comp off
    });

    it("warns on extreme thickness", () => {
      const result = laserWaterjetPostExtension.postProcess({
        gcode: WATERJET_GCODE,
        controller: "omax",
        process_type: "waterjet",
        thickness_mm: 200,
      });
      expect(result.warnings.some(w => /exceed/i.test(w))).toBe(true);
    });
  });

  // ── Waterjet: Flow ────────────────────────────────────────────────

  describe("Waterjet — Flow Mach", () => {
    it("generates valid program with Flow format", () => {
      const result = laserWaterjetPostExtension.postProcess({
        gcode: WATERJET_GCODE,
        controller: "flow",
        process_type: "waterjet",
        material: "stainless_steel",
        thickness_mm: 20,
      });
      expect(result.controller).toBe("flow");
      expect(result.gcode).toContain("FLOW MACH");
      expect(result.gcode).toContain("M03"); // high pressure on
      expect(result.gcode).toContain("M08"); // abrasive on
    });

    it("includes Dynamic XD taper compensation", () => {
      const result = laserWaterjetPostExtension.postProcess({
        gcode: WATERJET_GCODE,
        controller: "flow",
        process_type: "waterjet",
        taper_angle_deg: 1.5,
      });
      expect(result.gcode).toContain("G68.1"); // Dynamic XD
    });

    it("supports low-pressure pierce strategy", () => {
      const result = laserWaterjetPostExtension.postProcess({
        gcode: WATERJET_GCODE,
        controller: "flow",
        process_type: "waterjet",
        pierce_strategy: "low_pressure" as any,
      });
      expect(result.gcode).toContain("LOW PRESSURE");
    });
  });

  // ── Input Validation ───────────────────────────────────────────────

  describe("Input Validation", () => {
    it("throws on empty gcode", () => {
      expect(() => laserWaterjetPostExtension.postProcess({
        gcode: "",
        controller: "bystronic",
      })).toThrow(/gcode.*required/i);
    });

    it("throws on missing controller", () => {
      expect(() => laserWaterjetPostExtension.postProcess({
        gcode: LASER_CUT_GCODE,
        controller: "" as any,
      })).toThrow(/controller.*required/i);
    });

    it("throws when laser controller used for waterjet", () => {
      expect(() => laserWaterjetPostExtension.postProcess({
        gcode: WATERJET_GCODE,
        controller: "bystronic",
        process_type: "waterjet",
      })).toThrow(/not a waterjet controller/i);
    });

    it("throws when waterjet controller used for laser", () => {
      expect(() => laserWaterjetPostExtension.postProcess({
        gcode: LASER_CUT_GCODE,
        controller: "omax",
        process_type: "laser_cut",
      })).toThrow(/not a laser controller/i);
    });
  });

  // ── Execute Router ─────────────────────────────────────────────────

  describe("Execute Router", () => {
    it("routes ppg_laser_generate", () => {
      const result = laserWaterjetPostExtension.execute("ppg_laser_generate", {
        gcode: LASER_CUT_GCODE,
        controller: "bystronic",
      });
      expect((result as any).process_type).toBe("laser_cut");
    });

    it("routes ppg_waterjet_generate", () => {
      const result = laserWaterjetPostExtension.execute("ppg_waterjet_generate", {
        gcode: WATERJET_GCODE,
        controller: "omax",
      });
      expect((result as any).process_type).toBe("waterjet");
    });

    it("routes ppg_sheet_controllers", () => {
      const result = laserWaterjetPostExtension.execute("ppg_sheet_controllers", {});
      expect(Array.isArray(result)).toBe(true);
      expect((result as any[]).length).toBe(4);
    });

    it("throws on unknown action", () => {
      expect(() => laserWaterjetPostExtension.execute("bad", {})).toThrow(/unknown action/i);
    });
  });

  // ── List Controllers ───────────────────────────────────────────────

  describe("List Controllers", () => {
    it("returns 4 controllers with laser/waterjet flags", () => {
      const list = laserWaterjetPostExtension.listControllers();
      expect(list).toHaveLength(4);
      expect(list.find(c => c.controller === "bystronic")!.laser).toBe(true);
      expect(list.find(c => c.controller === "bystronic")!.waterjet).toBe(false);
      expect(list.find(c => c.controller === "omax")!.laser).toBe(false);
      expect(list.find(c => c.controller === "omax")!.waterjet).toBe(true);
    });
  });
});
