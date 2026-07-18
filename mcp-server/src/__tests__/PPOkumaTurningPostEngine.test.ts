/**
 * PPOkumaTurningPostEngine Tests
 */
import { describe, it, expect } from "vitest";
import {
  PPOkumaTurningPostEngine,
  ppOkumaTurningPostEngine,
} from "../engines/PPOkumaTurningPostEngine.js";

describe("PPOkumaTurningPostEngine", () => {
  it("exports singleton", () => {
    expect(ppOkumaTurningPostEngine).toBeInstanceOf(PPOkumaTurningPostEngine);
  });

  describe("generate — OD roughing", () => {
    it("produces valid program", () => {
      const r = ppOkumaTurningPostEngine.generate({
        machine_id: "jmdie-okuma-lb3000",
        program_number: "2001",
        part_description: "D2 DIE INSERT",
        bar_diameter_mm: 50,
        material: "D2 tool steel",
        operations: [{
          type: "od_rough", tool_number: 1, tool_position: 1,
          insert_type: "CNMG 432",
          speed_sfm: 200, css: true, feed_ipr: 0.012,
          depth_of_cut_mm: 2, coolant: "flood",
          start_x_mm: 50, end_x_mm: 30, start_z_mm: 1, end_z_mm: -40,
        }],
      });
      expect(r.gcode_text.length).toBeGreaterThan(100);
      expect(r.operation_count).toBe(1);
    });

    it("contains safe start G28", () => {
      const r = ppOkumaTurningPostEngine.generateSimpleODRough(50, 30, 40, 200, 0.012, 2);
      expect(r.gcode_text).toContain("G28");
    });

    it("contains CSS G96", () => {
      const r = ppOkumaTurningPostEngine.generateSimpleODRough(50, 30, 40, 200, 0.012, 2);
      expect(r.gcode_text).toContain("G96");
    });

    it("contains RPM clamp G50", () => {
      const r = ppOkumaTurningPostEngine.generateSimpleODRough(50, 30, 40, 200, 0.012, 2);
      expect(r.gcode_text).toContain("G50 S");
    });

    it("contains Okuma OSP 6-digit tool call T010101 (NOT 4-digit)", () => {
      const r = ppOkumaTurningPostEngine.generateSimpleODRough(50, 30, 40, 200, 0.012, 2);
      expect(r.gcode_text).toContain("T010101"); // 6-digit T<station><offset><wear>, all = tool number
    });

    it("contains M3 spindle CW", () => {
      const r = ppOkumaTurningPostEngine.generateSimpleODRough(50, 30, 40, 200, 0.012, 2);
      expect(r.gcode_text).toContain("M3");
    });

    it("contains M8 flood coolant", () => {
      const r = ppOkumaTurningPostEngine.generateSimpleODRough(50, 30, 40, 200, 0.012, 2);
      expect(r.gcode_text).toContain("M8");
    });

    it("contains M30 program end", () => {
      const r = ppOkumaTurningPostEngine.generateSimpleODRough(50, 30, 40, 200, 0.012, 2);
      expect(r.gcode_text).toContain("M30");
    });

    it("contains spindle stop M5", () => {
      const r = ppOkumaTurningPostEngine.generateSimpleODRough(50, 30, 40, 200, 0.012, 2);
      expect(r.gcode_text).toContain("M5");
    });
  });

  describe("generate — multi-operation", () => {
    it("handles face + rough + finish", () => {
      const r = ppOkumaTurningPostEngine.generate({
        machine_id: "jmdie-okuma-lb3000",
        operations: [
          { type: "face", tool_number: 1, tool_position: 1, speed_sfm: 200, css: true, feed_mm_rev: 0.2, coolant: "flood", start_x_mm: 50 },
          { type: "od_rough", tool_number: 1, tool_position: 1, speed_sfm: 200, css: true, feed_mm_rev: 0.3, depth_of_cut_mm: 2, coolant: "flood", start_x_mm: 50, end_x_mm: 30, end_z_mm: -40 },
          { type: "od_finish", tool_number: 2, tool_position: 2, speed_sfm: 300, css: true, feed_mm_rev: 0.1, coolant: "flood", end_x_mm: 30, end_z_mm: -40 },
        ],
      });
      expect(r.operation_count).toBe(3);
      expect(r.gcode_text).toContain("T010101"); // tool 1, 6-digit OSP
      expect(r.gcode_text).toContain("T020202"); // tool 2, 6-digit OSP
    });
  });

  describe("generate — threading (Okuma OSP G71, NOT Fanuc G76)", () => {
    it("emits the OSP G71 single-line threading cycle with M33 M73, never Fanuc G76", () => {
      const r = ppOkumaTurningPostEngine.generate({
        machine_id: "jmdie-okuma-lb3000",
        operations: [{
          type: "thread", tool_number: 3, tool_position: 3,
          speed_rpm: 1000, coolant: "flood",
          thread_pitch_mm: 1.5, thread_depth_mm: 0.92, thread_passes: 6,
          start_x_mm: 20, end_z_mm: -15,
        }],
      });
      // On Okuma OSP, G71 IS the threading cycle; Fanuc G76 alarms/mis-cycles the control.
      expect(r.gcode_text).not.toMatch(/\bG76\b/);
      // minor dia = start_x(20) - 2*depth(0.92) = 18.160; H = 2*depth = 1.840; F = pitch (lead, mm).
      expect(r.gcode_text).toContain("G71 X18.160 Z-15.000 B60 D0.080 U0.025 H1.840 F1.500 M33 M73");
    });
  });

  describe("generate — grooving/parting", () => {
    it("emits an explicit OSP groove (G1 plunge + G4 dwell), never Fanuc G75", () => {
      const r = ppOkumaTurningPostEngine.generate({
        machine_id: "jmdie-okuma-lb3000",
        operations: [{
          type: "groove", tool_number: 4, tool_position: 4,
          speed_rpm: 800, feed_mm_rev: 0.05, coolant: "flood",
          start_x_mm: 40, end_x_mm: 25, end_z_mm: -20,
        }],
      });
      // G75 has NO valid OSP form (real JM corpus uses G75 0x).
      expect(r.gcode_text).not.toMatch(/\bG75\b/);
      expect(r.gcode_text).toContain("G1 X25.0 F0.050 (PLUNGE TO GROOVE BOTTOM)");
      expect(r.gcode_text).toContain("G4 F0.5 (DWELL -- CLEAN GROOVE BOTTOM)"); // Okuma G4 F<sec>, not Fanuc G04 P<ms>
    });

    it("generates part-off code", () => {
      const r = ppOkumaTurningPostEngine.generate({
        machine_id: "jmdie-okuma-lb3000",
        operations: [{
          type: "part", tool_number: 5, tool_position: 5,
          speed_rpm: 600, feed_mm_rev: 0.05, coolant: "flood",
          start_x_mm: 40, end_x_mm: -1, end_z_mm: -50,
        }],
      });
      expect(r.gcode_text).toContain("PART OFF");
    });
  });

  describe("generate — drilling", () => {
    it("generates peck drill G83", () => {
      const r = ppOkumaTurningPostEngine.generate({
        machine_id: "jmdie-okuma-lb3000",
        operations: [{
          type: "drill", tool_number: 6, tool_position: 6,
          speed_rpm: 1500, feed_mm_rev: 0.15, coolant: "tsc",
          end_z_mm: -30,
        }],
      });
      expect(r.gcode_text).toContain("G83");
      expect(r.gcode_text).toContain("M51"); // TSC coolant
    });
  });

  describe("generate — boring", () => {
    it("generates ID bore pass", () => {
      const r = ppOkumaTurningPostEngine.generate({
        machine_id: "jmdie-okuma-lb3000",
        operations: [{
          type: "id_bore", tool_number: 7, tool_position: 7,
          speed_sfm: 150, css: true, feed_mm_rev: 0.12, coolant: "flood",
          start_x_mm: 20, end_x_mm: 25, end_z_mm: -30,
        }],
      });
      expect(r.gcode_text).toContain("BORE");
    });
  });

  describe("warnings", () => {
    it("warns on aggressive DOC", () => {
      const r = ppOkumaTurningPostEngine.generate({
        machine_id: "jmdie-okuma-lb3000",
        operations: [{
          type: "od_rough", tool_number: 1, tool_position: 1,
          speed_sfm: 200, css: true, feed_mm_rev: 0.3,
          depth_of_cut_mm: 8, coolant: "flood",
          start_x_mm: 60, end_x_mm: 30, end_z_mm: -40,
        }],
      });
      expect(r.warnings.some(w => w.includes("aggressive"))).toBe(true);
    });
  });

  describe("program structure", () => {
    it("includes program number", () => {
      const r = ppOkumaTurningPostEngine.generate({
        machine_id: "jmdie-okuma-lb3000",
        program_number: "5555",
        operations: [{ type: "face", tool_number: 1, tool_position: 1, speed_rpm: 1000, coolant: "flood", start_x_mm: 50, feed_mm_rev: 0.2 }],
      });
      expect(r.gcode_text).toContain("O5555");
    });

    it("includes part description", () => {
      const r = ppOkumaTurningPostEngine.generate({
        machine_id: "jmdie-okuma-lb3000",
        part_description: "HEADING DIE #A123",
        operations: [{ type: "face", tool_number: 1, tool_position: 1, speed_rpm: 1000, coolant: "flood", start_x_mm: 50, feed_mm_rev: 0.2 }],
      });
      expect(r.gcode_text).toContain("HEADING DIE #A123");
    });

    it("includes material", () => {
      const r = ppOkumaTurningPostEngine.generate({
        machine_id: "jmdie-okuma-lb3000",
        material: "M2 tool steel",
        operations: [{ type: "face", tool_number: 1, tool_position: 1, speed_rpm: 1000, coolant: "flood", start_x_mm: 50, feed_mm_rev: 0.2 }],
      });
      expect(r.gcode_text).toContain("M2 tool steel");
    });
  });

  // ==========================================================================
  // OKUMA OSP DIALECT COMPLIANCE (U-PP-OKUMA-DIALECT-FIX) -- PPOkumaTurningPostEngine
  // emitted Fanuc-dialect canned cycles (G76 threading, G75 grooving) + 4-digit tool
  // calls under an Okuma header. On Okuma OSP those alarm/mis-cycle the control. Fixed by
  // cloning the dialect-complete OkumaB250LatheMasterPostEngine (verified vs Mark's running
  // .MIN + the JM Multus .cps). G83 peck-drill + M30 are VERIFIED-VALID on OSP -> unchanged.
  // ==========================================================================
  describe("Okuma OSP dialect compliance (U-PP-OKUMA-DIALECT-FIX)", () => {
    const fullPart = () => ppOkumaTurningPostEngine.generate({
      machine_id: "jmdie-okuma-lb3000",
      part_description: "OSP DIALECT FULL PART",
      operations: [
        { type: "face", tool_number: 1, tool_position: 1, speed_rpm: 1200, coolant: "flood", start_x_mm: 50, feed_mm_rev: 0.2 },
        { type: "od_rough", tool_number: 1, tool_position: 1, speed_sfm: 200, css: true, feed_mm_rev: 0.3, depth_of_cut_mm: 2, coolant: "flood", start_x_mm: 50, end_x_mm: 30, end_z_mm: -40 },
        { type: "thread", tool_number: 3, tool_position: 3, speed_rpm: 1000, coolant: "flood", thread_pitch_mm: 1.5, thread_depth_mm: 0.92, start_x_mm: 30, end_z_mm: -20 },
        { type: "groove", tool_number: 4, tool_position: 4, speed_rpm: 800, feed_mm_rev: 0.05, coolant: "flood", start_x_mm: 30, end_x_mm: 20, end_z_mm: -25 },
        { type: "drill", tool_number: 6, tool_position: 6, speed_rpm: 1500, feed_mm_rev: 0.15, coolant: "tsc", end_z_mm: -30 },
        { type: "part", tool_number: 5, tool_position: 5, speed_rpm: 600, feed_mm_rev: 0.05, coolant: "flood", start_x_mm: 30, end_x_mm: -1, end_z_mm: -50 },
      ],
    });

    it("the whole program contains NO Fanuc canned cycle (G76 threading / G75 grooving)", () => {
      const g = fullPart().gcode_text;
      expect(g).not.toMatch(/\bG76\b/); // Fanuc threading -> OSP G71
      expect(g).not.toMatch(/\bG75\b/); // Fanuc peck-groove -> OSP explicit plunge+dwell
    });

    it("emits OSP G71 threading + explicit groove + 6-digit tools in one program", () => {
      const g = fullPart().gcode_text;
      expect(g).toMatch(/G71 X[\d.]+ Z[-\d.]+ B60 .*M33 M73/); // OSP threading
      expect(g).toContain("(PLUNGE TO GROOVE BOTTOM)");        // explicit groove
      expect(g).toContain("T010101");                          // 6-digit tool 1
      expect(g).toContain("T030303");                          // 6-digit tool 3
    });

    it("part-off keeps explicit cut + adds an OSP G4 dwell at center (NOT Fanuc G04 P<ms>)", () => {
      const g = fullPart().gcode_text;
      expect(g).toContain("(PART OFF)");
      expect(g).toContain("G4 F0.5 (DWELL AT CENTER)");
      expect(g).not.toMatch(/G04 P/); // Fanuc millisecond dwell form must not appear
    });

    it("peck drilling stays G83 (VERIFIED valid on Okuma OSP -- not a defect)", () => {
      const g = fullPart().gcode_text;
      expect(g).toContain("G83"); // OSP accepts G83 axial peck; do NOT fabricate a G183 swap
    });

    it("program end stays M30 (VERIFIED valid on OSP -- 1,167 real JM .MIN use it)", () => {
      const g = fullPart().gcode_text;
      expect(g).toContain("M30");
    });
  });

  // ==========================================================================
  // NON-FINITE EMIT GUARD (U-PP-NONFINITE-EMIT-SWEEP) -- a NaN/Infinity coord,
  // feed, speed, or thread param must never leak a literal XNaN/SInfinity/FNaN the
  // OSP control rejects. Turning arm of the bug-class sweep; sibling of the
  // OkumaB250/OkumaOSP/HurcoV11/Mitsubishi fixes.
  // ==========================================================================
  describe("non-finite emit guard (U-PP-NONFINITE-EMIT-SWEEP)", () => {
    const odRough = (o: Record<string, unknown> = {}) => ({
      type: "od_rough" as const, tool_number: 1, tool_position: 1,
      speed_sfm: 200, css: true, feed_mm_rev: 0.25, depth_of_cut_mm: 2,
      coolant: "flood" as const, start_x_mm: 50, end_x_mm: 30, start_z_mm: 1, end_z_mm: -40,
      ...o,
    });
    const gen = (ops: ReturnType<typeof odRough>[]) =>
      ppOkumaTurningPostEngine.generate({ machine_id: "jmdie-okuma-lb3000", operations: ops });

    it("[regression] a finite op emits real motion with NO non-finite warning", () => {
      const r = gen([odRough()]);
      expect(/G1 Z-40\.0 F0\.250/.test(r.gcode_text)).toBe(true);
      expect(r.warnings.some(w => w.includes("non-finite"))).toBe(false);
      expect(r.gcode_text).not.toContain("DO NOT RUN");
    });

    // The danger is a non-finite EXECUTABLE token (`XNaN`/`ZInfinity`/`FNaN`/`SInfinity`);
    // the diagnostic ERROR comment intentionally echoes the field=value (`start_x_mm=NaN`)
    // as the fail-loud signal (R12), so assert on the axis/feed/speed-word token, not bare text.
    const noBadToken = (g: string) => {
      expect(g).not.toMatch(/[XYZFS]NaN/);
      expect(g).not.toMatch(/[XYZFS]Infinity/);
    };

    it("NaN start_x_mm halts the op with an ERROR marker -- no literal XNaN", () => {
      const r = gen([odRough({ start_x_mm: NaN })]);
      noBadToken(r.gcode_text);
      expect(r.warnings.some(w => w.includes("non-finite emit field"))).toBe(true);
      expect(r.gcode_text).toContain("DO NOT RUN");
    });

    it("Infinity end_z_mm halts the op -- no literal ZInfinity", () => {
      const r = gen([odRough({ end_z_mm: Infinity })]);
      noBadToken(r.gcode_text);
      expect(r.warnings.some(w => w.includes("non-finite emit field"))).toBe(true);
    });

    it("NaN feed_mm_rev halts the op -- no literal FNaN", () => {
      const r = gen([odRough({ feed_mm_rev: NaN })]);
      noBadToken(r.gcode_text);
      expect(r.warnings.some(w => w.includes("non-finite emit field"))).toBe(true);
    });

    it("Infinity speed_sfm halts the op -- no literal SInfinity", () => {
      const r = gen([odRough({ speed_sfm: Infinity })]);
      noBadToken(r.gcode_text);
      expect(r.warnings.some(w => w.includes("non-finite emit field"))).toBe(true);
    });

    it("a non-finite op is dropped but valid neighbors still emit", () => {
      const r = gen([odRough({ start_x_mm: NaN }), odRough({ end_x_mm: 25 })]);
      noBadToken(r.gcode_text);
      expect(r.gcode_text).toContain("DO NOT RUN");          // bad op flagged
      expect(/G1 Z-40\.0 F0\.250/.test(r.gcode_text)).toBe(true); // good op emits
    });
  });
});
